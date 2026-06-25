"use strict";

const URL_API = "/api/horarios";

const DATOS_CIAF = {
  "Facultad de Ingeniería": {
    "Ingeniería de Sistemas": ["Programación y Servicios WEB","Bases de Datos","Redes y Comunicaciones","Ingeniería de Software","Sistemas Operativos","Algoritmos y Programación"],
    "Ingeniería Electrónica": ["Circuitos Eléctricos","Electrónica Analógica","Electrónica Digital","Microcontroladores","Telecomunicaciones"],
  },
  "Facultad de Ciencias Económicas": {
    "Administración de Empresas": ["Fundamentos de Administración","Contabilidad General","Economía General","Marketing Empresarial","Gestión Humana"],
    "Contaduría Pública": ["Contabilidad Financiera","Auditoría","Tributaria","Costos y Presupuestos","Revisoría Fiscal"],
  },
  "Facultad de Ciencias Jurídicas": {
    "Derecho": ["Derecho Civil","Derecho Comercial","Derecho Laboral","Derecho Penal","Derecho Constitucional"],
  },
  "Facultad de Ciencias de la Salud": {
    "Instrumentación Quirúrgica": ["Anatomía Humana","Fisiología","Técnicas Quirúrgicas","Esterilización","Bioseguridad"],
    "Regencia de Farmacia": ["Farmacología","Química Orgánica","Legislación Farmacéutica","Farmacovigilancia","Atención Farmacéutica"],
  },
};

const estadoApp = { vistaActual: "menu", idHorarioCargado: null };

function sanitizarTexto(v) { return !v ? "" : String(v).trim().replace(/[<>"'`;]/g,"").substring(0,255); }
function obtenerElemento(id) { return document.getElementById(id); }
function mostrarMensaje(id, txt, esError) {
  const el = obtenerElemento(id); if (!el) return;
  el.textContent = txt; el.style.color = esError ? "#ff0000" : "#05f305";
}
function limpiarMensaje(id) { const el = obtenerElemento(id); if (el) el.textContent = ""; }

async function apiFetch(metodo, ruta, cuerpo) {
  const opts = { method: metodo, headers: { "Content-Type": "application/json" } };
  if (cuerpo) opts.body = JSON.stringify(cuerpo);
  const resp = await fetch(URL_API + ruta, opts);
  const datos = await resp.json();
  return { estado: resp.status, datos };
}

let modoSoloLectura = false;

function construirEstructuraBase() {
  const c = obtenerElemento("contenedorPrincipal");
  c.innerHTML = `
    <div id="cabeceraApp">
      <h1 id="tituloPrincipal">CIAF - Administración de Horarios</h1>
      <p id="subtituloApp">Corporación Instituto de Administración y Finanzas</p>
    </div>
    <div id="areaPrincipal">
      <div id="vistaMenu">
        <h2>Menú Principal</h2>
        <p id="guiaMenu">Selecciona una opcion del menu.</p>
        <div id="avisoSoloLectura" style="display:none;background:#ff4444;color:#fff;padding:8px 12px;margin-bottom:12px;font-weight:bold;border-radius:4px;">🔒 Modo solo lectura — No se permiten cambios.</div>
        <div id="botonesMenu">
          <button id="btnCrear" onclick="mostrarVistaCrear()">Crear horario</button>
          <button id="btnBorrar" onclick="mostrarVistaBorrar()">Borrar horario</button>
          <button onclick="mostrarVistaListado()">Listado de horarios</button>
          <button onclick="mostrarVistaSalir()">Salir del programa</button>
        </div>
      </div>
      <div id="vistaCrear" style="display:none;">
        <h2>Crear Horario</h2>
        <div class="campoForm"><label>Docente:</label><input type="text" id="crearDocente" maxlength="150" /></div>
        <div class="campoForm"><label>Facultad:</label><select id="crearFacultad" onchange="actualizarCarreras('crear')"><option value="">-- Seleccione --</option></select></div>
        <div class="campoForm"><label>Carrera:</label><select id="crearCarrera" onchange="actualizarMaterias('crear')"><option value="">-- Seleccione --</option></select></div>
        <div class="campoForm"><label>Materia:</label><select id="crearMateria"><option value="">-- Seleccione --</option></select></div>
        <div class="campoForm"><label>Fecha Clase:</label><input type="date" id="crearFechaClase" /></div>
        <div class="campoForm"><label>Hora Inicio:</label><input type="time" id="crearHoraInicia" /></div>
        <div class="campoForm"><label>Hora Termina:</label><input type="time" id="crearHoraTermina" /></div>
        <div id="mensajeCrear" class="areaMensaje"></div>
        <div class="botonesAccion">
          <button onclick="ejecutarCrearHorario()">Guardar</button>
          <button onclick="mostrarVistaMenu()">Cancelar</button>
        </div>
      </div>
      <div id="vistaBorrar" style="display:none;">
        <h2>Borrar Horario</h2>
        <div class="campoForm"><label>ID Horario:</label><input type="number" id="borrarId" min="1" placeholder="Ingrese el ID" /></div>
        <div id="mensajeBorrar" class="areaMensaje"></div>
        <div class="botonesAccion">
          <button onclick="ejecutarBorrarHorario()">Eliminar</button>
          <button onclick="mostrarVistaMenu()">Cancelar</button>
        </div>
      </div>
      <div id="vistaListado" style="display:none;">
        <h2>Listado de Horarios</h2>
        <div id="controlesListado">
          <label>Búsqueda:</label>
          <select id="selectCampoBusqueda"><option value="todos">Todos</option><option value="idHorario">ID</option><option value="docente">Docente</option><option value="facultad">Facultad</option><option value="carrera">Carrera</option><option value="materia">Materia</option><option value="fechaClase">Fecha</option><option value="horaIniciaClase">Inicia</option><option value="horaTerminaClase">Termina</option></select><input type="text" id="inputBusqueda" placeholder="Texto a buscar..." />
          <button onclick="ejecutarListado()">Buscar</button>
          <button onclick="mostrarVistaMenu()">Cerrar</button>
        </div>
        <div id="resumenListado"></div>
        <div id="tablaListadoContenedor"></div>
      </div>
      <div id="vistaSalir" style="display:none;">
        <h2>Salir del Programa</h2>
        <p>Puede cerrar esta pestaña para finalizar.</p>
        <button onclick="mostrarVistaMenu()">Volver al menú</button>
      </div>
    </div>
    <div id="piePagina"><p>HorariosDocenteApp | CIAF | Programacion y Servicios WEB IV SEMESTRE</p></div>
  `;
}

function ocultarTodasLasVistas() {
  ["vistaMenu","vistaCrear","vistaBorrar","vistaListado","vistaSalir"].forEach(function(v) {
    const el = obtenerElemento(v); if (el) el.style.display = "none";
  });
}
async function mostrarVistaMenu() {
  ocultarTodasLasVistas(); obtenerElemento("vistaMenu").style.display = "block"; estadoApp.vistaActual = "menu";
  try {
    const r = await apiFetch("GET", "", null);
    if (r.datos && r.datos.config) {
      const btnCrear = obtenerElemento("btnCrear");
      const btnBorrar = obtenerElemento("btnBorrar");
      const aviso = obtenerElemento("avisoSoloLectura");
      if (btnCrear) btnCrear.style.display = r.datos.config.permitir_crear ? "block" : "none";
      if (btnBorrar) btnBorrar.style.display = r.datos.config.permitir_borrar ? "block" : "none";
      const soloLectura = !r.datos.config.permitir_crear && !r.datos.config.permitir_borrar;
      if (aviso) aviso.style.display = soloLectura ? "block" : "none";
    }
  } catch(e) {}
}
function mostrarVistaCrear() { ocultarTodasLasVistas(); cargarFacultades("crear"); obtenerElemento("vistaCrear").style.display = "block"; estadoApp.vistaActual = "crear"; }
function mostrarVistaBorrar() { ocultarTodasLasVistas(); obtenerElemento("vistaBorrar").style.display = "block"; estadoApp.vistaActual = "borrar"; }
function mostrarVistaSalir() { ocultarTodasLasVistas(); obtenerElemento("vistaSalir").style.display = "block"; }
function mostrarVistaListado() { ocultarTodasLasVistas(); obtenerElemento("vistaListado").style.display = "block"; estadoApp.vistaActual = "listado"; ejecutarListado(); }

function cargarFacultades(prefijo) {
  const sel = obtenerElemento(prefijo + "Facultad"); if (!sel) return;
  sel.innerHTML = '<option value="">-- Seleccione facultad --</option>';
  Object.keys(DATOS_CIAF).forEach(function(f) { const op = document.createElement("option"); op.value = f; op.textContent = f; sel.appendChild(op); });
}
function actualizarCarreras(prefijo) {
  const fac = obtenerElemento(prefijo + "Facultad").value;
  const selC = obtenerElemento(prefijo + "Carrera"); const selM = obtenerElemento(prefijo + "Materia");
  selC.innerHTML = '<option value="">-- Seleccione carrera --</option>'; selM.innerHTML = '<option value="">-- Seleccione materia --</option>';
  if (!fac || !DATOS_CIAF[fac]) return;
  Object.keys(DATOS_CIAF[fac]).forEach(function(c) { const op = document.createElement("option"); op.value = c; op.textContent = c; selC.appendChild(op); });
}
function actualizarMaterias(prefijo) {
  const fac = obtenerElemento(prefijo + "Facultad").value; const car = obtenerElemento(prefijo + "Carrera").value;
  const selM = obtenerElemento(prefijo + "Materia"); selM.innerHTML = '<option value="">-- Seleccione materia --</option>';
  const mats = DATOS_CIAF[fac] && DATOS_CIAF[fac][car]; if (!mats) return;
  mats.forEach(function(m) { const op = document.createElement("option"); op.value = m; op.textContent = m; selM.appendChild(op); });
}

async function ejecutarCrearHorario() {
  limpiarMensaje("mensajeCrear");
  const docente = sanitizarTexto(obtenerElemento("crearDocente").value);
  const facultad = sanitizarTexto(obtenerElemento("crearFacultad").value);
  const carrera = sanitizarTexto(obtenerElemento("crearCarrera").value);
  const materia = sanitizarTexto(obtenerElemento("crearMateria").value);
  const fechaClase = sanitizarTexto(obtenerElemento("crearFechaClase").value);
  const horaIniciaClase = sanitizarTexto(obtenerElemento("crearHoraInicia").value);
  const horaTerminaClase = sanitizarTexto(obtenerElemento("crearHoraTermina").value);
  if (!docente||!facultad||!carrera||!materia||!fechaClase||!horaIniciaClase||!horaTerminaClase) {
    mostrarMensaje("mensajeCrear","Debes completar todos los campos.",true); return;
  }
  try {
    const r = await apiFetch("POST","",{docente,facultad,carrera,materia,fechaClase,horaIniciaClase,horaTerminaClase});
    if (r.datos.ok) { mostrarMensaje("mensajeCrear","Horario creado correctamente.",false); setTimeout(mostrarVistaMenu,2000); }
    else { mostrarMensaje("mensajeCrear",r.datos.mensaje||"Error al crear.",true); }
  } catch(e) { mostrarMensaje("mensajeCrear","Error de conexion con el servidor.",true); }
}

async function ejecutarBorrarHorario() {
  limpiarMensaje("mensajeBorrar");
  const id = parseInt(obtenerElemento("borrarId").value,10);
  if (!id||id<=0) { mostrarMensaje("mensajeBorrar","Ingresa un ID válido.",true); return; }
  if (!confirm("¿Seguro que deseas eliminar el horario con ID "+id+"?")) return;
  try {
    const r = await apiFetch("DELETE","?id="+id,null);
    if (r.datos.ok) { mostrarMensaje("mensajeBorrar","Horario eliminado.",false); setTimeout(mostrarVistaMenu,2000); }
    else { mostrarMensaje("mensajeBorrar",r.datos.mensaje||"Error al eliminar.",true); }
  } catch(e) { mostrarMensaje("mensajeBorrar","Error de conexion con el servidor.",true); }
}

async function ejecutarListado() {
  const resumen = obtenerElemento("resumenListado"); const contenedor = obtenerElemento("tablaListadoContenedor");
  const busqueda = (obtenerElemento("inputBusqueda").value||"").toLowerCase().trim(); const campoBusqueda = (obtenerElemento("selectCampoBusqueda") && obtenerElemento("selectCampoBusqueda").value) || "todos";
  resumen.textContent = "Cargando..."; contenedor.innerHTML = "";
  try {
    const r = await apiFetch("GET","",null);
    if (!r.datos.ok) { resumen.textContent = "Error al cargar."; return; }
    // Detectar permisos desde la API
    if (r.datos.config) {
      modoSoloLectura = !r.datos.config.permitir_crear && !r.datos.config.permitir_borrar;
      const btnCrear = obtenerElemento("btnCrear");
      const btnBorrar = obtenerElemento("btnBorrar");
      const aviso = obtenerElemento("avisoSoloLectura");
      if (btnCrear) btnCrear.style.display = r.datos.config.permitir_crear ? "block" : "none";
      if (btnBorrar) btnBorrar.style.display = r.datos.config.permitir_borrar ? "block" : "none";
      const soloLectura = !r.datos.config.permitir_crear && !r.datos.config.permitir_borrar;
      if (aviso) aviso.style.display = soloLectura ? "block" : "none";
    }
    let lista = r.datos.datos||[];
    if (busqueda) lista = lista.filter(function(h){ if (campoBusqueda === "todos") return (String(h.idHorario)+h.docente+h.facultad+h.carrera+h.materia+String(h.fechaClase)+String(h.horaIniciaClase)+String(h.horaTerminaClase)).toLowerCase().includes(busqueda); return String(h[campoBusqueda]).toLowerCase().includes(busqueda); });
    resumen.textContent = "Registros: "+lista.length;
    if (lista.length===0) { contenedor.innerHTML = "<p>No se encontraron registros.</p>"; return; }
    let html = "<table id='tablaHorarios' border='1' cellpadding='6' cellspacing='0'><thead><tr><th>ID</th><th>Docente</th><th>Facultad</th><th>Carrera</th><th>Materia</th><th>Fecha</th><th>Inicia</th><th>Termina</th></tr></thead><tbody>";
    lista.forEach(function(h){ html += "<tr><td>"+h.idHorario+"</td><td>"+h.docente+"</td><td>"+h.facultad+"</td><td>"+h.carrera+"</td><td>"+h.materia+"</td><td>"+String(h.fechaClase).substring(0,10)+"</td><td>"+String(h.horaIniciaClase).substring(0,5)+"</td><td>"+String(h.horaTerminaClase).substring(0,5)+"</td></tr>"; });
    html += "</tbody></table>"; contenedor.innerHTML = html;
  } catch(e) { resumen.textContent = "Error de conexion con el servidor."; }
}

function aplicarEstilos() {
  const s = document.createElement("style");
  s.textContent = `body{font-family:monospace;background-color:#4a4aef;color:#000;margin:0;padding:0}#cabeceraApp{background:#000;color:#fff;padding:16px 24px}#tituloPrincipal{margin:0;font-size:1.4em}#subtituloApp{margin:4px 0 0;font-size:.9em;color:#fff}#areaPrincipal{padding:24px;max-width:860px;margin:0 auto}h2{border-bottom:2px solid #000;padding-bottom:6px;margin-top:0;font-size:1.2em;color:#fff}#guiaMenu{font-style:italic;color:#fff}#botonesMenu button{display:block;width:220px;margin:8px auto;padding:10px;font-size:1em;font-family:monospace;background:#000;color:#fff;border:none;cursor:pointer}.campoForm{margin-bottom:10px}.campoForm label{display:inline-block;width:200px;font-weight:bold;vertical-align:top;padding-top:4px}.campoForm input,.campoForm select{font-family:monospace;font-size:.95em;padding:4px 6px;border:1px solid #999;width:300px}.areaMensaje{margin:10px 0;min-height:20px;font-weight:bold}.botonesAccion button{font-family:monospace;font-size:1em;padding:8px 20px;margin-right:10px;cursor:pointer;border:none}.botonesAccion button:first-child{background:#000;color:#fff}.botonesAccion button:last-child{background:#888;color:#fff}#controlesListado{margin-bottom:14px}#controlesListado label{font-weight:bold;margin-right:4px}#controlesListado input{font-family:monospace;padding:4px;margin-right:8px}#controlesListado button{font-family:monospace;padding:4px 12px;background:#003366;color:#fff;border:none;cursor:pointer;margin-right:6px}#resumenListado{font-weight:bold;margin-bottom:10px;color:#003366}#tablaHorarios{border-collapse:collapse;width:100%;font-size:.88em}#tablaHorarios thead{background:#000;color:#fff}#tablaHorarios tbody tr:nth-child(even){background:#fff}#tablaHorarios td,#tablaHorarios th{padding:6px 8px;text-align:left}#piePagina{margin-top:40px;padding:12px 24px;background:#000;color:#fff;font-size:.8em;text-align:center}`;
  document.head.appendChild(s);
}

async function actualizarPermisos() {
  try {
    const r = await apiFetch("GET", "", null);
    if (r.datos && r.datos.config) {
      const btnCrear = obtenerElemento("btnCrear");
      const btnBorrar = obtenerElemento("btnBorrar");
      const aviso = obtenerElemento("avisoSoloLectura");
      if (btnCrear) btnCrear.style.display = r.datos.config.permitir_crear ? "block" : "none";
      if (btnBorrar) btnBorrar.style.display = r.datos.config.permitir_borrar ? "block" : "none";
      const soloLectura = !r.datos.config.permitir_crear && !r.datos.config.permitir_borrar;
      if (aviso) aviso.style.display = soloLectura ? "block" : "none";
    }
  } catch(e) {}
}

(async function iniciarApp() {
  aplicarEstilos();
  construirEstructuraBase();
  await mostrarVistaMenu();
  // Verificar permisos cada 5 segundos automáticamente
  setInterval(actualizarPermisos, 5000);
})();