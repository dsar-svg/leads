import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  let pool: any = null;
  const dbUrl = process.env.DATABASE_URL || "mysql://supricomdev:Supricom2015%40@dashboard_database:3306/supricom_panel";
  try {
    pool = mysql.createPool(dbUrl);
    console.log("Database pool initialized successfully");
  } catch (e) {
    console.error("Failed to initialize database pool:", e);
  }

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    return res.json({ status: "ok" });
  });

  app.get("/api/db-test", async (req, res) => {
    if (!pool) return res.status(503).json({ status: "error", message: "Database not configured" });
    try {
      await pool.query("SELECT 1");
      return res.json({ status: "connected" });
    } catch (error) {
      return res.status(500).json({ status: "error", message: "Connection failed" });
    }
  });

  // 1. OBTENER LEADS - CORREGIDO
  app.get("/api/leads", async (req, res) => {
    try {
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
    const distPath = "/app/dist";
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Faltan credenciales' });
    try {
      const [rows]: any = await pool.query(
        'SELECT id, name, role FROM sellers WHERE name LIKE ? AND password = ? AND activo = 1',
        [`${username}%`, password]
      );
      if (rows.length === 0) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      const user = rows[0];
      const userRole = user.role === 8 ? 'ADMIN' : 'VENDEDOR';
      res.json({ id: user.id, name: user.name, role: userRole });
    } catch (err) {
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();
