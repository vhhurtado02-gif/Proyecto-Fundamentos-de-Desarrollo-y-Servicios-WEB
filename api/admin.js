"use strict";
const { poolConexion } = require("./conexionBD");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Crear tabla de configuración si no existe
  await poolConexion.query(`
    CREATE TABLE IF NOT EXISTS app_config (
      clave VARCHAR(50) PRIMARY KEY,
      valor VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Insertar valores por defecto si no existen
  await poolConexion.query(`
    INSERT IGNORE INTO app_config (clave, valor) VALUES
    ('permitir_crear', 'true'),
    ('permitir_borrar', 'true');
  `);

  // GET — obtener configuración actual
  if (req.method === "GET") {
    try {
      const [filas] = await poolConexion.query("SELECT clave, valor FROM app_config");
      const config = {};
      filas.forEach(f => config[f.clave] = f.valor === "true");
      return res.status(200).json({ ok: true, config });
    } catch (err) {
      return res.status(500).json({ ok: false, mensaje: "Error al obtener configuración." });
    }
  }

  // POST — actualizar configuración (requiere clave admin)
  if (req.method === "POST") {
    const { clave_admin, permitir_crear, permitir_borrar } = req.body;
    const CLAVE_ADMIN = process.env.ADMIN_PASSWORD || "ciaf2026";

    if (clave_admin !== CLAVE_ADMIN) {
      return res.status(401).json({ ok: false, mensaje: "Clave incorrecta." });
    }

    try {
      await poolConexion.query(
        "UPDATE app_config SET valor = ? WHERE clave = 'permitir_crear'",
        [permitir_crear ? "true" : "false"]
      );
      await poolConexion.query(
        "UPDATE app_config SET valor = ? WHERE clave = 'permitir_borrar'",
        [permitir_borrar ? "true" : "false"]
      );
      return res.status(200).json({ ok: true, mensaje: "Configuración actualizada." });
    } catch (err) {
      return res.status(500).json({ ok: false, mensaje: "Error al actualizar configuración." });
    }
  }

  return res.status(405).json({ ok: false, mensaje: "Método no permitido." });
};