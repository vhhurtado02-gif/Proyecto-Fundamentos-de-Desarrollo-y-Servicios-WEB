"use strict";

function sanitizarTexto(texto) {
  if (typeof texto !== "string") return "";
  return texto.trim().replace(/[<>"']/g, "");
}

module.exports = { sanitizarTexto };
