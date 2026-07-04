"use strict";
const { poolConexion } = require("./conexionBD");
const { sanitizarTexto } = require("./sanitizador");

async function obtenerConfig() {
  if (process.env.MODO_SOLO_LECTURA === "true") {
    return { permitir_crear: false, permitir_borrar: false, permitir_editar: false, forzado: true };
  }
  try {
    const [filas] = await poolConexion.query("SELECT clave, valor FROM app_config");
    const config = { permitir_crear: true, permitir_borrar: true, permitir_editar: true };
    filas.forEach(f => config[f.clave] = f.valor === "true");
    return config;
  } catch {
    return { permitir_crear: true, permitir_borrar: true, permitir_editar: true };
  }
}

async function existeCruceHorario(docente, fechaClase, horaIniciaClase, horaTerminaClase, idExcluir) {
  let sql = "SELECT idHorario FROM horarios_docentes WHERE docente=? AND fechaClase=? AND horaIniciaClase<? AND horaTerminaClase>?";
  const parametros = [docente, fechaClase, horaTerminaClase, horaIniciaClase];
  if (idExcluir) {
    sql += " AND idHorario<>?";
    parametros.push(idExcluir);
  }
  const [filas] = await poolConexion.query(sql, parametros);
  return filas.length > 0;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const config = await obtenerConfig();

  if (req.method === "GET") {
    try {
      const [filas] = await poolConexion.query("SELECT * FROM horarios_docentes ORDER BY idHorario ASC");
      return res.status(200).json({ ok: true, datos: filas, config });
    } catch (err) {
      return res.status(500).json({ ok: false, mensaje: "Error al obtener horarios." });
    }
  }

  if (req.method === "POST") {
    if (!config.permitir_crear) return res.status(403).json({ ok: false, mensaje: "Crear horarios está desactivado." });
    const { docente, facultad, carrera, materia, fechaClase, horaIniciaClase, horaTerminaClase } = req.body;
    if (!docente||!facultad||!carrera||!materia||!fechaClase||!horaIniciaClase||!horaTerminaClase)
      return res.status(400).json({ ok: false, mensaje: "Todos los campos son obligatorios." });
    if (horaTerminaClase <= horaIniciaClase)
      return res.status(400).json({ ok: false, mensaje: "La hora de fin debe ser posterior a la hora de inicio." });
    try {
      const hayC=await existeCruceHorario(sanitizarTexto(docente), fechaClase, horaIniciaClase, horaTerminaClase);
      if (hayC) return res.status(409).json({ ok: false, mensaje: "El docente ya tiene un horario asignado que se cruza con este." });
      const [resultado] = await poolConexion.query(
        "INSERT INTO horarios_docentes (docente,facultad,carrera,materia,fechaClase,horaIniciaClase,horaTerminaClase) VALUES (?,?,?,?,?,?,?)",
        [sanitizarTexto(docente),sanitizarTexto(facultad),sanitizarTexto(carrera),sanitizarTexto(materia),fechaClase,horaIniciaClase,horaTerminaClase]
      );
      return res.status(201).json({ ok: true, mensaje: "Horario creado.", id: resultado.insertId });
    } catch (err) {
      return res.status(500).json({ ok: false, mensaje: "Error al crear horario." });
    }
  }

  if (req.method === "PUT") {
    if (!config.permitir_editar) return res.status(403).json({ ok: false, mensaje: "Editar horarios está desactivado." });
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const id = searchParams.get("id");
    if (!id) return res.status(400).json({ ok: false, mensaje: "ID requerido." });
    const { docente, facultad, carrera, materia, fechaClase, horaIniciaClase, horaTerminaClase } = req.body;
    if (!docente||!facultad||!carrera||!materia||!fechaClase||!horaIniciaClase||!horaTerminaClase)
      return res.status(400).json({ ok: false, mensaje: "Todos los campos son obligatorios." });
    try {
      const hayC=await existeCruceHorario(sanitizarTexto(docente), fechaClase, horaIniciaClase, horaTerminaClase, id);
      if (hayC) return res.status(409).json({ ok: false, mensaje: "El docente ya tiene un horario asignado que se cruza con este." });
      const [resultado] = await poolConexion.query(
        "UPDATE horarios_docentes SET docente=?,facultad=?,carrera=?,materia=?,fechaClase=?,horaIniciaClase=?,horaTerminaClase=? WHERE idHorario=?",
        [sanitizarTexto(docente),sanitizarTexto(facultad),sanitizarTexto(carrera),sanitizarTexto(materia),fechaClase,horaIniciaClase,horaTerminaClase,id]
      );
      if (resultado.affectedRows===0) return res.status(404).json({ ok: false, mensaje: "Horario no encontrado." });
      return res.status(200).json({ ok: true, mensaje: "Horario actualizado." });
    } catch (err) {
      return res.status(500).json({ ok: false, mensaje: "Error al actualizar horario." });
    }
  }

  if (req.method === "DELETE") {
    if (!config.permitir_borrar) return res.status(403).json({ ok: false, mensaje: "Borrar horarios está desactivado." });
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const id = searchParams.get("id");
    if (!id) return res.status(400).json({ ok: false, mensaje: "ID requerido." });
    try {
      const [resultado] = await poolConexion.query("DELETE FROM horarios_docentes WHERE idHorario=?", [id]);
      if (resultado.affectedRows===0) return res.status(404).json({ ok: false, mensaje: "Horario no encontrado." });
      return res.status(200).json({ ok: true, mensaje: "Horario eliminado." });
    } catch (err) {
      return res.status(500).json({ ok: false, mensaje: "Error al eliminar horario." });
    }
  }

  return res.status(405).json({ ok: false, mensaje: "Método no permitido." });
};