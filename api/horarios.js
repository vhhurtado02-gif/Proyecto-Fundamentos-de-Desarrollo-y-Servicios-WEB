"use strict";
const { poolConexion } = require("./conexionBD");
const { sanitizarTexto } = require("./sanitizador");

async function obtenerConfig() {
  try {
    const [filas] = await poolConexion.query("SELECT clave, valor FROM app_config");
    const config = { permitir_crear: true, permitir_borrar: true };
    filas.forEach(f => config[f.clave] = f.valor === "true");
    return config;
  } catch {
    return { permitir_crear: true, permitir_borrar: true };
  }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const config = await obtenerConfig();

  // GET — listar todos
  if (req.method === "GET") {
    try {
      const [filas] = await poolConexion.query(
        "SELECT * FROM horarios_docentes ORDER BY fechaClase ASC, horaIniciaClase ASC"
      );
      return res.status(200).json({ ok: true, datos: filas, config });
    } catch (err) {
      return res.status(500).json({ ok: false, mensaje: "Error al obtener horarios." });
    }
  }

  // POST — crear nuevo
  if (req.method === "POST") {
    if (!config.permitir_crear) {
      return res.status(403).json({ ok: false, mensaje: "Crear horarios está desactivado." });
    }
    const { docente, facultad, carrera, materia, fechaClase, horaIniciaClase, horaTerminaClase } = req.body;
    if (!docente || !facultad || !carrera || !materia || !fechaClase || !horaIniciaClase || !horaTerminaClase) {
      return res.status(400).json({ ok: false, mensaje: "Todos los campos son obligatorios." });
    }
    try {
      const [resultado] = await poolConexion.query(
        "INSERT INTO horarios_docentes (docente, facultad, carrera, materia, fechaClase, horaIniciaClase, horaTerminaClase) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [sanitizarTexto(docente), sanitizarTexto(facultad), sanitizarTexto(carrera), sanitizarTexto(materia), fechaClase, horaIniciaClase, horaTerminaClase]
      );
      return res.status(201).json({ ok: true, mensaje: "Horario creado.", id: resultado.insertId });
    } catch (err) {
      return res.status(500).json({ ok: false, mensaje: "Error al crear horario." });
    }
  }

  // DELETE — eliminar por id
  if (req.method === "DELETE") {
    if (!config.permitir_borrar) {
      return res.status(403).json({ ok: false, mensaje: "Borrar horarios está desactivado." });
    }
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const id = searchParams.get("id");
    if (!id) return res.status(400).json({ ok: false, mensaje: "ID requerido." });
    try {
      const [resultado] = await poolConexion.query(
        "DELETE FROM horarios_docentes WHERE idHorario = ?", [id]
      );
      if (resultado.affectedRows === 0) return res.status(404).json({ ok: false, mensaje: "Horario no encontrado." });
      return res.status(200).json({ ok: true, mensaje: "Horario eliminado." });
    } catch (err) {
      return res.status(500).json({ ok: false, mensaje: "Error al eliminar horario." });
    }
  }

  return res.status(405).json({ ok: false, mensaje: "Método no permitido." });
};