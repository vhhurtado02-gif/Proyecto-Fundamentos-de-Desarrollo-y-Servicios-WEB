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
let ordenTabla = { campo: null, asc: true };
let configPermisos = { permitir_crear: true, permitir_borrar: true, permitir_editar: true };

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
        <p id="guiaMenu">Selecciona una opción del menú.</p>
        <div id="avisoSoloLectura" style="display:none;background:#8b1a1a;color:#fff;padding:8px 12px;margin-bottom:12px;font-weight:bold;border-radius:4px;border:1px solid #cc3333;">🔒 Modo solo lectura — No se permiten cambios.</div>
        <div id="botonesMenu">
          <button id="btnCrear" onclick="mostrarVistaCrear()">Crear horario</button>
          <button id="btnEditar" onclick="mostrarVistaEditar()">Editar horario</button>
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
      <div id="vistaEditar" style="display:none;">
        <h2>Editar Horario</h2>
        <div class="campoForm"><label>ID Horario:</label><input type="number" id="editarId" min="1" placeholder="Ingrese el ID a editar" /></div>
        <button onclick="cargarHorarioParaEditar()" style="font-family:monospace;padding:6px 16px;background:#1e3a5f;color:#fff;border:1px solid #2d5a8e;cursor:pointer;margin-bottom:12px;">Cargar</button>
        <div id="editarCampos" style="display:none;">
          <div class="campoForm"><label>Docente:</label><input type="text" id="editarDocente" maxlength="150" /></div>
          <div class="campoForm"><label>Facultad:</label><select id="editarFacultad" onchange="actualizarCarreras('editar')"><option value="">-- Seleccione --</option></select></div>
          <div class="campoForm"><label>Carrera:</label><select id="editarCarrera" onchange="actualizarMaterias('editar')"><option value="">-- Seleccione --</option></select></div>
          <div class="campoForm"><label>Materia:</label><select id="editarMateria"><option value="">-- Seleccione --</option></select></div>
          <div class="campoForm"><label>Fecha Clase:</label><input type="date" id="editarFechaClase" /></div>
          <div class="campoForm"><label>Hora Inicio:</label><input type="time" id="editarHoraInicia" /></div>
          <div class="campoForm"><label>Hora Termina:</label><input type="time" id="editarHoraTermina" /></div>
        </div>
        <div id="mensajeEditar" class="areaMensaje"></div>
        <div class="botonesAccion">
          <button onclick="ejecutarEditarHorario()">Guardar cambios</button>
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
          <select id="selectCampoBusqueda" onchange="ejecutarListado()"><option value="todos">Todos</option><option value="idHorario">ID</option><option value="docente">Docente</option><option value="facultad">Facultad</option><option value="carrera">Carrera</option><option value="materia">Materia</option><option value="fechaClase">Fecha</option><option value="horaIniciaClase">Inicia</option><option value="horaTerminaClase">Termina</option></select>
          <input type="text" id="inputBusqueda" placeholder="Texto a buscar..." oninput="ejecutarListado()" />
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
    <div id="piePagina"><p>HorariosDocenteApp | CIAF | Programación y Servicios WEB IV SEMESTRE</p><p><h2>VHHM</h2></p></div>
  `;
}

function ocultarTodasLasVistas() {
  ["vistaMenu","vistaCrear","vistaEditar","vistaBorrar","vistaListado","vistaSalir"].forEach(function(v) {
    const el = obtenerElemento(v); if (el) el.style.display = "none";
  });
}

function aplicarEstadoBotones(config) {
  configPermisos = config;
  const btnCrear = obtenerElemento("btnCrear");
  const btnEditar = obtenerElemento("btnEditar");
  const btnBorrar = obtenerElemento("btnBorrar");
  const aviso = obtenerElemento("avisoSoloLectura");
  if (btnCrear) btnCrear.style.display = config.permitir_crear ? "block" : "none";
  if (btnEditar) btnEditar.style.display = config.permitir_editar ? "block" : "none";
  if (btnBorrar) btnBorrar.style.display = config.permitir_borrar ? "block" : "none";
  const soloLectura = !config.permitir_crear && !config.permitir_editar && !config.permitir_borrar;
  if (aviso) aviso.style.display = soloLectura ? "block" : "none";
}

async function mostrarVistaMenu() {
  ocultarTodasLasVistas(); obtenerElemento("vistaMenu").style.display = "block"; estadoApp.vistaActual = "menu";
  try {
    const r = await apiFetch("GET", "", null);
    if (r.datos && r.datos.config) aplicarEstadoBotones(r.datos.config);
  } catch(e) {}
}
function obtenerFechaHoy() { return new Date().toISOString().split("T")[0]; }
function limpiarFormularioCrear() {
  obtenerElemento("crearDocente").value = "";
  obtenerElemento("crearFacultad").innerHTML = '<option value="">-- Seleccione facultad --</option>';
  obtenerElemento("crearCarrera").innerHTML = '<option value="">-- Seleccione carrera --</option>';
  obtenerElemento("crearMateria").innerHTML = '<option value="">-- Seleccione materia --</option>';
  const campoFecha = obtenerElemento("crearFechaClase");
  campoFecha.value = ""; campoFecha.min = obtenerFechaHoy();
  obtenerElemento("crearHoraInicia").value = "";
  obtenerElemento("crearHoraTermina").value = "";
  limpiarMensaje("mensajeCrear");
}
function limpiarFormularioEditar() {
  obtenerElemento("editarId").value = "";
  obtenerElemento("editarDocente").value = "";
  obtenerElemento("editarFacultad").innerHTML = '<option value="">-- Seleccione facultad --</option>';
  obtenerElemento("editarCarrera").innerHTML = '<option value="">-- Seleccione carrera --</option>';
  obtenerElemento("editarMateria").innerHTML = '<option value="">-- Seleccione materia --</option>';
  obtenerElemento("editarFechaClase").value = "";
  obtenerElemento("editarHoraInicia").value = "";
  obtenerElemento("editarHoraTermina").value = "";
  obtenerElemento("editarCampos").style.display = "none";
  estadoApp.idHorarioCargado = null;
  limpiarMensaje("mensajeEditar");
}
function limpiarFormularioBorrar() { obtenerElemento("borrarId").value = ""; limpiarMensaje("mensajeBorrar"); }
function mostrarVistaCrear() { ocultarTodasLasVistas(); limpiarFormularioCrear(); cargarFacultades("crear"); obtenerElemento("vistaCrear").style.display = "block"; estadoApp.vistaActual = "crear"; }
function mostrarVistaEditar() { ocultarTodasLasVistas(); limpiarFormularioEditar(); obtenerElemento("vistaEditar").style.display = "block"; estadoApp.vistaActual = "editar"; }
function mostrarVistaBorrar() { ocultarTodasLasVistas(); limpiarFormularioBorrar(); obtenerElemento("vistaBorrar").style.display = "block"; estadoApp.vistaActual = "borrar"; }
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

function hayConflictoHorario(lista, docente, fechaClase, horaInicia, horaTermina, idExcluir) {
  const toMin = function(h) { const p = String(h).substring(0,5).split(":"); return parseInt(p[0],10)*60+parseInt(p[1],10); };
  const inicioNuevo = toMin(horaInicia); const finNuevo = toMin(horaTermina);
  return lista.some(function(h) {
    if (idExcluir && h.idHorario == idExcluir) return false;
    if (String(h.docente).toLowerCase().trim() !== String(docente).toLowerCase().trim()) return false;
    if (String(h.fechaClase).substring(0,10) !== String(fechaClase).substring(0,10)) return false;
    const inicioExiste = toMin(h.horaIniciaClase); const finExiste = toMin(h.horaTerminaClase);
    return inicioNuevo < finExiste && finNuevo > inicioExiste;
  });
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
    const chk = await apiFetch("GET","",null);
    if (chk.datos.ok && hayConflictoHorario(chk.datos.datos||[], docente, fechaClase, horaIniciaClase, horaTerminaClase, null)) {
      mostrarMensaje("mensajeCrear","Este docente ya tiene una clase en ese horario y fecha.",true); return;
    }
    const r = await apiFetch("POST","",{docente,facultad,carrera,materia,fechaClase,horaIniciaClase,horaTerminaClase});
    if (r.datos.ok) { mostrarMensaje("mensajeCrear","Horario creado correctamente.",false); setTimeout(mostrarVistaMenu,2000); }
    else { mostrarMensaje("mensajeCrear",r.datos.mensaje||"Error al crear.",true); }
  } catch(e) { mostrarMensaje("mensajeCrear","Error de conexion con el servidor.",true); }
}

async function cargarHorarioParaEditar() {
  limpiarMensaje("mensajeEditar");
  const id = parseInt(obtenerElemento("editarId").value, 10);
  if (!id||id<=0) { mostrarMensaje("mensajeEditar","Ingresa un ID válido.",true); return; }
  try {
    const r = await apiFetch("GET","",null);
    if (!r.datos.ok) { mostrarMensaje("mensajeEditar","Error al buscar.",true); return; }
    const h = (r.datos.datos||[]).find(function(x){ return x.idHorario == id; });
    if (!h) { mostrarMensaje("mensajeEditar","No se encontró un horario con ese ID.",true); return; }
    cargarFacultades("editar");
    obtenerElemento("editarDocente").value = h.docente;
    obtenerElemento("editarFacultad").value = h.facultad;
    actualizarCarreras("editar");
    obtenerElemento("editarCarrera").value = h.carrera;
    actualizarMaterias("editar");
    obtenerElemento("editarMateria").value = h.materia;
    const campoFechaEditar = obtenerElemento("editarFechaClase"); campoFechaEditar.min = obtenerFechaHoy(); campoFechaEditar.value = String(h.fechaClase).substring(0,10);
    obtenerElemento("editarHoraInicia").value = String(h.horaIniciaClase).substring(0,5);
    obtenerElemento("editarHoraTermina").value = String(h.horaTerminaClase).substring(0,5);
    obtenerElemento("editarCampos").style.display = "block";
    estadoApp.idHorarioCargado = id;
    mostrarMensaje("mensajeEditar","Horario cargado. Modifica los campos y guarda.",false);
  } catch(e) { mostrarMensaje("mensajeEditar","Error de conexion con el servidor.",true); }
}

async function ejecutarEditarHorario() {
  limpiarMensaje("mensajeEditar");
  const id = estadoApp.idHorarioCargado;
  if (!id) { mostrarMensaje("mensajeEditar","Primero carga un horario.",true); return; }
  const docente = sanitizarTexto(obtenerElemento("editarDocente").value);
  const facultad = sanitizarTexto(obtenerElemento("editarFacultad").value);
  const carrera = sanitizarTexto(obtenerElemento("editarCarrera").value);
  const materia = sanitizarTexto(obtenerElemento("editarMateria").value);
  const fechaClase = sanitizarTexto(obtenerElemento("editarFechaClase").value);
  const horaIniciaClase = sanitizarTexto(obtenerElemento("editarHoraInicia").value);
  const horaTerminaClase = sanitizarTexto(obtenerElemento("editarHoraTermina").value);
  if (!docente||!facultad||!carrera||!materia||!fechaClase||!horaIniciaClase||!horaTerminaClase) {
    mostrarMensaje("mensajeEditar","Debes completar todos los campos.",true); return;
  }
  try {
    const chk = await apiFetch("GET","",null);
    if (chk.datos.ok && hayConflictoHorario(chk.datos.datos||[], docente, fechaClase, horaIniciaClase, horaTerminaClase, id)) {
      mostrarMensaje("mensajeEditar","Este docente ya tiene una clase en ese horario y fecha.",true); return;
    }
    const r = await apiFetch("PUT","?id="+id,{docente,facultad,carrera,materia,fechaClase,horaIniciaClase,horaTerminaClase});
    if (r.datos.ok) { mostrarMensaje("mensajeEditar","Horario actualizado correctamente.",false); setTimeout(mostrarVistaMenu,2000); }
    else { mostrarMensaje("mensajeEditar",r.datos.mensaje||"Error al actualizar.",true); }
  } catch(e) { mostrarMensaje("mensajeEditar","Error de conexion con el servidor.",true); }
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

function ordenarPorCampo(campo) {
  if (ordenTabla.campo === campo) { ordenTabla.asc = !ordenTabla.asc; } else { ordenTabla.campo = campo; ordenTabla.asc = true; }
  ejecutarListado();
}

async function ejecutarListado() {
  const resumen = obtenerElemento("resumenListado"); const contenedor = obtenerElemento("tablaListadoContenedor");
  const busqueda = (obtenerElemento("inputBusqueda").value||"").toLowerCase().trim();
  const campoBusqueda = (obtenerElemento("selectCampoBusqueda") && obtenerElemento("selectCampoBusqueda").value) || "todos";
  resumen.textContent = "Cargando..."; contenedor.innerHTML = "";
  try {
    const r = await apiFetch("GET","",null);
    if (!r.datos.ok) { resumen.textContent = "Error al cargar."; return; }
    if (r.datos.config) aplicarEstadoBotones(r.datos.config);
    let lista = r.datos.datos||[];
    if (busqueda) lista = lista.filter(function(h){
      if (campoBusqueda === "todos") return (String(h.idHorario)+h.docente+h.facultad+h.carrera+h.materia+String(h.fechaClase)+String(h.horaIniciaClase)+String(h.horaTerminaClase)).toLowerCase().includes(busqueda);
      return String(h[campoBusqueda]).toLowerCase().includes(busqueda);
    });
    if (ordenTabla.campo) {
      lista = lista.slice().sort(function(a, b) {
        if (["idHorario"].indexOf(ordenTabla.campo) !== -1) {
          const na = parseFloat(a[ordenTabla.campo])||0; const nb = parseFloat(b[ordenTabla.campo])||0;
          return ordenTabla.asc ? na-nb : nb-na;
        }
        const va = String(a[ordenTabla.campo]||"").toLowerCase(); const vb = String(b[ordenTabla.campo]||"").toLowerCase();
        if (va<vb) return ordenTabla.asc?-1:1; if (va>vb) return ordenTabla.asc?1:-1; return 0;
      });
    }
    resumen.textContent = "Registros: "+lista.length;
    if (lista.length===0) { contenedor.innerHTML = "<p>No se encontraron registros.</p>"; return; }
    const cols = [
      {label:"ID",campo:"idHorario"},{label:"Docente",campo:"docente"},{label:"Facultad",campo:"facultad"},
      {label:"Carrera",campo:"carrera"},{label:"Materia",campo:"materia"},{label:"Fecha",campo:"fechaClase"},
      {label:"Inicia",campo:"horaIniciaClase"},{label:"Termina",campo:"horaTerminaClase"},
    ];
    let html = "<table id='tablaHorarios' border='1' cellpadding='6' cellspacing='0'><thead><tr>";
    cols.forEach(function(col) {
      const activo = ordenTabla.campo===col.campo;
      const flecha = activo?(ordenTabla.asc?" ▲":" ▼"):" ⇅";
      html += "<th class='thOrdenable"+(activo?" thActivo":"")+"' onclick='ordenarPorCampo(\""+col.campo+"\")'>"+ col.label+"<span class='flechaOrden'>"+flecha+"</span></th>";
    });
    html += "</tr></thead><tbody>";
    lista.forEach(function(h){ html += "<tr><td>"+h.idHorario+"</td><td>"+h.docente+"</td><td>"+h.facultad+"</td><td>"+h.carrera+"</td><td>"+h.materia+"</td><td>"+String(h.fechaClase).substring(0,10)+"</td><td>"+String(h.horaIniciaClase).substring(0,5)+"</td><td>"+String(h.horaTerminaClase).substring(0,5)+"</td></tr>"; });
    html += "</tbody></table>"; contenedor.innerHTML = html;
  } catch(e) { resumen.textContent = "Error de conexion con el servidor."; }
}

function aplicarEstilos() {
  const s = document.createElement("style");
  s.textContent = `body{font-family:monospace;background-color:#0a1628;color:#e0e6f0;margin:0;padding:0}#cabeceraApp{background:#020810;color:#fff;padding:16px 24px;border-bottom:2px solid #1e3a5f}#tituloPrincipal{margin:0;font-size:1.4em;color:#4a9eff}#subtituloApp{margin:4px 0 0;font-size:.9em;color:#8ab4d4}#areaPrincipal{padding:16px;max-width:860px;margin:0 auto;box-sizing:border-box}h2{border-bottom:2px solid #1e3a5f;padding-bottom:6px;margin-top:0;font-size:1.2em;color:#4a9eff}#guiaMenu{font-style:italic;color:#8ab4d4}#botonesMenu button{display:block;width:100%;max-width:280px;margin:8px auto;padding:12px;font-size:1em;font-family:monospace;background:#1e3a5f;color:#fff;border:1px solid #2d5a8e;cursor:pointer;box-sizing:border-box}#botonesMenu button:hover{background:#2d5a8e}.campoForm{margin-bottom:12px;display:flex;flex-wrap:wrap;align-items:flex-start;gap:4px}.campoForm label{font-weight:bold;width:100%;padding-top:0;color:#8ab4d4}.campoForm input,.campoForm select{font-family:monospace;font-size:.95em;padding:6px 8px;border:1px solid #2d5a8e;width:100%;box-sizing:border-box;background:#0d1f35;color:#e0e6f0}.areaMensaje{margin:10px 0;min-height:20px;font-weight:bold}.botonesAccion{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.botonesAccion button{font-family:monospace;font-size:1em;padding:10px 20px;cursor:pointer;border:none;flex:1 1 120px}.botonesAccion button:first-child{background:#1e3a5f;color:#fff;border:1px solid #2d5a8e}.botonesAccion button:first-child:hover{background:#2d5a8e}.botonesAccion button:last-child{background:#2a2a2a;color:#fff}#controlesListado{margin-bottom:14px;display:flex;flex-wrap:wrap;align-items:center;gap:6px}#controlesListado label{font-weight:bold;color:#8ab4d4}#controlesListado select{font-family:monospace;padding:5px;flex:1 1 100px;min-width:80px;background:#0d1f35;color:#e0e6f0;border:1px solid #2d5a8e}#controlesListado input{font-family:monospace;padding:5px;flex:2 1 150px;min-width:100px;background:#0d1f35;color:#e0e6f0;border:1px solid #2d5a8e}#controlesListado button{font-family:monospace;padding:5px 12px;background:#1e3a5f;color:#fff;border:1px solid #2d5a8e;cursor:pointer;white-space:nowrap}#controlesListado button:hover{background:#2d5a8e}#resumenListado{font-weight:bold;margin-bottom:10px;color:#4a9eff}#tablaListadoContenedor{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}#tablaHorarios{border-collapse:collapse;width:100%;font-size:.85em;min-width:520px}#tablaHorarios thead{background:#1e3a5f;color:#fff}#tablaHorarios tbody tr{background:#0d1f35;color:#e0e6f0}#tablaHorarios tbody tr:nth-child(even){background:#112240}#tablaHorarios tbody tr:hover{background:#1a3050}#tablaHorarios td,#tablaHorarios th{padding:6px 8px;text-align:left;white-space:nowrap;border:1px solid #1e3a5f}.thOrdenable{cursor:pointer;user-select:none}.thOrdenable:hover{background:#2d5a8e}.thActivo{background:#2d5a8e}.flechaOrden{margin-left:4px;font-size:.8em;opacity:.8}#piePagina{margin-top:40px;padding:12px 24px;background:#020810;color:#8ab4d4;font-size:.8em;text-align:center;border-top:2px solid #1e3a5f}#avisoSoloLectura{background:#8b1a1a;color:#fff;padding:8px 12px;margin-bottom:12px;font-weight:bold;border-radius:4px;border:1px solid #cc3333}@media(min-width:600px){#areaPrincipal{padding:24px}.campoForm{flex-wrap:nowrap;align-items:flex-start}.campoForm label{width:200px;flex-shrink:0;padding-top:6px}.campoForm input,.campoForm select{width:auto;flex:1}#botonesMenu button{width:220px}}@media(max-width:400px){#tituloPrincipal{font-size:1.1em}#tablaHorarios{font-size:.75em}#tablaHorarios td,#tablaHorarios th{padding:4px 5px}}`;
  document.head.appendChild(s);
}

async function actualizarPermisos() {
  try {
    const r = await apiFetch("GET", "", null);
    if (r.datos && r.datos.config) aplicarEstadoBotones(r.datos.config);
  } catch(e) {}
}

(async function iniciarApp() {
  aplicarEstilos();
  construirEstructuraBase();
  await mostrarVistaMenu();
  setInterval(actualizarPermisos, 5000);
})();
