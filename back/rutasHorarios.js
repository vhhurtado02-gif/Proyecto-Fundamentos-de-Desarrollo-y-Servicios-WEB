"use strict";

const express = require("express");
const rutasHorarios = express.Router();
const { poolConexion } = require("./conexionBD");
const { sanitizarTexto, sanitizarEntero, sanitizarFecha, sanitizarHora } = require("./sanitizador");
const { validarDatosHorario } = require("./validadorHorario");

const CAMPOS_ORDEN_PERMITIDOS = ["idHorario", "docente", "materia"];
const CAMPOS_CHECK_PERMITIDOS = ["docente", "facultad", "carrera", "materia"];

// GET /api/horarios — compatible con frontend
rutasHorarios.get("/", async (req, res) => {
  try {
    let config = { permitir_crear: true, permitir_borrar: true, permitir_editar: true };
    try {
      const [cfgs] = await poolConexion.execute("SELECT clave, valor FROM app_config");
      cfgs.forEach(f => config[f.clave] = f.valor === "true");
    } catch(e) {}
    const [filas] = await poolConexion.execute("SELECT * FROM horarios_docentes ORDER BY idHorario ASC");
    return res.status(200).json({ ok: true, datos: filas, config });
  } catch (err) {
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

rutasHorarios.get("/byidHorario", async (req, res) => {
  try {
    const idHorario = sanitizarEntero(req.query.idHorario);
    if (!idHorario) return res.status(400).json({ ok: false, mensaje: "idHorario inválida." });
    const [filas] = await poolConexion.execute("SELECT * FROM horarios_docentes WHERE idHorario=?", [idHorario]);
    if (filas.length===0) return res.status(404).json({ ok: false, mensaje: "Horario No existe." });
    return res.status(200).json({ ok: true, horario: filas[0] });
  } catch (err) { return res.status(500).json({ ok: false, mensaje: "Error interno." }); }
});

rutasHorarios.get("/check", async (req, res) => {
  try {
    const campo = sanitizarTexto(req.query.field); const valor = sanitizarTexto(req.query.value);
    const excluirId = sanitizarEntero(req.query.excludeIdHorario);
    if (!CAMPOS_CHECK_PERMITIDOS.includes(campo)) return res.status(400).json({ ok: false, mensaje: "Campo no permitido." });
    if (!valor) return res.status(400).json({ ok: false, mensaje: "value es obligatorio." });
    let q = `SELECT COUNT(*) AS total FROM horarios_docentes WHERE \`${campo}\`=?`;
    const p = [valor];
    if (excluirId) { q += " AND idHorario!=?"; p.push(excluirId); }
    const [filas] = await poolConexion.execute(q, p);
    return res.status(200).json({ ok: true, existe: filas[0].total>0 });
  } catch (err) { return res.status(500).json({ ok: false, mensaje: "Error interno." }); }
});

rutasHorarios.get("/check-duplicado", async (req, res) => {
  try {
    const d=sanitizarTexto(req.query.docente),f=sanitizarTexto(req.query.facultad),c=sanitizarTexto(req.query.carrera),m=sanitizarTexto(req.query.materia);
    const excluirId=sanitizarEntero(req.query.excludeIdHorario);
    if (!d||!f||!c||!m) return res.status(400).json({ ok: false, mensaje: "Faltan campos." });
    let q=`SELECT COUNT(*) AS total FROM horarios_docentes WHERE docente=? AND facultad=? AND carrera=? AND materia=?`;
    const p=[d,f,c,m];
    if (excluirId) { q+=" AND idHorario!=?"; p.push(excluirId); }
    const [filas]=await poolConexion.execute(q,p);
    return res.status(200).json({ ok: true, existe: filas[0].total>0 });
  } catch (err) { return res.status(500).json({ ok: false, mensaje: "Error interno." }); }
});

rutasHorarios.get("/list-basic", async (req, res) => {
  try {
    const [filas]=await poolConexion.execute("SELECT * FROM horarios_docentes ORDER BY idHorario ASC");
    return res.status(200).json({ ok: true, horarios: filas, total: filas.length });
  } catch (err) { return res.status(500).json({ ok: false, mensaje: "Error interno." }); }
});

rutasHorarios.get("/list", async (req, res) => {
  try {
    const ordenarPor=sanitizarTexto(req.query.orderBy)||"idHorario"; const busqueda=sanitizarTexto(req.query.q);
    if (!CAMPOS_ORDEN_PERMITIDOS.includes(ordenarPor)) return res.status(400).json({ ok: false, mensaje: "Campo no permitido." });
    let q="SELECT * FROM horarios_docentes"; const p=[];
    if (busqueda) { q+=` WHERE docente LIKE ? OR facultad LIKE ? OR carrera LIKE ? OR materia LIKE ? OR CAST(idHorario AS CHAR) LIKE ?`; const t=`%${busqueda}%`; p.push(t,t,t,t,t); }
    q+=` ORDER BY \`${ordenarPor}\` ASC`;
    const [filas]=await poolConexion.execute(q,p);
    return res.status(200).json({ ok: true, horarios: filas, total: filas.length });
  } catch (err) { return res.status(500).json({ ok: false, mensaje: "Error interno." }); }
});

// POST /api/horarios
rutasHorarios.post("/", async (req, res) => {
  try {
    const errores=validarDatosHorario(req.body);
    if (errores.length>0) return res.status(400).json({ ok: false, errores });
    const docente=sanitizarTexto(req.body.docente),facultad=sanitizarTexto(req.body.facultad),carrera=sanitizarTexto(req.body.carrera),materia=sanitizarTexto(req.body.materia);
    const fechaClase=sanitizarFecha(req.body.fechaClase),horaIniciaClase=sanitizarHora(req.body.horaIniciaClase),horaTerminaClase=sanitizarHora(req.body.horaTerminaClase);
    const [dup]=await poolConexion.execute(`SELECT COUNT(*) AS total FROM horarios_docentes WHERE docente=? AND facultad=? AND carrera=? AND materia=?`,[docente,facultad,carrera,materia]);
    if (dup[0].total>0) return res.status(409).json({ ok: false, mensaje: "El horario ya existe." });
    const [resultado]=await poolConexion.execute(`INSERT INTO horarios_docentes (docente,facultad,carrera,materia,fechaClase,horaIniciaClase,horaTerminaClase) VALUES (?,?,?,?,?,?,?)`,[docente,facultad,carrera,materia,fechaClase,horaIniciaClase,horaTerminaClase]);
    return res.status(201).json({ ok: true, mensaje: "Registro creado.", id: resultado.insertId });
  } catch (err) { return res.status(500).json({ ok: false, mensaje: "Error interno." }); }
});

// PUT /api/horarios?id=X — compatible con frontend
rutasHorarios.put("/", async (req, res) => {
  try {
    const idHorario=sanitizarEntero(req.query.id);
    if (!idHorario) return res.status(400).json({ ok: false, mensaje: "ID requerido." });
    const [existente]=await poolConexion.execute("SELECT idHorario FROM horarios_docentes WHERE idHorario=?",[idHorario]);
    if (existente.length===0) return res.status(404).json({ ok: false, mensaje: "Horario no encontrado." });
    const errores=validarDatosHorario(req.body);
    if (errores.length>0) return res.status(400).json({ ok: false, errores });
    const docente=sanitizarTexto(req.body.docente),facultad=sanitizarTexto(req.body.facultad),carrera=sanitizarTexto(req.body.carrera),materia=sanitizarTexto(req.body.materia);
    const fechaClase=sanitizarFecha(req.body.fechaClase),horaIniciaClase=sanitizarHora(req.body.horaIniciaClase),horaTerminaClase=sanitizarHora(req.body.horaTerminaClase);
    await poolConexion.execute(`UPDATE horarios_docentes SET docente=?,facultad=?,carrera=?,materia=?,fechaClase=?,horaIniciaClase=?,horaTerminaClase=? WHERE idHorario=?`,[docente,facultad,carrera,materia,fechaClase,horaIniciaClase,horaTerminaClase,idHorario]);
    return res.status(200).json({ ok: true, mensaje: "Horario actualizado." });
  } catch (err) { return res.status(500).json({ ok: false, mensaje: "Error interno." }); }
});

// PUT /api/horarios/:id — ruta original
rutasHorarios.put("/:id", async (req, res) => {
  try {
    const idHorario=sanitizarEntero(req.params.id);
    if (!idHorario) return res.status(400).json({ ok: false, mensaje: "idHorario inválida." });
    const [existente]=await poolConexion.execute("SELECT idHorario FROM horarios_docentes WHERE idHorario=?",[idHorario]);
    if (existente.length===0) return res.status(404).json({ ok: false, mensaje: "Horario no fue encontrado." });
    const errores=validarDatosHorario(req.body);
    if (errores.length>0) return res.status(400).json({ ok: false, errores });
    const docente=sanitizarTexto(req.body.docente),facultad=sanitizarTexto(req.body.facultad),carrera=sanitizarTexto(req.body.carrera),materia=sanitizarTexto(req.body.materia);
    const fechaClase=sanitizarFecha(req.body.fechaClase),horaIniciaClase=sanitizarHora(req.body.horaIniciaClase),horaTerminaClase=sanitizarHora(req.body.horaTerminaClase);
    await poolConexion.execute(`UPDATE horarios_docentes SET docente=?,facultad=?,carrera=?,materia=?,fechaClase=?,horaIniciaClase=?,horaTerminaClase=? WHERE idHorario=?`,[docente,facultad,carrera,materia,fechaClase,horaIniciaClase,horaTerminaClase,idHorario]);
    return res.status(200).json({ ok: true, mensaje: "Horario editado." });
  } catch (err) { return res.status(500).json({ ok: false, mensaje: "Error interno." }); }
});

// DELETE /api/horarios?id=X — compatible con frontend
rutasHorarios.delete("/", async (req, res) => {
  try {
    const idHorario=sanitizarEntero(req.query.id);
    if (!idHorario) return res.status(400).json({ ok: false, mensaje: "ID requerido." });
    const [existente]=await poolConexion.execute("SELECT idHorario FROM horarios_docentes WHERE idHorario=?",[idHorario]);
    if (existente.length===0) return res.status(404).json({ ok: false, mensaje: "Horario no encontrado." });
    await poolConexion.execute("DELETE FROM horarios_docentes WHERE idHorario=?",[idHorario]);
    return res.status(200).json({ ok: true, mensaje: "Horario eliminado." });
  } catch (err) { return res.status(500).json({ ok: false, mensaje: "Error interno." }); }
});

// DELETE /api/horarios/by-idHorario — ruta original
rutasHorarios.delete("/by-idHorario", async (req, res) => {
  try {
    const idHorario=sanitizarEntero(req.body.idHorario);
    if (!idHorario) return res.status(400).json({ ok: false, mensaje: "idHorario inválida." });
    const [existente]=await poolConexion.execute("SELECT idHorario FROM horarios_docentes WHERE idHorario=?",[idHorario]);
    if (existente.length===0) return res.status(404).json({ ok: false, mensaje: "Horario No existe." });
    await poolConexion.execute("DELETE FROM horarios_docentes WHERE idHorario=?",[idHorario]);
    return res.status(200).json({ ok: true, mensaje: "Horario borrado." });
  } catch (err) { return res.status(500).json({ ok: false, mensaje: "Error interno." }); }
});

module.exports = rutasHorarios;