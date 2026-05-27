import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // DB Connection Pool
  let pool: any = null;
  // Use a fallback if DATABASE_URL is missing to prevent crash, but log it
  const dbUrl = process.env.DATABASE_URL || "mysql://root:password@127.0.0.1:3306/nombre_de_tu_db";
  try {
    pool = mysql.createPool(dbUrl);
    console.log("Database pool initialized successfully");
  } catch (e) {
    console.error("Failed to initialize database pool:", e);
  }

  app.use(express.json());

  // Helper to check DB
  const getPool = () => {
    if (!pool) throw new Error("Database not configured");
    return pool;
  };

  // API Route Example
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // DB Connection Test
  app.get("/api/db-test", async (req, res) => {
    if (!pool) return res.status(503).json({ status: "error", message: "Database not configured" });
    try {
      await pool.query("SELECT 1");
      res.json({ status: "connected" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Connection failed", error: (error as Error).message });
    }
  });

  // Example: API to get leads
  app.get("/api/leads", async (req, res) => {
    if (!pool) {
      return res.status(503).json({ error: "Database not available" });
    }
    try {
      const [rows] = await pool.query(`
        SELECT leads.*, sellers.name as seller_name 
        FROM leads 
        LEFT JOIN sellers ON leads.seller_id = sellers.id 
        ORDER BY fechaIngreso DESC
      `);
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Create lead
  app.post("/api/leads", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database not available" });
    const lead = req.body;
    try {
      const [result] = await pool.query(
        "INSERT INTO leads (id, name, nombre_contacto, rif, telefono, ubicacion_estado, ubicacion_detail, categoria_interes, especialidad_tienda, canal_origen, campana, seller_id, status, whatsapp_link, observaciones_vendedor, monto_cerrado_usd, num_factura, fecha_venta, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [lead.id, lead.name, lead.nombre_contacto, lead.rif, lead.telefono, lead.ubicacion_estado, lead.ubicacion_detail, lead.categoria_interes, lead.especialidad_tienda, lead.canal_origen, lead.campana, lead.seller_id, lead.status, lead.whatsapp_link, lead.observaciones_vendedor, lead.monto_cerrado_usd, lead.num_factura, lead.fecha_venta]
      );
      res.status(201).json({ id: lead.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  // Update lead
  app.put("/api/leads/:id", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database not available" });
    const { id } = req.params;
    const lead = req.body;
    try {
      // 1. Get old status to track history
      const [oldLeadRows]: any = await pool.query("SELECT status FROM leads WHERE id=?", [id]);
      const oldStatus = oldLeadRows.length > 0 ? oldLeadRows[0].status : null;

      // 2. Perform update
      await pool.query(
        "UPDATE leads SET name=?, nombre_contacto=?, rif=?, telefono=?, ubicacion_estado=?, ubicacion_detail=?, categoria_interes=?, especialidad_tienda=?, canal_origen=?, campana=?, seller_id=?, status=?, whatsapp_link=?, observaciones_vendedor=?, monto_cerrado_usd=?, num_factura=?, fecha_venta=?, updated_at=NOW() WHERE id=?",
        [lead.name, lead.nombre_contacto, lead.rif, lead.telefono, lead.ubicacion_estado, lead.ubicacion_detail, lead.categoria_interes, lead.especialidad_tienda, lead.canal_origen, lead.campana, lead.seller_id, lead.status, lead.whatsapp_link, lead.observaciones_vendedor, lead.monto_cerrado_usd, lead.num_factura, lead.fecha_venta, id]
      );

      // 3. Log history if status changed
      if (oldStatus !== lead.status) {
        await pool.query(
          "INSERT INTO historial_fases (id_lead, fase_anterior, fase_nueva, fecha_cambio, usuario_cambio) VALUES (?, ?, ?, NOW(), ?)",
          [id, oldStatus, lead.status, lead.updated_by || 'system']
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  // KPI Endpoint
  app.get("/api/kpis", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database not available" });
    try {
      const [stats]: any = await pool.query(`
        SELECT 
          status, 
          COUNT(*) as count, 
          SUM(monto_cerrado_usd) as total_amount
        FROM leads 
        GROUP BY status
      `);
      res.json(stats);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch KPIs" });
    }
  });

  // Sellers Endpoint
  app.get("/api/sellers", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database not available" });
    try {
      const [rows] = await pool.query("SELECT * FROM sellers");
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch sellers" });
    }
  });

  // Delete lead
  app.delete("/api/leads/:id", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database not available" });
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM leads WHERE id=?", [id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV === "development") {
    console.log("Running in DEVELOPMENT mode with Vite Middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in PRODUCTION mode serving static files");
    
    // Al compilar, Vite guarda el frontend en 'dist/assets' e 'dist/index.html'
    const distPath = path.join(process.cwd(), 'dist');
    
    // 1. Servir archivos estáticos (js, css, imágenes) con máxima prioridad
    app.use(express.static(distPath, { index: false }));
    
    // 2. Ruta comodín para cualquier otra petición que no sea API: devolver el index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
          console.error("Error sending index.html:", err);
          res.status(500).send("Frontend build missing or corrupted.");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
