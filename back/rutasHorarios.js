"use strict";

const express = require("express");
const rutasHorarios = express.Router();
const { poolConexion } = require("./conexionBD");
const { sanitizarTexto, sanitizarEntero, sanitizarFecha, sanitizarHora } = require("./sanitizador");
const { validarDatosHorario } = require("./validadorHorario");

// Campos permitidos para ordenar y verificar duplicados
const CAMPOS_ORDEN_PERMITIDOS = ["idHorario", "docente", "materia"];
const CAMPOS_CHECK_PERMITIDOS = ["docente", "facultad", "carrera", "materia"];

// ─────────────────────────────────────────────
// GET /api/horarios/byidHorario?idHorario=...
// Consultar un horario por su ID
// ─────────────────────────────────────────────
rutasHorarios.get("/byidHorario", async (req, res) => {
  try {
    const idHorario = sanitizarEntero(req.query.idHorario);
    if (!idHorario) {
      return res.status(400).json({ ok: false, mensaje: "idHorario inválida." });
    }

    const [filas] = await poolConexion.execute(
      "SELECT * FROM horarios_docentes WHERE idHorario = ?",
      [idHorario]
    );

    if (filas.length === 0) {
      return res.status(404).json({ ok: false, mensaje: "Horario No existe." });
    }

    return res.status(200).json({ ok: true, horario: filas[0] });
  } catch (err) {
    console.error("[GET byidHorario]", err.message);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ─────────────────────────────────────────────
// GET /api/horarios/check?field=...&value=...&excludeIdHorario=...
// Verificar si ya existe un valor en un campo (para validar duplicados)
// ─────────────────────────────────────────────
rutasHorarios.get("/check", async (req, res) => {
  try {
    const campo = sanitizarTexto(req.query.field);
    const valor = sanitizarTexto(req.query.value);
    const excluirId = sanitizarEntero(req.query.excludeIdHorario);

    if (!CAMPOS_CHECK_PERMITIDOS.includes(campo)) {
      return res.status(400).json({ ok: false, mensaje: "Campo no permitido para verificación." });
    }
    if (!valor) {
      return res.status(400).json({ ok: false, mensaje: "El parámetro 'value' es obligatorio." });
    }

    let consulta = `SELECT COUNT(*) AS total FROM horarios_docentes WHERE \`${campo}\` = ?`;
    const parametros = [valor];

    if (excluirId) {
      consulta += " AND idHorario != ?";
      parametros.push(excluirId);
    }

    const [filas] = await poolConexion.execute(consulta, parametros);
    const existe = filas[0].total > 0;

    return res.status(200).json({ ok: true, existe });
  } catch (err) {
    console.error("[GET check]", err.message);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ─────────────────────────────────────────────
// GET /api/horarios/check-duplicado
// Verifica duplicado exacto: misma materia+carrera+facultad+docente
// ─────────────────────────────────────────────
rutasHorarios.get("/check-duplicado", async (req, res) => {
  try {
    const docente = sanitizarTexto(req.query.docente);
    const facultad = sanitizarTexto(req.query.facultad);
    const carrera = sanitizarTexto(req.query.carrera);
    const materia = sanitizarTexto(req.query.materia);
    const excluirId = sanitizarEntero(req.query.excludeIdHorario);

    if (!docente || !facultad || !carrera || !materia) {
      return res.status(400).json({ ok: false, mensaje: "Faltan campos para verificar duplicado." });
    }

    let consulta = `SELECT COUNT(*) AS total FROM horarios_docentes
                    WHERE docente = ? AND facultad = ? AND carrera = ? AND materia = ?`;
    const parametros = [docente, facultad, carrera, materia];

    if (excluirId) {
      consulta += " AND idHorario != ?";
      parametros.push(excluirId);
    }

    const [filas] = await poolConexion.execute(consulta, parametros);
    const existe = filas[0].total > 0;

    return res.status(200).json({ ok: true, existe });
  } catch (err) {
    console.error("[GET check-duplicado]", err.message);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ─────────────────────────────────────────────
// GET /api/horarios/list-basic
// Listar todos los horarios sin filtros
// ─────────────────────────────────────────────
rutasHorarios.get("/list-basic", async (req, res) => {
  try {
    const [filas] = await poolConexion.execute(
      "SELECT * FROM horarios_docentes ORDER BY idHorario ASC"
    );
    return res.status(200).json({ ok: true, horarios: filas, total: filas.length });
  } catch (err) {
    console.error("[GET list-basic]", err.message);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ─────────────────────────────────────────────
// GET /api/horarios/list?orderBy=...&q=...
// Listar horarios con búsqueda y ordenamiento
// ─────────────────────────────────────────────
rutasHorarios.get("/list", async (req, res) => {
  try {
    const ordenarPor = sanitizarTexto(req.query.orderBy) || "idHorario";
    const busqueda = sanitizarTexto(req.query.q);

    if (!CAMPOS_ORDEN_PERMITIDOS.includes(ordenarPor)) {
      return res.status(400).json({ ok: false, mensaje: `Campo de orden no permitido: ${ordenarPor}` });
    }

    let consulta = "SELECT * FROM horarios_docentes";
    const parametros = [];

    if (busqueda) {
      consulta += ` WHERE docente LIKE ? OR facultad LIKE ? OR carrera LIKE ?
                   OR materia LIKE ? OR CAST(idHorario AS CHAR) LIKE ?`;
      const termino = `%${busqueda}%`;
      parametros.push(termino, termino, termino, termino, termino);
    }

    consulta += ` ORDER BY \`${ordenarPor}\` ASC`;

    const [filas] = await poolConexion.execute(consulta, parametros);
    return res.status(200).json({ ok: true, horarios: filas, total: filas.length });
  } catch (err) {
    console.error("[GET list]", err.message);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ─────────────────────────────────────────────
// POST /api/horarios
// Crear un nuevo horario
// ─────────────────────────────────────────────
rutasHorarios.post("/", async (req, res) => {
  try {
    const errores = validarDatosHorario(req.body);
    if (errores.length > 0) {
      return res.status(400).json({ ok: false, errores });
    }

    const docente = sanitizarTexto(req.body.docente);
    const facultad = sanitizarTexto(req.body.facultad);
    const carrera = sanitizarTexto(req.body.carrera);
    const materia = sanitizarTexto(req.body.materia);
    const fechaClase = sanitizarFecha(req.body.fechaClase);
    const horaIniciaClase = sanitizarHora(req.body.horaIniciaClase);
    const horaTerminaClase = sanitizarHora(req.body.horaTerminaClase);

    // Verificar duplicado exacto
    const [duplicado] = await poolConexion.execute(
      `SELECT COUNT(*) AS total FROM horarios_docentes
       WHERE docente = ? AND facultad = ? AND carrera = ? AND materia = ?`,
      [docente, facultad, carrera, materia]
    );

    if (duplicado[0].total > 0) {
      return res.status(409).json({ ok: false, mensaje: "El horario ya existe." });
    }

    const [resultado] = await poolConexion.execute(
      `INSERT INTO horarios_docentes
       (docente, facultad, carrera, materia, fechaClase, horaIniciaClase, horaTerminaClase)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [docente, facultad, carrera, materia, fechaClase, horaIniciaClase, horaTerminaClase]
    );

    return res.status(201).json({
      ok: true,
      mensaje: "Registro creado.",
      idHorario: resultado.insertId,
    });
  } catch (err) {
    console.error("[POST /]", err.message);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ─────────────────────────────────────────────
// PUT /api/horarios/:id
// Editar un horario existente
// ─────────────────────────────────────────────
rutasHorarios.put("/:id", async (req, res) => {
  try {
    const idHorario = sanitizarEntero(req.params.id);
    if (!idHorario) {
      return res.status(400).json({ ok: false, mensaje: "idHorario inválida." });
    }

    // Verificar existencia
    const [existente] = await poolConexion.execute(
      "SELECT idHorario FROM horarios_docentes WHERE idHorario = ?",
      [idHorario]
    );
    if (existente.length === 0) {
      return res.status(404).json({ ok: false, mensaje: "Horario no fue encontrado." });
    }

    // Validar datos
    const errores = validarDatosHorario(req.body);
    if (errores.length > 0) {
      return res.status(400).json({ ok: false, errores });
    }

    const docente = sanitizarTexto(req.body.docente);
    const facultad = sanitizarTexto(req.body.facultad);
    const carrera = sanitizarTexto(req.body.carrera);
    const materia = sanitizarTexto(req.body.materia);
    const fechaClase = sanitizarFecha(req.body.fechaClase);
    const horaIniciaClase = sanitizarHora(req.body.horaIniciaClase);
    const horaTerminaClase = sanitizarHora(req.body.horaTerminaClase);

    // Verificar duplicado excluyendo el registro actual
    const [duplicado] = await poolConexion.execute(
      `SELECT COUNT(*) AS total FROM horarios_docentes
       WHERE docente = ? AND facultad = ? AND carrera = ? AND materia = ?
       AND idHorario != ?`,
      [docente, facultad, carrera, materia, idHorario]
    );

    if (duplicado[0].total > 0) {
      return res.status(409).json({ ok: false, mensaje: "El horario ya existe." });
    }

    await poolConexion.execute(
      `UPDATE horarios_docentes SET
         docente = ?, facultad = ?, carrera = ?, materia = ?,
         fechaClase = ?, horaIniciaClase = ?, horaTerminaClase = ?
       WHERE idHorario = ?`,
      [docente, facultad, carrera, materia, fechaClase, horaIniciaClase, horaTerminaClase, idHorario]
    );

    return res.status(200).json({ ok: true, mensaje: "Horario editado." });
  } catch (err) {
    console.error("[PUT /:id]", err.message);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/horarios/by-idHorario
// Eliminar un horario por ID (recibe JSON con idHorario)
// ─────────────────────────────────────────────
rutasHorarios.delete("/by-idHorario", async (req, res) => {
  try {
    const idHorario = sanitizarEntero(req.body.idHorario);
    if (!idHorario) {
      return res.status(400).json({ ok: false, mensaje: "idHorario inválida." });
    }

    const [existente] = await poolConexion.execute(
      "SELECT idHorario FROM horarios_docentes WHERE idHorario = ?",
      [idHorario]
    );
    if (existente.length === 0) {
      return res.status(404).json({ ok: false, mensaje: "Horario No existe." });
    }

    await poolConexion.execute(
      "DELETE FROM horarios_docentes WHERE idHorario = ?",
      [idHorario]
    );

    return res.status(200).json({ ok: true, mensaje: "Horario borrado." });
  } catch (err) {
    console.error("[DELETE by-idHorario]", err.message);
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

module.exports = rutasHorarios;
