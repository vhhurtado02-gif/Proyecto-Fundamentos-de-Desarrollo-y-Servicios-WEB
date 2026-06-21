"use strict";
const { poolConexion } = require("./conexionBD");
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
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
      mensaje: err.message,
      codigo: err.code,
      host: process.env.MYSQLHOST || "NO DEFINIDO",
      port: process.env.MYSQLPORT || "NO DEFINIDO",
      user: process.env.MYSQLUSER || "NO DEFINIDO",
      database: process.env.MYSQLDATABASE || "NO DEFINIDO",
    });
  }
};
