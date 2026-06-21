"use strict";
const mysql2 = require("mysql2/promise");

const poolConexion = mysql2.createPool({
  host: process.env.MYSQLHOST,
  port: parseInt(process.env.MYSQLPORT) || 3306,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
});

async function verificarConexionBD() {
  try {
    const conexion = await poolConexion.getConnection();
    conexion.release();
    return true;
  } catch (error) {
    console.error("[BD] Error al conectar con MySQL:", error.message);
    return false;
  }
}

module.exports = { poolConexion, verificarConexionBD };
