-- ============================================================
-- Script de creación de base de datos: horariosdocentes
-- Proyecto: horariosDocenteApp
-- ============================================================

CREATE DATABASE IF NOT EXISTS horariosdocentes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE horariosdocentes;

CREATE TABLE IF NOT EXISTS horarios_docentes (
  idHorario        INT          NOT NULL AUTO_INCREMENT,
  docente          VARCHAR(150) NOT NULL,
  facultad         VARCHAR(150) NOT NULL,
  carrera          VARCHAR(150) NOT NULL,
  materia          VARCHAR(150) NOT NULL,
  fechaClase       DATE         NOT NULL,
  horaIniciaClase  TIME         NOT NULL,
  horaTerminaClase TIME         NOT NULL,
  PRIMARY KEY (idHorario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos de prueba (opcional)
INSERT INTO horarios_docentes (docente, facultad, carrera, materia, fechaClase, horaIniciaClase, horaTerminaClase) VALUES
('Diego Fernando Londoño', 'Facultad de Ingeniería', 'Ingeniería de Sistemas', 'Programación y Servicios WEB', '2026-05-19', '07:00:00', '09:00:00'),
('María González', 'Facultad de Ciencias Económicas', 'Administración de Empresas', 'Fundamentos de Administración', '2026-05-19', '09:00:00', '11:00:00');
