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
        empresa: lead.name,
        nombre: lead.nombre_contacto,
        rif: lead.rif,
        telefono: lead.telefono,
        ubicacionEstado: lead.ubicacion_estado,
        ubicacionDetalle: lead.ubicacion_detail || '',
        categoriaInteres: lead.categoria_interes,
        canalOrigen: lead.canal_origen,
        vendedor: lead.seller_name || 'Sin Asignar',
        estatus: lead.status,
        notas: lead.observaciones_vendedor,
        valorEstimado: Number(lead.monto_cerrado_usd || 0),
        fechaVenta: lead.fecha_venta,
        motivoCierre: lead.motivo_cierre
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

  // 5. OBTENER VENDEDORES
  app.get("/api/sellers", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM sellers");
      return res.json(rows);
    } catch (error) {
      return res.status(500).json({ error: "Error interno" });
    }
  });

  // ... (El resto de tus rutas como delete y update siguen igual, solo asegúrate de añadir 'return' antes de cada res.json)

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

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();
