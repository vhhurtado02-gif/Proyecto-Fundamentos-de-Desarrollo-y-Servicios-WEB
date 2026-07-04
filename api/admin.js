"use strict";
const { poolConexion } = require("./conexionBD");

async function inicializarTablaConfig() {
  await poolConexion.query(`CREATE TABLE IF NOT EXISTS app_config (clave VARCHAR(50) PRIMARY KEY, valor VARCHAR(50) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
  await poolConexion.query(`INSERT IGNORE INTO app_config (clave, valor) VALUES ('permitir_crear','true'),('permitir_borrar','true'),('permitir_editar','true');`);
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    try {
      const [filas] = await poolConexion.query("SELECT clave, valor FROM app_config");
      const config = {};
      filas.forEach(f => config[f.clave] = f.valor === "true");
      return res.status(200).json({ ok: true, config });
    } catch (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        await inicializarTablaConfig();
        return res.status(200).json({ ok: true, config: { permitir_crear: true, permitir_borrar: true, permitir_editar: true } });
      }
      return res.status(500).json({ ok: false, mensaje: "Error al obtener configuración." });
    }
  }

  if (req.method === "POST") {
    const { clave_admin, permitir_crear, permitir_borrar, permitir_editar } = req.body;
    const CLAVE_ADMIN = process.env.ADMIN_PASSWORD;
    if (!CLAVE_ADMIN) {
      console.error("[admin] ADMIN_PASSWORD no está configurada en las variables de entorno.");
      return res.status(500).json({ ok: false, mensaje: "El panel de administración no está configurado correctamente." });
    }
    if (clave_admin !== CLAVE_ADMIN) return res.status(401).json({ ok: false, mensaje: "Clave incorrecta." });
    try {
      await poolConexion.query("UPDATE app_config SET valor=? WHERE clave='permitir_crear'", [permitir_crear?"true":"false"]);
      await poolConexion.query("UPDATE app_config SET valor=? WHERE clave='permitir_borrar'", [permitir_borrar?"true":"false"]);
      await poolConexion.query("UPDATE app_config SET valor=? WHERE clave='permitir_editar'", [permitir_editar?"true":"false"]);
      return res.status(200).json({ ok: true, mensaje: "Configuración actualizada." });
    } catch (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        await inicializarTablaConfig();
        return res.status(200).json({ ok: true, mensaje: "Configuración inicializada. Vuelve a intentarlo." });
      }
      return res.status(500).json({ ok: false, mensaje: "Error al actualizar configuración." });
    }
  }
  return res.status(405).json({ ok: false, mensaje: "Método no permitido." });
};