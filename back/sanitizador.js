"use strict";

/**
 * Sanitiza una cadena de texto eliminando caracteres peligrosos
 * y recortando espacios en blanco.
 * @param {*} valor - Valor a sanitizar
 * @returns {string} Cadena sanitizada
 */
function sanitizarTexto(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .trim()
    .replace(/[<>"'`;]/g, "")
    .substring(0, 255);
}

/**
 * Sanitiza un valor numérico entero.
 * @param {*} valor - Valor a sanitizar
 * @returns {number|null} Entero válido o null
 */
function sanitizarEntero(valor) {
  const num = parseInt(valor, 10);
  return isNaN(num) || num <= 0 ? null : num;
}

/**
 * Sanitiza una fecha en formato YYYY-MM-DD.
 * @param {*} valor - Valor a sanitizar
 * @returns {string|null} Fecha válida o null
 */
function sanitizarFecha(valor) {
  if (!valor) return null;
  const limpio = String(valor).trim();
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(limpio)) return null;
  const fecha = new Date(limpio);
  return isNaN(fecha.getTime()) ? null : limpio;
}

/**
 * Sanitiza una hora en formato HH:MM o HH:MM:SS.
 * @param {*} valor - Valor a sanitizar
 * @returns {string|null} Hora válida o null
 */
function sanitizarHora(valor) {
  if (!valor) return null;
  const limpio = String(valor).trim();
  const regex = /^\d{2}:\d{2}(:\d{2})?$/;
  return regex.test(limpio) ? limpio : null;
}

module.exports = { sanitizarTexto, sanitizarEntero, sanitizarFecha, sanitizarHora };
