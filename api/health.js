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
      mensaje: "Error interno.",
    });
  }
};
