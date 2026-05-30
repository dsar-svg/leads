import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { INITIAL_LEADS, MOCK_SELLERS } from "./src/mockData";

dotenv.config();

const app = express();
let pool: any = null;
let useMockData = false;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  // In development mode, use mock data instead of failing
  if (process.env.NODE_ENV === "development") {
    console.log("WARNING: DATABASE_URL not defined, using mock data for development");
    useMockData = true;
  } else {
    // In production, require DATABASE_URL
    throw new Error("DATABASE_URL no está definida en las variables de entorno");
  }
} else {
  try {
    pool = mysql.createPool(dbUrl);
    console.log("Database pool initialized successfully");
  } catch (e) {
    console.error("Failed to initialize database pool:", e);
  }
}

app.use(express.json());

app.get("/api/health", (req, res) => {
  return res.json({ status: "ok" });
});

app.get("/api/db-test", async (req, res) => {
  if (useMockData) {
    return res.json({ status: "mock" });
  }
  if (!pool) return res.status(503).json({ status: "error", message: "Database not configured" });
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "connected" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Connection failed" });
  }
});

// 1. OBTENER LEADS
app.get("/api/leads", async (req, res) => {
  try {
    if (useMockData) {
      // Convert mock leads to the format expected by the frontend
      const mappedLeads = INITIAL_LEADS.map((lead) => ({
        id: lead.id,
        seller_id: null, // Mock data doesn't have seller_id mapped
        empresa: lead.empresa,
        nombre: lead.nombre,
        rif: lead.rif,
        telefono: lead.telefono,
        ubicacionEstado: lead.ubicacionEstado,
        ubicacionDetalle: lead.ubicacionDetalle || '',
        categoriaInteres: lead.categoriaInteres,
        canalOrigen: lead.canalOrigen,
        vendedor: lead.vendedor || 'Sin Asignar',
        seller_name: lead.vendedor || 'Sin Asignar',
        estatus: lead.estatus,
        notas: lead.notas,
        valorEstimado: lead.valorEstimado,
        fechaVenta: lead.fechaVenta,
        fechaIngreso: lead.fechaIngreso,
        tiempoPrimerContacto: null, // Not in mock data
        motivoCierre: lead.estatus.startsWith('CERRADO') ? 'Completado' : null,
        reactivaciones: 0 // Not in mock data
      }));
      return res.json(mappedLeads);
    }

    const [rows]: any = await pool.query(`
      SELECT leads.*, sellers.name as seller_name
      FROM leads
      LEFT JOIN sellers ON leads.seller_id = sellers.id
    `);

    const mappedLeads = rows.map((lead: any) => ({
      id: (lead.id || 0).toString(),
      seller_id: lead.seller_id,
      empresa: lead.name,
      nombre: lead.nombre_contacto,
      rif: lead.rif,
      telefono: lead.telefono,
      ubicacionEstado: lead.ubicacion_estado,
      ubicacionDetalle: lead.ubicacion_detail || '',
      categoriaInteres: lead.categoria_interes,
      canalOrigen: lead.canal_origen,
      vendedor: lead.seller_name || 'Sin Asignar',
      seller_name: lead.seller_name || 'Sin Asignar',
      estatus: lead.status,
      notas: lead.observaciones_vendedor,
      valorEstimado: Number(lead.monto_cerrado_usd || 0),
      fechaVenta: lead.fecha_venta,
      fechaIngreso: lead.created_at ? new Date(lead.created_at).toISOString().split('T')[0] : (lead.fecha_ingreso || null),
      tiempoPrimerContacto: lead.tiempo_primer_contacto_minutos != null ? Number(lead.tiempo_primer_contacto_minutos) : null,
      motivoCierre: lead.motivo_cierre,
      reactivaciones: Number(lead.reactivaciones || 0)
    }));

    return res.json(mappedLeads);
  } catch (error) {
    console.error("Error en SELECT de leads:", error);
    return res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// 2. CREAR LEAD
app.post("/api/leads", async (req, res) => {
  try {
    if (useMockData) {
      // For mock data, we just return a fake ID
      // In a real app, this would add to the mock data array
      const newId = `mock-${Date.now()}`;
      return res.status(201).json({ id: newId });
    }

    const lead = req.body;
    const [result]: any = await pool.query(
      `INSERT INTO leads (name, nombre_contacto, rif, telefono, ubicacion_estado, categoria_interes, status, seller_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [lead.empresa, lead.nombre, lead.rif, lead.telefono, lead.ubicacionEstado, lead.categoriaInteres, lead.estatus || 'NUEVO', lead.seller_id || null]
    );
    return res.status(201).json({ id: result.insertId.toString() });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create lead" });
  }
});

// 3. ACTUALIZAR LEAD
app.put("/api/leads/:id", async (req, res) => {
  try {
    if (useMockData) {
      // For mock data, just return success
      // In a real app, this would update the mock data
      return res.json({ success: true });
    }

    const { id } = req.params;
    const lead = req.body;

    // Fetch current status before update
    const [prevRows]: any = await pool.query("SELECT status FROM leads WHERE id = ?", [id]);
    const prevStatus = prevRows.length > 0 ? prevRows[0].status : null;
    const closedStatuses = ['CERRADO', 'CERRADO_VENTA', 'CERRADO_ABANDONADO'];
    const esCierre = closedStatuses.includes(lead.estatus);
    const esReactivacion = closedStatuses.includes(prevStatus) && !esCierre;

    if (!esCierre) {
      lead.motivoCierre = null;
      lead.fechaVenta = null;
    }
    if (lead.fechaVenta && lead.fechaVenta.includes('T')) {
      lead.fechaVenta = lead.fechaVenta.split('T')[0];
    }

    let sellerId: number | null = null;
    if (lead.seller_id != null) {
      sellerId = Number(lead.seller_id);
    } else if (lead.vendedor && lead.vendedor !== 'Sin Asignar') {
      const [sellerRows]: any = await pool.query("SELECT id FROM sellers WHERE name = ? LIMIT 1", [lead.vendedor]);
      sellerId = sellerRows.length > 0 ? sellerRows[0].id : null;
    }

    await pool.query(
      `UPDATE leads SET
        name = COALESCE(?, name),
        nombre_contacto = COALESCE(?, nombre_contacto),
        rif = COALESCE(?, rif),
        telefono = COALESCE(?, telefono),
        ubicacion_estado = COALESCE(?, ubicacion_estado),
        categoria_interes = COALESCE(?, categoria_interes),
        canal_origen = COALESCE(?, canal_origen),
        status = COALESCE(?, status),
        observaciones_vendedor = COALESCE(?, observaciones_vendedor),
        monto_cerrado_usd = COALESCE(?, monto_cerrado_usd),
        fecha_venta = ?,
        motivo_cierre = ?,
        seller_id = ?
      WHERE id = ?`,
      [
        lead.empresa ?? null, lead.nombre ?? null, lead.rif ?? null,
        lead.telefono ?? null, lead.ubicacionEstado ?? null,
        lead.categoriaInteres ?? null, lead.canalOrigen ?? null, lead.estatus ?? null,
        lead.notas ?? null,
        lead.valorEstimado != null ? lead.valorEstimado : null,
        lead.fechaVenta ?? null, lead.motivoCierre ?? null,
        sellerId, id
      ]
    );

    if (esReactivacion) {
      await pool.query("UPDATE leads SET reactivaciones = reactivaciones + 1 WHERE id = ?", [id]);
    }

    if (esCierre && sellerId) {
      const [allLeads]: any = await pool.query("SELECT status FROM leads WHERE seller_id = ?", [sellerId]);
      const total = allLeads.length;
      const cerrados = allLeads.filter((r: any) => closedStatuses.includes(r.status)).length;
      const efectividad = total > 0 ? Math.round((cerrados / total) * 100) : 0;
      await pool.query(
        "UPDATE rotacion_caracas_y_carabobo SET efectividad_cierre = ? WHERE seller_id = ?",
        [efectividad, sellerId]
      );
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error actualizando lead:", error);
    return res.status(500).json({ error: "Failed to update lead", detail: error.message });
  }
});

// 4. ELIMINAR LEAD
app.delete("/api/leads/:id", async (req, res) => {
  try {
    if (useMockData) {
      // For mock data, just return success
      return res.json({ success: true });
    }

    const { id } = req.params;
    await pool.query("DELETE FROM leads WHERE id = ?", [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error("Error eliminando lead:", error);
    return res.status(500).json({ error: "Failed to delete lead" });
  }
});

// 5. OBTENER VENDEDORES
app.get("/api/sellers", async (req, res) => {
  try {
    if (useMockData) {
      return res.json(MOCK_SELLERS);
    }

    const [rows] = await pool.query("SELECT * FROM sellers");
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: "Error interno" });
  }
});

if (process.env.NODE_ENV === "development") {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath, { index: false }));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Only listen if this file is run directly (not when imported by Vercel)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the app for Vercel
export default app;