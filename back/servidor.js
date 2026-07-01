"use strict";

require("dotenv").config();
const express = require("express");
const path = require("path");
const { verificarConexionBD } = require("./conexionBD");
const { poolConexion } = require("./conexionBD");
const rutasHorarios = require("./rutasHorarios");

const app = express();

// ── Configuración ──────────────────────────────
const SERVIDOR_HOST = process.env.HOST || "127.0.0.1";
const SERVIDOR_PUERTO = parseInt(process.env.PORT) || 8080;

// ── Middlewares ────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del front (ruta raíz y /front/)
app.use(express.static(path.join(__dirname, "../front")));
app.use("/front", express.static(path.join(__dirname, "../front")));

// ── Rutas API ──────────────────────────────────

// Health check
app.get("/api/health", async (req, res) => {
  try {
    const conexion = await poolConexion.getConnection();
    conexion.release();
    return res.status(200).json({
      ok: true,
      servicio: "activo",
      baseDatos: "conectada",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      servicio: "activo",
      baseDatos: "sin conexión",
      mensaje: "Error interno.",
    });
  }
});

// Rutas de horarios
app.use("/api/horarios", rutasHorarios);

// ── Ruta raíz: servir el front ─────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../front/index.html"));
});

// ── Manejo de rutas no encontradas ────────────
app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: "Ruta no encontrada." });
});

// ── Iniciar servidor ───────────────────────────
async function iniciarServidor() {
  const bdOk = await verificarConexionBD();
  if (!bdOk) {
    console.warn("[AVISO] El servidor inicia pero la base de datos no respondió. Verifique la configuración en .env");
  }

  app.listen(SERVIDOR_PUERTO, SERVIDOR_HOST, () => {
    console.log("=================================================");
    console.log("  horariosDocenteApp - Servidor iniciado");
    console.log(`  URL: http://${SERVIDOR_HOST}:${SERVIDOR_PUERTO}`);
    console.log("=================================================");
  });
}

iniciarServidor();