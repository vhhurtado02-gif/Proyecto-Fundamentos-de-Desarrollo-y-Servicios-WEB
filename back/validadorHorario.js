"use strict";

const { sanitizarTexto, sanitizarFecha, sanitizarHora } = require("./sanitizador");

/**
 * Valida los campos obligatorios de un horario.
 * @param {Object} datos - Objeto con los datos del horario
 * @returns {string[]} Lista de errores encontrados (vacía si todo es válido)
 */
function validarDatosHorario(datos) {
  const errores = [];

  const docente = sanitizarTexto(datos.docente);
  const facultad = sanitizarTexto(datos.facultad);
  const carrera = sanitizarTexto(datos.carrera);
  const materia = sanitizarTexto(datos.materia);
  const fechaClase = sanitizarFecha(datos.fechaClase);
  const horaIniciaClase = sanitizarHora(datos.horaIniciaClase);
  const horaTerminaClase = sanitizarHora(datos.horaTerminaClase);

  if (!docente) errores.push("El campo 'docente' es obligatorio.");
  if (!facultad) errores.push("El campo 'facultad' es obligatorio.");
  if (!carrera) errores.push("El campo 'carrera' es obligatorio.");
  if (!materia) errores.push("El campo 'materia' es obligatorio.");
  if (!fechaClase) errores.push("El campo 'fechaClase' es obligatorio y debe tener formato YYYY-MM-DD.");
  if (!horaIniciaClase) errores.push("El campo 'horaIniciaClase' es obligatorio y debe tener formato HH:MM.");
  if (!horaTerminaClase) errores.push("El campo 'horaTerminaClase' es obligatorio y debe tener formato HH:MM.");

  return errores;
}

module.exports = { validarDatosHorario };
