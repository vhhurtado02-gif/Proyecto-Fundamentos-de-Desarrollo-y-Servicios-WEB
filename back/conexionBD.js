"use strict";

const mysql2 = require("mysql2/promise");
require("dotenv").config();

// Pool de conexiones a MySQL
const poolConexion = mysql2.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "juandaniel2017",
  database: process.env.DB_NAME || "horariosdocentes",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
});

// Verificar conexión al iniciar
async function verificarConexionBD() {
  try {
    const conexion = await poolConexion.getConnection();
    conexion.release();
    console.log("[BD] Conexión a MySQL establecida correctamente.");
    return true;
  } catch (error) {
    console.error("[BD] Error al conectar con MySQL:", error.message);
    return false;
  }
}

module.exports = { poolConexion, verificarConexionBD };
