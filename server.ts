import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // DB Connection Pool - Conectado a tu base de datos de producción
  let pool: any = null;
  const dbUrl = process.env.DATABASE_URL || "mysql://supricomdev:Supricom2015%40@dashboard_database:3306/supricom_panel";
  try {
    pool = mysql.createPool(dbUrl);
    console.log("Database pool initialized successfully");
  } catch (e) {
    console.error("Failed to initialize database pool:", e);
  }

  app.use(express.json());

  // API para verificar la salud del backend
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

  // 1. OBTENER LEADS (Se eliminó 'fechaIngreso' y se adaptó a la estructura exacta en snake_case)
  app.get("/api/leads", async (req, res) => {
    if (!pool) {
      return res.status(503).json({ error: "Database not available" });
    }
    try {
        const [rows]: any = await pool.query(`
                SELECT 
          leads.*, 
          sellers.name as seller_name,
          sellers.id as seller_id_check
        FROM leads 
        LEFT JOIN sellers ON leads.seller_id = sellers.id
      `);
      console.log("Primer lead obtenido:", rows[0]); // <--- MIRA ESTO EN LA CONSOLA DEL SERVIDOR
      res.json(rows);
      // Mapeo simétrico para traducir lo que tiene MySQL al formato que espera React
      const mappedLeads = rows.map((lead: any) => ({
        id: lead.id.toString(), // Convertimos el entero de MySQL a string para el drag and drop del Front
        fechaIngreso: lead.fecha_income || lead.created_at, // Usa el campo por defecto de creación
        nombre: lead.nombre_contacto || lead.name,
        empresa: lead.name,
        rif: lead.rif,
        telefono: lead.telefono,
        ubicacionEstado: lead.ubicacion_estado,
        ubicacionDetalle: lead.ubicacion_detail,
        categoriaInteres: lead.categoria_interes,
        canalOrigen: lead.canal_origen,
        campana: lead.campana,
        vendedor: lead.seller_name || 'Sin Asignar',
        seller_id: lead.seller_id,
        estatus: lead.status === 'CERRADO' ? 'CERRADO_VENTA' : lead.status, // Normalizamos el estatus aquí mismo
        notas: lead.observaciones_vendedor,
        valorEstimado: Number(lead.monto_cerrado_usd || 0),
        numFactura: lead.num_factura,
        fechaVenta: lead.fecha_venta,
        motivoCierre: lead.motivo_cierre, // <--- Coma agregada
        tiempoPrimerContacto: lead.tiempo_primer_contacto_minutos,
      }));

      res.json(mappedLeads);
    } catch (error) {
      console.error("Error en SELECT de leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // 2. CREAR LEAD (Se eliminó el parámetro 'id' manual para delegar todo al AUTO_INCREMENT de tu base de datos)
  app.post("/api/leads", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database not available" });
    const lead = req.body;
    try {
      const [result]: any = await pool.query(
        `INSERT INTO leads (
          name, nombre_contacto, rif, telefono, ubicacion_estado, ubicacion_detail, 
          categoria_interes, canal_origen, campana, seller_id, 
          status, observaciones_vendedor, monto_cerrado_usd, num_factura, 
          fecha_venta, motivo_cierre, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          lead.empresa || lead.name, 
          lead.nombre, 
          lead.rif, 
          lead.telefono, 
          lead.ubicacionEstado, 
          lead.ubicacionDetalle, 
          lead.categoriaInteres, 
          lead.canalOrigen, 
          lead.campana, 
          lead.seller_id || null, 
          lead.estatus || 'NUEVO', 
          lead.notas, 
          Number(lead.valorEstimado || 0), 
          lead.numFactura, 
          lead.fechaVenta || null,
          lead.motivoCierre || null
        ]
      );
      // Retornamos el ID real autogenerado por MySQL convertido a texto
      res.status(201).json({ id: result.insertId.toString() });
    } catch (error) {
      console.error("Error creando lead:", error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  // 3. ACTUALIZAR LEAD (Cálculo exacto de Tiempo de Primer Contacto en Minutos)
  app.put("/api/leads/:id", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database not available" });
    const { id } = req.params;
    const lead = req.body;
    try {
      // 1. Obtener los datos actuales del lead antes de la mutación
      const [oldLeadRows]: any = await pool.query("SELECT status, tiempo_primer_contacto_minutos FROM leads WHERE id=?", [id]);
      if (oldLeadRows.length === 0) return res.status(404).json({ error: "Lead not found" });
      
      const oldStatus = oldLeadRows[0].status;
      let tiempoPrimerContactoMinutos = oldLeadRows[0].tiempo_primer_contacto_minutos;

      // 2. Si pasa de NUEVO a CONTACTADO por primera vez, calculamos la diferencia exacta en MINUTOS
      if (oldStatus === 'NUEVO' && lead.estatus === 'CONTACTADO' && tiempoPrimerContactoMinutos === null) {
        const [timeResult]: any = await pool.query(
          "SELECT TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutos FROM leads WHERE id=?", [id]
        );
        // Guardamos los minutos exactos reales (si da 0 por ser inmediato, forzamos 1 minuto)
        tiempoPrimerContactoMinutos = timeResult[0].minutos <= 0 ? 1 : timeResult[0].minutos;
      }

      // 3. Ejecutar la actualización en las columnas físicas de tu base de datos
      await pool.query(
        `UPDATE leads SET 
          name=?, nombre_contacto=?, rif=?, telefono=?, ubicacion_estado=?, ubicacion_detalle=?, 
          categoria_interes=?, canal_origen=?, campana=?, seller_id=?, 
          status=?, observaciones_vendedor=?, monto_cerrado_usd=?, 
          num_factura=?, fecha_venta=?, motivo_cierre=?, tiempo_primer_contacto_minutos=?, updated_at=NOW() 
        WHERE id=?`,
        [
          lead.empresa || lead.nombre || '', lead.nombre || '', lead.rif || '', lead.telefono || '', lead.ubicacionEstado || '', 
          lead.ubicacionDetalle || lead.ubicacion_detalle || '', lead.categoriaInteres || '', lead.canalOrigen || '', lead.campana || '', 
          lead.seller_id || null, lead.estatus || 'NUEVO', lead.notas || '', Number(lead.valorEstimado || 0), 
          lead.numFactura || '', lead.fechaVenta || null, lead.motivoCierre || null, tiempoPrimerContactoMinutos, id
        ]
      );

      // Registrar historial en historial_fases
      if (oldStatus !== lead.estatus && lead.estatus) {
        await pool.query(
          "INSERT INTO historial_fases (id_lead, fase_anterior, fase_nueva, fecha_cambio, usuario_cambio) VALUES (?, ?, ?, NOW(), ?)",
          [id, oldStatus, lead.estatus, lead.updated_by || 'Sistema Automatizado']
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error crítico en UPDATE de leads:", error);
      res.status(500).json({ error: "Failed to update lead in database" });
    }
  });
  
  // 4. METRICAS Y KPIS GENERALES (Consolidando directo desde la tabla leads)
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

  // 5. OBTENER VENDEDORES ACTIVOS (Filtra de acuerdo a tu columna 'activo' de phpMyAdmin)
  app.get("/api/sellers", async (req, res) => {
    if (!pool) return res.status(503).json({ error: "Database not available" });
    try {
      const [rows] = await pool.query("SELECT * FROM sellers WHERE activo = 1");
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch sellers" });
    }
  });

  // 6. ELIMINAR LEAD DEL REGISTRO
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

  // Servidor de recursos estáticos procesados en producción por Vite (Nixpacks)
  if (process.env.NODE_ENV === "development") {
    console.log("Running in DEVELOPMENT mode with Vite Middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in PRODUCTION mode serving static files");
    const distPath = "/app/dist";
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
          console.error("Error definitivo enviando index.html de producción:", err);
          res.status(500).send("Frontend build missing or corrupted inside /app/dist");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
