"use strict";

// ═══════════════════════════════════════════════════════════════
//  horariosDocenteApp  |  appHorarios.js

// ═══════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────
// CONSTANTES Y DATOS INSTITUCIONALES CIAF
// ──────────────────────────────────────────────────────────────
const URL_API = "/api/horarios";

const DATOS_CIAF = {
  "Facultad de Ingeniería": {
    "Ingeniería de Sistemas": [
      "Programación y Servicios WEB",
      "Bases de Datos",
      "Redes y Comunicaciones",
      "Ingeniería de Software",
      "Sistemas Operativos",
      "Algoritmos y Programación",
    ],
    "Ingeniería Electrónica": [
      "Circuitos Eléctricos",
      "Electrónica Analógica",
      "Electrónica Digital",
      "Microcontroladores",
      "Telecomunicaciones",
    ],
  },
  "Facultad de Ciencias Económicas": {
    "Administración de Empresas": [
      "Fundamentos de Administración",
      "Contabilidad General",
      "Economía General",
      "Marketing Empresarial",
      "Gestión Humana",
    ],
    "Contaduría Pública": [
      "Contabilidad Financiera",
      "Auditoría",
      "Tributaria",
      "Costos y Presupuestos",
      "Revisoría Fiscal",
    ],
  },
  "Facultad de Ciencias Jurídicas": {
    "Derecho": [
      "Derecho Civil",
      "Derecho Comercial",
      "Derecho Laboral",
      "Derecho Penal",
      "Derecho Constitucional",
    ],
  },
  "Facultad de Ciencias de la Salud": {
    "Instrumentación Quirúrgica": [
      "Anatomía Humana",
      "Fisiología",
      "Técnicas Quirúrgicas",
      "Esterilización",
      "Bioseguridad",
    ],
    "Regencia de Farmacia": [
      "Farmacología",
      "Química Orgánica",
      "Legislación Farmacéutica",
      "Farmacovigilancia",
      "Atención Farmacéutica",
    ],
  },
};

// ──────────────────────────────────────────────────────────────
// ESTADO GLOBAL DE LA APLICACIÓN
// ──────────────────────────────────────────────────────────────
const estadoApp = {
  vistaActual: "menu",
  horarioCargado: false,
  idHorarioCargado: null,
};

// ──────────────────────────────────────────────────────────────
// UTILIDADES DE SANITIZACIÓN EN EL FRONT
// ──────────────────────────────────────────────────────────────
function sanitizarEntradaTexto(valor) {
  if (!valor) return "";
  return String(valor).trim().replace(/[<>"'`;]/g, "").substring(0, 255);
}

function sanitizarEntradaId(valor) {
  const num = parseInt(valor, 10);
  return isNaN(num) || num <= 0 ? null : num;
}

// ──────────────────────────────────────────────────────────────
// UTILIDADES DOM
// ──────────────────────────────────────────────────────────────
function obtenerElemento(id) {
  return document.getElementById(id);
}

function mostrarMensaje(idElemento, texto, esError) {
  const el = obtenerElemento(idElemento);
  if (!el) return;
  el.textContent = texto;
  el.style.color = esError ? "#ff0000" : "#05f305";
}

function limpiarMensaje(idElemento) {
  const el = obtenerElemento(idElemento);
  if (el) el.textContent = "";
}

function habilitarBotones(ids, habilitar) {
  ids.forEach(function(id) {
    const btn = obtenerElemento(id);
    if (btn) btn.disabled = !habilitar;
  });
}

function deshabilitarTemporalmente(ids, msMilisegundos) {
  habilitarBotones(ids, false);
  setTimeout(function() {
    habilitarBotones(ids, true);
  }, msMilisegundos || 2000);
}

// ──────────────────────────────────────────────────────────────
// LLAMADAS A LA API (fetch)
// ──────────────────────────────────────────────────────────────
async function apiFetch(metodo, ruta, cuerpo) {
  const opciones = {
    method: metodo,
    headers: { "Content-Type": "application/json" },
  };
  if (cuerpo) opciones.body = JSON.stringify(cuerpo);

  const respuesta = await fetch(URL_API + ruta, opciones);
  const datos = await respuesta.json();
  return { estado: respuesta.status, datos };
}

// ──────────────────────────────────────────────────────────────
// CONSTRUIR INTERFAZ PRINCIPAL
// ──────────────────────────────────────────────────────────────
function construirEstructuraBase() {
  const contenedor = obtenerElemento("contenedorPrincipal");
  contenedor.innerHTML = `
    <div id="cabeceraApp">
      <h1 id="tituloPrincipal">CIAF - Administración de Horarios</h1>
      <p id="subtituloApp">Corporación Instituto de Administración y Finanzas</p>
    </div>

    <div id="areaPrincipal">

      <!-- MENU PRINCIPAL -->
      <div id="vistaMenu">
        <h2>Menú Principal</h2>
        <p id="guiaMenu">Selecciona una opcion del menu.</p>
        <div id="botonesMenu">
          <button id="btnCrear"   onclick="mostrarVistaCrear()">Crear horario</button>
          <button id="btnEditar"  onclick="mostrarVistaEditar()">Editar horario</button>
          <button id="btnBorrar"  onclick="mostrarVistaBorrar()">Borrar horario</button>
          <button id="btnListado" onclick="mostrarVistaListado()">Listado de horarios</button>
          <button id="btnSalir"   onclick="mostrarVistaSalir()">Salir del programa</button>
        </div>
      </div>

      <!-- FORMULARIO CREAR -->
      <div id="vistaCrear" style="display:none;">
        <h2>Crear Horario</h2>
        <div id="formCrear">
          <div class="campoForm">
            <label for="crearDocente">Docente:</label>
            <input type="text" id="crearDocente" maxlength="150" placeholder="Nombre completo del docente" />
          </div>
          <div class="campoForm">
            <label for="crearFacultad">Facultad:</label>
            <select id="crearFacultad" onchange="actualizarCarreras('crear')">
              <option value="">-- Seleccione facultad --</option>
            </select>
          </div>
          <div class="campoForm">
            <label for="crearCarrera">Carrera:</label>
            <select id="crearCarrera" onchange="actualizarMaterias('crear')">
              <option value="">-- Seleccione carrera --</option>
            </select>
          </div>
          <div class="campoForm">
            <label for="crearMateria">Materia:</label>
            <select id="crearMateria">
              <option value="">-- Seleccione materia --</option>
            </select>
          </div>
          <div class="campoForm">
            <label for="crearFechaClase">Fecha Clase (YYYY-MM-DD):</label>
            <input type="date" id="crearFechaClase" />
          </div>
          <div class="campoForm">
            <label for="crearHoraInicia">Hora Inicio Clase:</label>
            <input type="time" id="crearHoraInicia" />
          </div>
          <div class="campoForm">
            <label for="crearHoraTermina">Hora Termina Clase:</label>
            <input type="time" id="crearHoraTermina" />
          </div>
          <div id="mensajeCrear" class="areaMensaje"></div>
          <div class="botonesAccion">
            <button id="btnGuardarCrear" onclick="ejecutarCrearHorario()">Guardar</button>
            <button id="btnCancelarCrear" onclick="cancelarYVolverMenu('formCrear')">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- FORMULARIO EDITAR -->
      <div id="vistaEditar" style="display:none;">
        <h2>Editar Horario</h2>
        <div id="formEditar">
          <div class="campoForm">
            <label for="editarIdBuscar">ID Horario a buscar:</label>
            <input type="number" id="editarIdBuscar" min="1" placeholder="Ingrese el ID" />
            <button id="btnBuscarEditar" onclick="ejecutarBuscarParaEditar()">Buscar</button>
          </div>
          <div class="campoForm">
            <label for="editarDocente">Docente:</label>
            <input type="text" id="editarDocente" maxlength="150" />
          </div>
          <div class="campoForm">
            <label for="editarFacultad">Facultad:</label>
            <select id="editarFacultad" onchange="actualizarCarreras('editar')">
              <option value="">-- Seleccione facultad --</option>
            </select>
          </div>
          <div class="campoForm">
            <label for="editarCarrera">Carrera:</label>
            <select id="editarCarrera" onchange="actualizarMaterias('editar')">
              <option value="">-- Seleccione carrera --</option>
            </select>
          </div>
          <div class="campoForm">
            <label for="editarMateria">Materia:</label>
            <select id="editarMateria">
              <option value="">-- Seleccione materia --</option>
            </select>
          </div>
          <div class="campoForm">
            <label for="editarFechaClase">Fecha Clase:</label>
            <input type="date" id="editarFechaClase" />
          </div>
          <div class="campoForm">
            <label for="editarHoraInicia">Hora Inicio Clase:</label>
            <input type="time" id="editarHoraInicia" />
          </div>
          <div class="campoForm">
            <label for="editarHoraTermina">Hora Termina Clase:</label>
            <input type="time" id="editarHoraTermina" />
          </div>
          <div id="mensajeEditar" class="areaMensaje"></div>
          <div class="botonesAccion">
            <button id="btnConfirmarEditar" onclick="ejecutarEditarHorario()">Editar</button>
            <button id="btnCancelarEditar" onclick="cancelarYVolverMenu('formEditar')">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- FORMULARIO BORRAR -->
      <div id="vistaBorrar" style="display:none;">
        <h2>Borrar Horario</h2>
        <div id="formBorrar">
          <div class="campoForm">
            <label for="borrarIdBuscar">ID Horario a buscar:</label>
            <input type="number" id="borrarIdBuscar" min="1" placeholder="Ingrese el ID" />
            <button id="btnBuscarBorrar" onclick="ejecutarBuscarParaBorrar()">Buscar</button>
          </div>
          <div class="campoForm">
            <label for="borrarDocente">Docente:</label>
            <input type="text" id="borrarDocente" maxlength="150" />
          </div>
          <div class="campoForm">
            <label for="borrarFacultad">Facultad:</label>
            <input type="text" id="borrarFacultad" readonly />
          </div>
          <div class="campoForm">
            <label for="borrarCarrera">Carrera:</label>
            <input type="text" id="borrarCarrera" readonly />
          </div>
          <div class="campoForm">
            <label for="borrarMateria">Materia:</label>
            <input type="text" id="borrarMateria" readonly />
          </div>
          <div class="campoForm">
            <label for="borrarFechaClase">Fecha Clase:</label>
            <input type="date" id="borrarFechaClase" readonly />
          </div>
          <div class="campoForm">
            <label for="borrarHoraInicia">Hora Inicio Clase:</label>
            <input type="time" id="borrarHoraInicia" readonly />
          </div>
          <div class="campoForm">
            <label for="borrarHoraTermina">Hora Termina Clase:</label>
            <input type="time" id="borrarHoraTermina" readonly />
          </div>
          <div id="mensajeBorrar" class="areaMensaje"></div>
          <div class="botonesAccion">
            <button id="btnConfirmarBorrar" onclick="ejecutarBorrarHorario()">Eliminar</button>
            <button id="btnCancelarBorrar" onclick="cancelarYVolverMenu('formBorrar')">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- VISTA LISTADO -->
      <div id="vistaListado" style="display:none;">
        <h2>Listado de Horarios</h2>
        <div id="controlesListado">
          <label for="selOrdenarPor">Ordenar por:</label>
          <select id="selOrdenarPor">
            <option value="idHorario">ID Horario</option>
            <option value="docente">Docente</option>
            <option value="materia">Materia</option>
          </select>
          <label for="inputBusqueda">Busqueda:</label>
          <input type="text" id="inputBusqueda" placeholder="Texto a buscar..." />
          <button id="btnBuscarListado" onclick="ejecutarListado()">Buscar</button>
          <button id="btnCerrarListado" onclick="mostrarVistaMenu()">Cerrar</button>
        </div>
        <div id="resumenListado"></div>
        <div id="tablaListadoContenedor"></div>
      </div>

      <!-- VISTA SALIR -->
      <div id="vistaSalir" style="display:none;">
        <h2>Salir del Programa</h2>
        <p>Puede cerrar esta pestana/ventana del navegador para finalizar.</p>
        <button id="btnVolverMenu" onclick="mostrarVistaMenu()">Volver al menu</button>
      </div>

    </div><!-- fin areaPrincipal -->

    <div id="piePagina">
      <p>HorariosDocenteApp | CIAF | Programacion y Servicios WEB IV SEMESTRE</p>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────
// GESTIÓN DE VISTAS
// ──────────────────────────────────────────────────────────────
function ocultarTodasLasVistas() {
  const vistas = [
    "vistaMenu", "vistaCrear", "vistaEditar",
    "vistaBorrar", "vistaListado", "vistaSalir",
  ];
  vistas.forEach(function(v) {
    const el = obtenerElemento(v);
    if (el) el.style.display = "none";
  });
}

function mostrarVistaMenu() {
  ocultarTodasLasVistas();
  obtenerElemento("vistaMenu").style.display = "block";
  estadoApp.vistaActual = "menu";
}

function mostrarVistaCrear() {
  ocultarTodasLasVistas();
  limpiarFormulario("crear");
  cargarFacultades("crear");
  obtenerElemento("vistaCrear").style.display = "block";
  estadoApp.vistaActual = "crear";
}

function mostrarVistaEditar() {
  ocultarTodasLasVistas();
  limpiarFormulario("editar");
  cargarFacultades("editar");
  estadoApp.horarioCargado = false;
  estadoApp.idHorarioCargado = null;
  obtenerElemento("vistaEditar").style.display = "block";
  estadoApp.vistaActual = "editar";
}

function mostrarVistaBorrar() {
  ocultarTodasLasVistas();
  limpiarFormulario("borrar");
  estadoApp.horarioCargado = false;
  estadoApp.idHorarioCargado = null;
  obtenerElemento("vistaBorrar").style.display = "block";
  estadoApp.vistaActual = "borrar";
}

function mostrarVistaListado() {
  ocultarTodasLasVistas();
  limpiarMensaje("resumenListado");
  obtenerElemento("tablaListadoContenedor").innerHTML = "";
  obtenerElemento("inputBusqueda").value = "";
  obtenerElemento("vistaListado").style.display = "block";
  estadoApp.vistaActual = "listado";
  ejecutarListado();
}

function mostrarVistaSalir() {
  ocultarTodasLasVistas();
  obtenerElemento("vistaSalir").style.display = "block";
  estadoApp.vistaActual = "salir";
}

function cancelarYVolverMenu(nombreForm) {
  limpiarFormulario(nombreForm.replace("form", "").toLowerCase());
  mostrarVistaMenu();
}

// ──────────────────────────────────────────────────────────────
// GESTIÓN DE SELECTS ENCADENADOS (Facultad → Carrera → Materia)
// ──────────────────────────────────────────────────────────────
function cargarFacultades(prefijo) {
  const selFacultad = obtenerElemento(prefijo + "Facultad");
  if (!selFacultad) return;
  selFacultad.innerHTML = '<option value="">-- Seleccione facultad --</option>';
  Object.keys(DATOS_CIAF).forEach(function(facultad) {
    const op = document.createElement("option");
    op.value = facultad;
    op.textContent = facultad;
    selFacultad.appendChild(op);
  });
}

function actualizarCarreras(prefijo) {
  const facultadSel = obtenerElemento(prefijo + "Facultad").value;
  const selCarrera = obtenerElemento(prefijo + "Carrera");
  const selMateria = obtenerElemento(prefijo + "Materia");

  selCarrera.innerHTML = '<option value="">-- Seleccione carrera --</option>';
  selMateria.innerHTML = '<option value="">-- Seleccione materia --</option>';

  if (!facultadSel || !DATOS_CIAF[facultadSel]) return;

  Object.keys(DATOS_CIAF[facultadSel]).forEach(function(carrera) {
    const op = document.createElement("option");
    op.value = carrera;
    op.textContent = carrera;
    selCarrera.appendChild(op);
  });
}

function actualizarMaterias(prefijo) {
  const facultadSel = obtenerElemento(prefijo + "Facultad").value;
  const carreraSel = obtenerElemento(prefijo + "Carrera").value;
  const selMateria = obtenerElemento(prefijo + "Materia");

  selMateria.innerHTML = '<option value="">-- Seleccione materia --</option>';

  if (!facultadSel || !carreraSel) return;
  const materias = DATOS_CIAF[facultadSel] && DATOS_CIAF[facultadSel][carreraSel];
  if (!materias) return;

  materias.forEach(function(materia) {
    const op = document.createElement("option");
    op.value = materia;
    op.textContent = materia;
    selMateria.appendChild(op);
  });
}

// Función para establecer un valor en un select (útil al cargar datos para editar)
function seleccionarEnSelect(idSelect, valorBuscado) {
  const sel = obtenerElemento(idSelect);
  if (!sel) return;
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === valorBuscado) {
      sel.selectedIndex = i;
      return;
    }
  }
}

// ──────────────────────────────────────────────────────────────
// LIMPIAR FORMULARIOS
// ──────────────────────────────────────────────────────────────
function limpiarFormulario(prefijo) {
  const campos = ["Docente", "FechaClase", "HoraInicia", "HoraTermina", "IdBuscar"];
  campos.forEach(function(c) {
    const el = obtenerElemento(prefijo + c);
    if (el) el.value = "";
  });

  // Limpiar selects si existen
  ["Facultad", "Carrera", "Materia"].forEach(function(c) {
    const el = obtenerElemento(prefijo + c);
    if (el && el.tagName === "SELECT") {
      el.innerHTML = '<option value="">-- Seleccione --</option>';
    } else if (el && el.tagName === "INPUT") {
      el.value = "";
    }
  });

  limpiarMensaje("mensaje" + prefijo.charAt(0).toUpperCase() + prefijo.slice(1));

  estadoApp.horarioCargado = false;
  estadoApp.idHorarioCargado = null;
}

// ──────────────────────────────────────────────────────────────
// CRUD: CREAR HORARIO
// ──────────────────────────────────────────────────────────────
async function ejecutarCrearHorario() {
  limpiarMensaje("mensajeCrear");

  const docente = sanitizarEntradaTexto(obtenerElemento("crearDocente").value);
  const facultad = sanitizarEntradaTexto(obtenerElemento("crearFacultad").value);
  const carrera = sanitizarEntradaTexto(obtenerElemento("crearCarrera").value);
  const materia = sanitizarEntradaTexto(obtenerElemento("crearMateria").value);
  const fechaClase = sanitizarEntradaTexto(obtenerElemento("crearFechaClase").value);
  const horaIniciaClase = sanitizarEntradaTexto(obtenerElemento("crearHoraInicia").value);
  const horaTerminaClase = sanitizarEntradaTexto(obtenerElemento("crearHoraTermina").value);

  if (!docente || !facultad || !carrera || !materia || !fechaClase || !horaIniciaClase || !horaTerminaClase) {
    mostrarMensaje("mensajeCrear", "Debes completar los datos del formulario", true);
    return;
  }

  try {
    // Verificar duplicado antes de enviar
    const checkResp = await apiFetch("GET",
      `/check-duplicado?docente=${encodeURIComponent(docente)}&facultad=${encodeURIComponent(facultad)}&carrera=${encodeURIComponent(carrera)}&materia=${encodeURIComponent(materia)}`
    );
    if (checkResp.datos.existe) {
      mostrarMensaje("mensajeCrear", "El horario ya existe.", true);
      return;
    }

    deshabilitarTemporalmente(["btnGuardarCrear", "btnCancelarCrear"], 3000);

    const resultado = await apiFetch("POST", "", {
      docente, facultad, carrera, materia,
      fechaClase, horaIniciaClase, horaTerminaClase,
    });

    if (resultado.datos.ok) {
      mostrarMensaje("mensajeCrear", "Registro creado.", false);
      setTimeout(function() {
        limpiarFormulario("crear");
        mostrarVistaMenu();
      }, 2000);
    } else if (resultado.datos.errores) {
      mostrarMensaje("mensajeCrear", resultado.datos.errores.join(" | "), true);
    } else {
      mostrarMensaje("mensajeCrear", resultado.datos.mensaje || "Error al crear.", true);
    }
  } catch (err) {
    mostrarMensaje("mensajeCrear", "Error de conexion con el servidor.", true);
  }
}

// ──────────────────────────────────────────────────────────────
// CRUD: BUSCAR PARA EDITAR
// ──────────────────────────────────────────────────────────────
async function ejecutarBuscarParaEditar() {
  limpiarMensaje("mensajeEditar");
  estadoApp.horarioCargado = false;
  estadoApp.idHorarioCargado = null;

  const idRaw = obtenerElemento("editarIdBuscar").value;
  const idHorario = sanitizarEntradaId(idRaw);

  if (!idHorario) {
    mostrarMensaje("mensajeEditar", "Debe digitar el ID a buscar.", true);
    return;
  }

  try {
    const resultado = await apiFetch("GET", `/byidHorario?idHorario=${idHorario}`);

    if (!resultado.datos.ok) {
      mostrarMensaje("mensajeEditar", resultado.datos.mensaje || "El horario no existe.", true);
      return;
    }

    const h = resultado.datos.horario;

    // Cargar datos en el formulario
    obtenerElemento("editarDocente").value = h.docente;
    obtenerElemento("editarFechaClase").value = h.fechaClase ? h.fechaClase.substring(0, 10) : "";
    obtenerElemento("editarHoraInicia").value = h.horaIniciaClase ? h.horaIniciaClase.substring(0, 5) : "";
    obtenerElemento("editarHoraTermina").value = h.horaTerminaClase ? h.horaTerminaClase.substring(0, 5) : "";

    // Cargar selects encadenados
    cargarFacultades("editar");
    seleccionarEnSelect("editarFacultad", h.facultad);
    actualizarCarreras("editar");
    seleccionarEnSelect("editarCarrera", h.carrera);
    actualizarMaterias("editar");
    seleccionarEnSelect("editarMateria", h.materia);

    estadoApp.horarioCargado = true;
    estadoApp.idHorarioCargado = h.idHorario;

    mostrarMensaje("mensajeEditar", "Horario cargado.", false);
  } catch (err) {
    mostrarMensaje("mensajeEditar", "Error de conexion con el servidor.", true);
  }
}

// ──────────────────────────────────────────────────────────────
// CRUD: EDITAR HORARIO
// ──────────────────────────────────────────────────────────────
async function ejecutarEditarHorario() {
  limpiarMensaje("mensajeEditar");

  if (!estadoApp.horarioCargado || !estadoApp.idHorarioCargado) {
    mostrarMensaje("mensajeEditar", "Debe buscar un horario existente para editar.", true);
    return;
  }

  const confirmacion = confirm("¿Esta seguro de Editar el registro?");
  if (!confirmacion) {
    limpiarFormulario("editar");
    cargarFacultades("editar");
    estadoApp.horarioCargado = false;
    return;
  }

  const docente = sanitizarEntradaTexto(obtenerElemento("editarDocente").value);
  const facultad = sanitizarEntradaTexto(obtenerElemento("editarFacultad").value);
  const carrera = sanitizarEntradaTexto(obtenerElemento("editarCarrera").value);
  const materia = sanitizarEntradaTexto(obtenerElemento("editarMateria").value);
  const fechaClase = sanitizarEntradaTexto(obtenerElemento("editarFechaClase").value);
  const horaIniciaClase = sanitizarEntradaTexto(obtenerElemento("editarHoraInicia").value);
  const horaTerminaClase = sanitizarEntradaTexto(obtenerElemento("editarHoraTermina").value);

  if (!docente || !facultad || !carrera || !materia || !fechaClase || !horaIniciaClase || !horaTerminaClase) {
    mostrarMensaje("mensajeEditar", "Debes completar los datos del formulario", true);
    return;
  }

  try {
    deshabilitarTemporalmente(["btnConfirmarEditar", "btnCancelarEditar"], 3000);

    const resultado = await apiFetch("PUT", `/${estadoApp.idHorarioCargado}`, {
      docente, facultad, carrera, materia,
      fechaClase, horaIniciaClase, horaTerminaClase,
    });

    if (resultado.datos.ok) {
      mostrarMensaje("mensajeEditar", "Horario editado.", false);
      setTimeout(function() {
        limpiarFormulario("editar");
        cargarFacultades("editar");
        estadoApp.horarioCargado = false;
        estadoApp.idHorarioCargado = null;
      }, 2000);
    } else if (resultado.datos.errores) {
      mostrarMensaje("mensajeEditar", resultado.datos.errores.join(" | "), true);
    } else {
      mostrarMensaje("mensajeEditar", resultado.datos.mensaje || "Error al editar.", true);
    }
  } catch (err) {
    mostrarMensaje("mensajeEditar", "Error de conexion con el servidor.", true);
  }
}

// ──────────────────────────────────────────────────────────────
// CRUD: BUSCAR PARA BORRAR
// ──────────────────────────────────────────────────────────────
async function ejecutarBuscarParaBorrar() {
  limpiarMensaje("mensajeBorrar");
  estadoApp.horarioCargado = false;
  estadoApp.idHorarioCargado = null;

  const idRaw = obtenerElemento("borrarIdBuscar").value;
  const idHorario = sanitizarEntradaId(idRaw);

  if (!idHorario) {
    mostrarMensaje("mensajeBorrar", "Debe digitar el ID a buscar.", true);
    return;
  }

  try {
    const resultado = await apiFetch("GET", `/byidHorario?idHorario=${idHorario}`);

    if (!resultado.datos.ok) {
      mostrarMensaje("mensajeBorrar", resultado.datos.mensaje || "El horario no existe.", true);
      return;
    }

    const h = resultado.datos.horario;
    obtenerElemento("borrarDocente").value = h.docente;
    obtenerElemento("borrarFacultad").value = h.facultad;
    obtenerElemento("borrarCarrera").value = h.carrera;
    obtenerElemento("borrarMateria").value = h.materia;
    obtenerElemento("borrarFechaClase").value = h.fechaClase ? h.fechaClase.substring(0, 10) : "";
    obtenerElemento("borrarHoraInicia").value = h.horaIniciaClase ? h.horaIniciaClase.substring(0, 5) : "";
    obtenerElemento("borrarHoraTermina").value = h.horaTerminaClase ? h.horaTerminaClase.substring(0, 5) : "";

    estadoApp.horarioCargado = true;
    estadoApp.idHorarioCargado = h.idHorario;

    mostrarMensaje("mensajeBorrar", "Horario cargado.", false);
  } catch (err) {
    mostrarMensaje("mensajeBorrar", "Error de conexion con el servidor.", true);
  }
}

// ──────────────────────────────────────────────────────────────
// CRUD: BORRAR HORARIO
// ──────────────────────────────────────────────────────────────
async function ejecutarBorrarHorario() {
  limpiarMensaje("mensajeBorrar");

  const idRaw = obtenerElemento("borrarIdBuscar").value;
  const idHorario = sanitizarEntradaId(idRaw);

  if (!idHorario) {
    mostrarMensaje("mensajeBorrar", "El Horario no puede estar vacio.", true);
    return;
  }

  if (!estadoApp.horarioCargado || !estadoApp.idHorarioCargado) {
    mostrarMensaje("mensajeBorrar", "Debe buscar una identificacion existente antes de eliminar.", true);
    return;
  }

  const confirmacion = confirm("¿Esta seguro de Borrar el registro?");
  if (!confirmacion) {
    limpiarFormulario("borrar");
    estadoApp.horarioCargado = false;
    return;
  }

  try {
    deshabilitarTemporalmente(["btnConfirmarBorrar", "btnCancelarBorrar"], 3000);

    const resultado = await apiFetch("DELETE", "/by-idHorario", {
      idHorario: estadoApp.idHorarioCargado,
    });

    if (resultado.datos.ok) {
      mostrarMensaje("mensajeBorrar", "Horario borrado.", false);
      setTimeout(function() {
        limpiarFormulario("borrar");
        estadoApp.horarioCargado = false;
        estadoApp.idHorarioCargado = null;
      }, 2000);
    } else {
      mostrarMensaje("mensajeBorrar", resultado.datos.mensaje || "Error al borrar.", true);
    }
  } catch (err) {
    mostrarMensaje("mensajeBorrar", "Error de conexion con el servidor.", true);
  }
}

// ──────────────────────────────────────────────────────────────
// LISTADO DE HORARIOS
// ──────────────────────────────────────────────────────────────
async function ejecutarListado() {
  const resumen = obtenerElemento("resumenListado");
  const contenedorTabla = obtenerElemento("tablaListadoContenedor");
  const selOrden = obtenerElemento("selOrdenarPor");
  const inputQ = obtenerElemento("inputBusqueda");
  const btnBuscar = obtenerElemento("btnBuscarListado");

  // Deshabilitar controles durante carga
  selOrden.disabled = true;
  inputQ.disabled = true;
  btnBuscar.disabled = true;

  resumen.textContent = "Cargando...";
  contenedorTabla.innerHTML = "";

  const ordenarPor = sanitizarEntradaTexto(selOrden.value) || "idHorario";
  const busqueda = sanitizarEntradaTexto(inputQ.value);

  try {
    let ruta = `/list?orderBy=${encodeURIComponent(ordenarPor)}`;
    if (busqueda) ruta += `&q=${encodeURIComponent(busqueda)}`;

    const resultado = await apiFetch("GET", ruta);

    if (!resultado.datos.ok) {
      resumen.textContent = resultado.datos.mensaje || "Error al cargar listado.";
      return;
    }

    const lista = resultado.datos.horarios || [];
    resumen.textContent = `Registros: ${lista.length}`;

    if (lista.length === 0) {
      contenedorTabla.innerHTML = "<p>No se encontraron registros.</p>";
      return;
    }

    // Construir tabla
    let html = "<table id='tablaHorarios' border='1' cellpadding='6' cellspacing='0'>";
    html += "<thead><tr>";
    html += "<th>ID</th><th>Docente</th><th>Facultad</th><th>Carrera</th>";
    html += "<th>Materia</th><th>Fecha Clase</th><th>Hora Inicia</th><th>Hora Termina</th>";
    html += "</tr></thead><tbody>";

    lista.forEach(function(reg) {
      const fecha = reg.fechaClase ? String(reg.fechaClase).substring(0, 10) : "";
      const hInicia = reg.horaIniciaClase ? String(reg.horaIniciaClase).substring(0, 5) : "";
      const hTermina = reg.horaTerminaClase ? String(reg.horaTerminaClase).substring(0, 5) : "";
      html += `<tr>
        <td>${reg.idHorario}</td>
        <td>${reg.docente}</td>
        <td>${reg.facultad}</td>
        <td>${reg.carrera}</td>
        <td>${reg.materia}</td>
        <td>${fecha}</td>
        <td>${hInicia}</td>
        <td>${hTermina}</td>
      </tr>`;
    });

    html += "</tbody></table>";
    contenedorTabla.innerHTML = html;

  } catch (err) {
    resumen.textContent = "Error de conexion con el servidor.";
  } finally {
    selOrden.disabled = false;
    inputQ.disabled = false;
    btnBuscar.disabled = false;
  }
}

// ──────────────────────────────────────────────────────────────
// SOPORTE ENTER EN BÚSQUEDA DEL LISTADO
// ──────────────────────────────────────────────────────────────
function configurarEventosBusqueda() {
  document.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && estadoApp.vistaActual === "listado") {
      ejecutarListado();
    }
  });
}

// ──────────────────────────────────────────────────────────────
// ESTILOS INLINE (HTML + JS puro, sin CSS externo ni frameworks)
// ──────────────────────────────────────────────────────────────
function aplicarEstilos() {
  const estilos = document.createElement("style");
  estilos.textContent = `
    body {
      font-family: monospace;
      background-color: #4a4aef;
      color: #000000;
      margin: 0;
      padding: 0;
    }
    #cabeceraApp {
      background-color: #000000;
      color: #ffffff;
      padding: 16px 24px;
      border-bottom: 4px solid #003366; // #ffcc00
       
    }
    #tituloPrincipal {
      margin: 0;
      font-size: 1.4em;
      letter-spacing: 1px;
    }
    #subtituloApp {
      margin: 4px 0 0 0;
      font-size: 0.9em;
      color: #ffffff;
    }
    #areaPrincipal {
      padding: 24px;
      max-width: 860px;
      margin: 0 auto;
    }
    h2 {
      border-bottom: 2px solid #000000;
      padding-bottom: 6px;
      margin-top: 0;
      font-size: 1.2em;
      color: #ffffff;
    }
    #guiaMenu {
      font-style: italic;
      color: #ffffff;
    }
    #botonesMenu button {
      display: block;
      width: 220px;
      margin: 8px auto;
      padding: 10px;
      font-size: 1em;
      font-family: monospace;
      background-color: #000000;
      color: #ffffff;
      border: none;
      cursor: pointer;
    }
    #botonesMenu button:hover {
      background-color: #000000;
    }
    .campoForm {
      margin-bottom: 10px;
    }
    .campoForm label {
      display: inline-block;
      width: 200px;
      font-weight: bold;
      vertical-align: top;
      padding-top: 4px;
    }
    .campoForm input,
    .campoForm select {
      font-family: monospace;
      font-size: 0.95em;
      padding: 4px 6px;
      border: 1px solid #999999;
      width: 300px;
    }
    .campoForm input[readonly] {
      background-color: #ffffff;
      color: #555555;
    }
    .campoForm button {
      font-family: monospace;
      padding: 4px 12px;
      margin-left: 6px;
      background-color: #555555;
      color: #ffffff;
      border: none;
      cursor: pointer;
    }
    .areaMensaje {
      margin: 10px 0;
      min-height: 20px;
      font-weight: bold;
      font-size: 0.95em;
    }
    .botonesAccion button {
      font-family: monospace;
      font-size: 1em;
      padding: 8px 20px;
      margin-right: 10px;
      cursor: pointer;
      border: none;
    }
    .botonesAccion button:first-child {
      background-color: #000000;
      color: #ffffff;
    }
    .botonesAccion button:last-child {
      background-color: #888888;
      color: #ffffff;
    }
    .botonesAccion button:disabled {
      background-color: #ffffff;
      color: #888888;
      cursor: not-allowed;
    }
    #controlesListado {
      margin-bottom: 14px;
    }
    #controlesListado label {
      font-weight: bold;
      margin-right: 4px;
    }
    #controlesListado select,
    #controlesListado input {
      font-family: monospace;
      padding: 4px;
      margin-right: 8px;
    }
    #controlesListado button {
      font-family: monospace;
      padding: 4px 12px;
      background-color: #003366;
      color: #ffffff;
      border: none;
      cursor: pointer;
      margin-right: 6px;
    }
    #resumenListado {
      font-weight: bold;
      margin-bottom: 10px;
      color: #003366;
    }
    #tablaHorarios {
      border-collapse: collapse;
      width: 100%;
      font-size: 0.88em;
    }
    #tablaHorarios thead {
      background-color: #000000;
      color: #ffffff;
    }
    #tablaHorarios tbody tr:nth-child(even) {
      background-color: #ffffff;
    }
    #tablaHorarios td, #tablaHorarios th {
      padding: 6px 8px;
      text-align: left;
    }
    #vistaSalir p {
      font-size: 1.1em;
      margin-bottom: 16px;
    }
    #btnVolverMenu {
      font-family: monospace;
      padding: 8px 20px;
      background-color: #000000;
      color: #ffffff;
      border: none;
      cursor: pointer;
    }
    #piePagina {
      margin-top: 40px;
      padding: 12px 24px;
      background-color: #000000;
      color: #ffffff;
      font-size: 0.8em;
      text-align: center;
    }
  `;
  document.head.appendChild(estilos);
}

// ──────────────────────────────────────────────────────────────
// PUNTO DE ENTRADA
// ──────────────────────────────────────────────────────────────
(function iniciarApp() {
  aplicarEstilos();
  construirEstructuraBase();
  configurarEventosBusqueda();
  mostrarVistaMenu();
})();
