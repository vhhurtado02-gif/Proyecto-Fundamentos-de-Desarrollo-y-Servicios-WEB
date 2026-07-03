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

function sanitizarTexto(v) { return !v ? "" : String(v).trim().replace(/[<>"\'`;]/g,"").substring(0,255); }
function obtenerElemento(id) { return document.getElementById(id); }

// ── Validacion de fecha: solo fecha actual o superior ──
function obtenerFechaHoy() {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");
  return yyyy + "-" + mm + "-" + dd;
}

function establecerFechaMinima(idCampo) {
  const campo = obtenerElemento(idCampo);
  if (campo) campo.min = obtenerFechaHoy();
}

function validarFechaNoPasada(fechaStr) {
  if (!fechaStr) return false;
  const hoy = obtenerFechaHoy();
  return fechaStr >= hoy;
}

// ── Sistema de Toast Notifications ──────────────────
let toastContenedor = null;

function crearContenedorToast() {
  if (toastContenedor) return;
  toastContenedor = document.createElement("div");
  toastContenedor.id = "toastContenedor";
  document.body.appendChild(toastContenedor);
}

function mostrarToast(mensaje, tipo) {
  crearContenedorToast();
  const toast = document.createElement("div");
  toast.className = "toast-item toast-" + (tipo || "info");
  const iconos = { exito: "✓", error: "✕", info: "ℹ", advertencia: "⚠" };
  const icono = iconos[tipo] || iconos.info;
  toast.innerHTML = '<span class="toast-icono">' + icono + '</span><span class="toast-texto">' + mensaje + '</span><button class="toast-cerrar" onclick="this.parentElement.remove()">✕</button>';
  toastContenedor.appendChild(toast);
  setTimeout(function() { toast.classList.add("toast-visible"); }, 10);
  setTimeout(function() {
    toast.classList.remove("toast-visible");
    setTimeout(function() { if (toast.parentElement) toast.remove(); }, 400);
  }, 3500);
}

function mostrarMensaje(id, txt, esError) {
  mostrarToast(txt, esError ? "error" : "exito");
}
function limpiarMensaje(id) { /* Los toast se auto-limpian */ }

// ── Modal de Confirmacion Personalizado ─────────────
function mostrarConfirmacion(titulo, mensaje) {
  return new Promise(function(resolver) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-icono">⚠️</div>' +
        '<h3 class="modal-titulo">' + titulo + '</h3>' +
        '<p class="modal-mensaje">' + mensaje + '</p>' +
        '<div class="modal-botones">' +
          '<button class="btn-modal btn-modal-cancelar" id="modalBtnCancelar">Cancelar</button>' +
          '<button class="btn-modal btn-modal-confirmar" id="modalBtnConfirmar">Confirmar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    setTimeout(function() { overlay.classList.add("modal-visible"); }, 10);
    overlay.querySelector("#modalBtnConfirmar").onclick = function() {
      overlay.classList.remove("modal-visible");
      setTimeout(function() { overlay.remove(); }, 300);
      resolver(true);
    };
    overlay.querySelector("#modalBtnCancelar").onclick = function() {
      overlay.classList.remove("modal-visible");
      setTimeout(function() { overlay.remove(); }, 300);
      resolver(false);
    };
    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) {
        overlay.classList.remove("modal-visible");
        setTimeout(function() { overlay.remove(); }, 300);
        resolver(false);
      }
    });
  });
}

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
      <div class="cabecera-contenido">
        <div class="cabecera-logo">📋</div>
        <div>
          <h1 id="tituloPrincipal">CIAF - Administración de Horarios</h1>
          <p id="subtituloApp">Corporación Instituto de Administración y Finanzas</p>
        </div>
      </div>
    </div>
    <div id="areaPrincipal">
      <div id="vistaMenu">
        <h2>Menú Principal</h2>
        <p id="guiaMenu">Selecciona una opción del menú.</p>
        <div id="avisoSoloLectura" style="display:none;">🔒 Modo solo lectura — No se permiten cambios.</div>
        <div id="botonesMenu">
          <button id="btnCrear" class="btn-menu btn-menu-crear" onclick="mostrarVistaCrear()">
            <span class="btn-menu-icono">➕</span>
            <span class="btn-menu-texto">Crear horario</span>
            <span class="btn-menu-flecha">›</span>
          </button>
          <button id="btnEditar" class="btn-menu btn-menu-editar" onclick="mostrarVistaEditar()">
            <span class="btn-menu-icono">✏️</span>
            <span class="btn-menu-texto">Editar horario</span>
            <span class="btn-menu-flecha">›</span>
          </button>
          <button id="btnBorrar" class="btn-menu btn-menu-borrar" onclick="mostrarVistaBorrar()">
            <span class="btn-menu-icono">🗑️</span>
            <span class="btn-menu-texto">Borrar horario</span>
            <span class="btn-menu-flecha">›</span>
          </button>
          <button class="btn-menu btn-menu-listar" onclick="mostrarVistaListado()">
            <span class="btn-menu-icono">📊</span>
            <span class="btn-menu-texto">Listado de horarios</span>
            <span class="btn-menu-flecha">›</span>
          </button>
          <button class="btn-menu btn-menu-salir" onclick="mostrarVistaSalir()">
            <span class="btn-menu-icono">🚪</span>
            <span class="btn-menu-texto">Salir del programa</span>
            <span class="btn-menu-flecha">›</span>
          </button>
        </div>
      </div>
      <div id="vistaCrear" style="display:none;">
        <h2>Crear Horario</h2>
        <div class="campoForm"><label>Docente:</label><input type="text" id="crearDocente" maxlength="150" placeholder="Nombre del docente" /></div>
        <div class="campoForm"><label>Facultad:</label><select id="crearFacultad" onchange="actualizarCarreras('crear')"><option value="">-- Seleccione --</option></select></div>
        <div class="campoForm"><label>Carrera:</label><select id="crearCarrera" onchange="actualizarMaterias('crear')"><option value="">-- Seleccione --</option></select></div>
        <div class="campoForm"><label>Materia:</label><select id="crearMateria"><option value="">-- Seleccione --</option></select></div>
        <div class="campoForm"><label>Fecha Clase:</label><input type="date" id="crearFechaClase" /><span class="campo-ayuda">Solo fecha actual o futura</span></div>
        <div class="campoForm"><label>Hora Inicio:</label><input type="time" id="crearHoraInicia" /></div>
        <div class="campoForm"><label>Hora Termina:</label><input type="time" id="crearHoraTermina" /></div>
        <div class="botonesAccion">
          <button class="btn-accion btn-primario" onclick="ejecutarCrearHorario()">💾 Guardar</button>
          <button class="btn-accion btn-secundario" onclick="mostrarVistaMenu()">Cancelar</button>
        </div>
      </div>
      <div id="vistaEditar" style="display:none;">
        <h2>Editar Horario</h2>
        <div class="campoForm"><label>ID Horario:</label><input type="number" id="editarId" min="1" placeholder="Ingrese el ID a editar" /></div>
        <button class="btn-accion btn-cargar" onclick="cargarHorarioParaEditar()">🔍 Cargar</button>
        <div id="editarCampos" style="display:none;">
          <div class="campoForm"><label>Docente:</label><input type="text" id="editarDocente" maxlength="150" /></div>
          <div class="campoForm"><label>Facultad:</label><select id="editarFacultad" onchange="actualizarCarreras('editar')"><option value="">-- Seleccione --</option></select></div>
          <div class="campoForm"><label>Carrera:</label><select id="editarCarrera" onchange="actualizarMaterias('editar')"><option value="">-- Seleccione --</option></select></div>
          <div class="campoForm"><label>Materia:</label><select id="editarMateria"><option value="">-- Seleccione --</option></select></div>
          <div class="campoForm"><label>Fecha Clase:</label><input type="date" id="editarFechaClase" /><span class="campo-ayuda">Solo fecha actual o futura</span></div>
          <div class="campoForm"><label>Hora Inicio:</label><input type="time" id="editarHoraInicia" /></div>
          <div class="campoForm"><label>Hora Termina:</label><input type="time" id="editarHoraTermina" /></div>
        </div>
        <div class="botonesAccion">
          <button class="btn-accion btn-primario" onclick="ejecutarEditarHorario()">💾 Guardar cambios</button>
          <button class="btn-accion btn-secundario" onclick="mostrarVistaMenu()">Cancelar</button>
        </div>
      </div>
      <div id="vistaBorrar" style="display:none;">
        <h2>Borrar Horario</h2>
        <div class="campoForm"><label>ID Horario:</label><input type="number" id="borrarId" min="1" placeholder="Ingrese el ID" /></div>
        <div class="botonesAccion">
          <button class="btn-accion btn-peligro" onclick="ejecutarBorrarHorario()">🗑️ Eliminar</button>
          <button class="btn-accion btn-secundario" onclick="mostrarVistaMenu()">Cancelar</button>
        </div>
      </div>
      <div id="vistaListado" style="display:none;">
        <h2>Listado de Horarios</h2>
        <div id="controlesListado">
          <label>Busqueda:</label>
          <select id="selectCampoBusqueda" onchange="ejecutarListado()"><option value="todos">Todos</option><option value="idHorario">ID</option><option value="docente">Docente</option><option value="facultad">Facultad</option><option value="carrera">Carrera</option><option value="materia">Materia</option><option value="fechaClase">Fecha</option><option value="horaIniciaClase">Inicia</option><option value="horaTerminaClase">Termina</option></select>
          <input type="text" id="inputBusqueda" placeholder="Texto a buscar..." oninput="ejecutarListado()" />
          <button class="btn-accion btn-buscar" onclick="ejecutarListado()">🔍 Buscar</button>
          <button class="btn-accion btn-secundario" onclick="mostrarVistaMenu()">Cerrar</button>
        </div>
        <div id="resumenListado"></div>
        <div id="tablaListadoContenedor"></div>
      </div>
      <div id="vistaSalir" style="display:none;">
        <h2>Salir del Programa</h2>
        <p>Puede cerrar esta pestana para finalizar.</p>
        <button class="btn-accion btn-secundario" onclick="mostrarVistaMenu()">Volver al menú</button>
      </div>
    </div>
    <div id="piePagina"><p>HorariosDocenteApp | CIAF | Programación y Servicios WEB IV SEMESTRE</p><p class="firma">VHHM</p></div>
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
  if (btnCrear) btnCrear.style.display = config.permitir_crear ? "flex" : "none";
  if (btnEditar) btnEditar.style.display = config.permitir_editar ? "flex" : "none";
  if (btnBorrar) btnBorrar.style.display = config.permitir_borrar ? "flex" : "none";
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
function mostrarVistaCrear() {
  ocultarTodasLasVistas();
  obtenerElemento("crearDocente").value = "";
  obtenerElemento("crearFacultad").value = "";
  obtenerElemento("crearCarrera").innerHTML = '<option value="">-- Seleccione carrera --</option>';
  obtenerElemento("crearMateria").innerHTML = '<option value="">-- Seleccione materia --</option>';
  obtenerElemento("crearFechaClase").value = "";
  obtenerElemento("crearHoraInicia").value = "";
  obtenerElemento("crearHoraTermina").value = "";
  cargarFacultades("crear");
  obtenerElemento("vistaCrear").style.display = "block"; estadoApp.vistaActual = "crear";
  establecerFechaMinima("crearFechaClase");
}
function mostrarVistaEditar() {
  ocultarTodasLasVistas();
  obtenerElemento("editarId").value = "";
  obtenerElemento("editarDocente").value = "";
  obtenerElemento("editarFacultad").value = "";
  obtenerElemento("editarCarrera").innerHTML = '<option value="">-- Seleccione carrera --</option>';
  obtenerElemento("editarMateria").innerHTML = '<option value="">-- Seleccione materia --</option>';
  obtenerElemento("editarFechaClase").value = "";
  obtenerElemento("editarHoraInicia").value = "";
  obtenerElemento("editarHoraTermina").value = "";
  obtenerElemento("editarCampos").style.display = "none";
  estadoApp.idHorarioCargado = null;
  obtenerElemento("vistaEditar").style.display = "block"; estadoApp.vistaActual = "editar";
}
function mostrarVistaBorrar() {
  ocultarTodasLasVistas();
  obtenerElemento("borrarId").value = "";
  obtenerElemento("vistaBorrar").style.display = "block"; estadoApp.vistaActual = "borrar";
}
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
  const docente = sanitizarTexto(obtenerElemento("crearDocente").value);
  const facultad = sanitizarTexto(obtenerElemento("crearFacultad").value);
  const carrera = sanitizarTexto(obtenerElemento("crearCarrera").value);
  const materia = sanitizarTexto(obtenerElemento("crearMateria").value);
  const fechaClase = sanitizarTexto(obtenerElemento("crearFechaClase").value);
  const horaIniciaClase = sanitizarTexto(obtenerElemento("crearHoraInicia").value);
  const horaTerminaClase = sanitizarTexto(obtenerElemento("crearHoraTermina").value);
  if (!docente||!facultad||!carrera||!materia||!fechaClase||!horaIniciaClase||!horaTerminaClase) {
    mostrarToast("Debes completar todos los campos.", "error"); return;
  }
  if (!validarFechaNoPasada(fechaClase)) {
    mostrarToast("La fecha no puede ser anterior a la fecha actual.", "error"); return;
  }
  try {
    const r = await apiFetch("POST","",{docente,facultad,carrera,materia,fechaClase,horaIniciaClase,horaTerminaClase});
    if (r.datos.ok) { mostrarToast("Horario creado correctamente.", "exito"); setTimeout(mostrarVistaMenu,2000); }
    else { mostrarToast(r.datos.mensaje||"Error al crear.", "error"); }
  } catch(e) { mostrarToast("Error de conexion con el servidor.", "error"); }
}

async function cargarHorarioParaEditar() {
  const id = parseInt(obtenerElemento("editarId").value, 10);
  if (!id||id<=0) { mostrarToast("Ingresa un ID valido.", "error"); return; }
  try {
    const r = await apiFetch("GET","",null);
    if (!r.datos.ok) { mostrarToast("Error al buscar.", "error"); return; }
    const h = (r.datos.datos||[]).find(function(x){ return x.idHorario == id; });
    if (!h) { mostrarToast("No se encontro un horario con ese ID.", "error"); return; }
    cargarFacultades("editar");
    obtenerElemento("editarDocente").value = h.docente;
    obtenerElemento("editarFacultad").value = h.facultad;
    actualizarCarreras("editar");
    obtenerElemento("editarCarrera").value = h.carrera;
    actualizarMaterias("editar");
    obtenerElemento("editarMateria").value = h.materia;
    obtenerElemento("editarFechaClase").value = String(h.fechaClase).substring(0,10);
    establecerFechaMinima("editarFechaClase");
    obtenerElemento("editarHoraInicia").value = String(h.horaIniciaClase).substring(0,5);
    obtenerElemento("editarHoraTermina").value = String(h.horaTerminaClase).substring(0,5);
    obtenerElemento("editarCampos").style.display = "block";
    estadoApp.idHorarioCargado = id;
    mostrarToast("Horario cargado. Modifica los campos y guarda.", "info");
  } catch(e) { mostrarToast("Error de conexion con el servidor.", "error"); }
}

async function ejecutarEditarHorario() {
  const id = estadoApp.idHorarioCargado;
  if (!id) { mostrarToast("Primero carga un horario.", "error"); return; }
  const docente = sanitizarTexto(obtenerElemento("editarDocente").value);
  const facultad = sanitizarTexto(obtenerElemento("editarFacultad").value);
  const carrera = sanitizarTexto(obtenerElemento("editarCarrera").value);
  const materia = sanitizarTexto(obtenerElemento("editarMateria").value);
  const fechaClase = sanitizarTexto(obtenerElemento("editarFechaClase").value);
  const horaIniciaClase = sanitizarTexto(obtenerElemento("editarHoraInicia").value);
  const horaTerminaClase = sanitizarTexto(obtenerElemento("editarHoraTermina").value);
  if (!docente||!facultad||!carrera||!materia||!fechaClase||!horaIniciaClase||!horaTerminaClase) {
    mostrarToast("Debes completar todos los campos.", "error"); return;
  }
  if (!validarFechaNoPasada(fechaClase)) {
    mostrarToast("La fecha no puede ser anterior a la fecha actual.", "error"); return;
  }
  try {
    const r = await apiFetch("PUT","?id="+id,{docente,facultad,carrera,materia,fechaClase,horaIniciaClase,horaTerminaClase});
    if (r.datos.ok) { mostrarToast("Horario actualizado correctamente.", "exito"); setTimeout(mostrarVistaMenu,2000); }
    else { mostrarToast(r.datos.mensaje||"Error al actualizar.", "error"); }
  } catch(e) { mostrarToast("Error de conexion con el servidor.", "error"); }
}

async function ejecutarBorrarHorario() {
  const id = parseInt(obtenerElemento("borrarId").value,10);
  if (!id||id<=0) { mostrarToast("Ingresa un ID valido.", "error"); return; }
  const confirmado = await mostrarConfirmacion("Eliminar horario", "¿Seguro que deseas eliminar el horario con ID " + id + "? Esta accion no se puede deshacer.");
  if (!confirmado) return;
  try {
    const r = await apiFetch("DELETE","?id="+id,null);
    if (r.datos.ok) { mostrarToast("Horario eliminado.", "exito"); setTimeout(mostrarVistaMenu,2000); }
    else { mostrarToast(r.datos.mensaje||"Error al eliminar.", "error"); }
  } catch(e) { mostrarToast("Error de conexion con el servidor.", "error"); }
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
    if (lista.length===0) { contenedor.innerHTML = '<div class="sin-registros">📭 No se encontraron registros.</div>'; return; }
    const cols = [
      {label:"ID",campo:"idHorario"},{label:"Docente",campo:"docente"},{label:"Facultad",campo:"facultad"},
      {label:"Carrera",campo:"carrera"},{label:"Materia",campo:"materia"},{label:"Fecha",campo:"fechaClase"},
      {label:"Inicia",campo:"horaIniciaClase"},{label:"Termina",campo:"horaTerminaClase"},
    ];
    let html = '<div class="tabla-contenedor"><table id="tablaHorarios"><thead><tr>';
    cols.forEach(function(col) {
      const activo = ordenTabla.campo===col.campo;
      const flecha = activo?(ordenTabla.asc?" ▲":" ▼"):" ⇅";
      html += '<th class="thOrdenable'+(activo?" thActivo":"")+'" onclick="ordenarPorCampo(\''+col.campo+'\')">'+ col.label+'<span class="flechaOrden">'+flecha+'</span></th>';
    });
    html += "</tr></thead><tbody>";
    lista.forEach(function(h){ html += "<tr><td data-label='ID'>"+h.idHorario+"</td><td data-label='Docente'>"+h.docente+"</td><td data-label='Facultad'>"+h.facultad+"</td><td data-label='Carrera'>"+h.carrera+"</td><td data-label='Materia'>"+h.materia+"</td><td data-label='Fecha'>"+String(h.fechaClase).substring(0,10)+"</td><td data-label='Inicia'>"+String(h.horaIniciaClase).substring(0,5)+"</td><td data-label='Termina'>"+String(h.horaTerminaClase).substring(0,5)+"</td></tr>"; });
    html += "</tbody></table></div>"; contenedor.innerHTML = html;
  } catch(e) { resumen.textContent = "Error de conexion con el servidor."; }
}

function aplicarEstilos() {
  const s = document.createElement("style");
  s.textContent = `
    *, *::before, *::after { box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #0a1628 100%);
      color: #e0e6f0;
      margin: 0;
      padding: 0;
      min-height: 100vh;
    }

    /* ── Cabecera ─────────────────────────── */
    #cabeceraApp {
      background: linear-gradient(135deg, #020810 0%, #0f1d35 100%);
      color: #fff;
      padding: 16px 20px;
      border-bottom: 3px solid;
      border-image: linear-gradient(90deg, #1e3a5f, #4a9eff, #1e3a5f) 1;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }
    .cabecera-contenido { display: flex; align-items: center; gap: 12px; max-width: 1100px; margin: 0 auto; }
    .cabecera-logo { font-size: 1.8em; }
    #tituloPrincipal { margin: 0; font-size: 1.2em; color: #4a9eff; font-weight: 700; letter-spacing: 0.5px; }
    #subtituloApp { margin: 4px 0 0; font-size: 0.85em; color: #8ab4d4; }

    /* ── Area Principal ───────────────────── */
    #areaPrincipal { padding: 20px 16px; max-width: 1100px; margin: 0 auto; }
    h2 {
      border-bottom: 2px solid #1e3a5f;
      padding-bottom: 10px;
      margin-top: 0;
      font-size: 1.2em;
      color: #4a9eff;
      font-weight: 600;
    }
    #guiaMenu { font-style: italic; color: #8ab4d4; margin-bottom: 16px; }

    /* ── Aviso Solo Lectura ───────────────── */
    #avisoSoloLectura {
      display: none;
      background: linear-gradient(135deg, #8b1a1a, #6b1010);
      color: #fff;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-weight: 600;
      border-radius: 10px;
      border: 1px solid #cc3333;
      box-shadow: 0 4px 12px rgba(139,26,26,0.4);
      animation: pulse-aviso 2s ease-in-out infinite;
    }
    @keyframes pulse-aviso {
      0%, 100% { box-shadow: 0 4px 12px rgba(139,26,26,0.4); }
      50% { box-shadow: 0 4px 20px rgba(204,51,51,0.6); }
    }

    /* ── Botones del Menu ─────────────────── */
    #botonesMenu { display: flex; flex-direction: column; gap: 10px; max-width: 340px; margin: 0 auto; }
    .btn-menu {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 14px 18px;
      font-size: 1em;
      font-family: inherit;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      position: relative;
      overflow: hidden;
    }
    .btn-menu::before {
      content: '';
      position: absolute;
      top: 0; left: -100%; width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
      transition: left 0.5s;
    }
    .btn-menu:hover::before { left: 100%; }
    .btn-menu:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
    .btn-menu:active { transform: translateY(0); }

    .btn-menu-crear { background: #1e3a5f; }
    .btn-menu-crear:hover { background: #2d5a8e; }
    .btn-menu-editar { background: #1e3a5f; }
    .btn-menu-editar:hover { background: #2d5a8e; }
    .btn-menu-borrar { background: #1e3a5f; }
    .btn-menu-borrar:hover { background: #2d5a8e; }
    .btn-menu-listar { background: #1e3a5f; }
    .btn-menu-listar:hover { background: #2d5a8e; }
    .btn-menu-salir { background: #1e3a5f; }
    .btn-menu-salir:hover { background: #2d5a8e; }

    .btn-menu-icono { font-size: 1.3em; flex-shrink: 0; }
    .btn-menu-texto { flex: 1; text-align: left; font-weight: 500; }
    .btn-menu-flecha { font-size: 1.4em; opacity: 0.5; transition: all 0.3s; }
    .btn-menu:hover .btn-menu-flecha { opacity: 1; transform: translateX(4px); }

    /* ── Formularios ──────────────────────── */
    .campoForm {
      margin-bottom: 14px;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 6px;
    }
    .campoForm label {
      font-weight: 600;
      width: 100%;
      padding-top: 0;
      color: #8ab4d4;
      font-size: 0.9em;
      letter-spacing: 0.3px;
    }
    .campoForm input, .campoForm select {
      font-family: inherit;
      font-size: 0.95em;
      padding: 10px 12px;
      border: 1px solid #2d5a8e;
      border-radius: 8px;
      width: 100%;
      background: #0d1f35;
      color: #e0e6f0;
      transition: all 0.3s;
      outline: none;
    }
    .campoForm input:focus, .campoForm select:focus {
      border-color: #4a9eff;
      box-shadow: 0 0 0 3px rgba(74,158,255,0.2);
      background: #112240;
    }
    .campoForm input::placeholder { color: #4a6a8a; }
    .campo-ayuda {
      width: 100%;
      font-size: 0.78em;
      color: #6a8aaa;
      margin-top: 2px;
    }

    /* ── Botones de Accion ────────────────── */
    .botonesAccion {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }
    .btn-accion {
      font-family: inherit;
      font-size: 0.95em;
      font-weight: 600;
      padding: 12px 24px;
      cursor: pointer;
      border: none;
      border-radius: 10px;
      flex: 1 1 120px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      letter-spacing: 0.3px;
    }
    .btn-accion:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.4); }
    .btn-accion:active { transform: translateY(0); }

    .btn-primario {
      background: linear-gradient(135deg, #1e3a5f, #2d5a8e);
      color: #fff;
    }
    .btn-primario:hover { background: linear-gradient(135deg, #2d5a8e, #3d7abe); }

    .btn-secundario {
      background: linear-gradient(135deg, #3a3a3a, #2a2a2a);
      color: #ccc;
      border: 1px solid #555;
    }
    .btn-secundario:hover { background: linear-gradient(135deg, #4a4a4a, #3a3a3a); color: #fff; }

    .btn-peligro {
      background: linear-gradient(135deg, #8b1a1a, #a52020);
      color: #fff;
    }
    .btn-peligro:hover { background: linear-gradient(135deg, #a52020, #c53030); }

    .btn-cargar {
      background: linear-gradient(135deg, #4a3a8f, #5a4aaf);
      color: #fff;
      padding: 10px 20px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-family: inherit;
      font-weight: 600;
      margin-bottom: 14px;
      transition: all 0.3s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .btn-cargar:hover { background: linear-gradient(135deg, #5a4aaf, #6a5abf); transform: translateY(-2px); }

    .btn-buscar {
      background: linear-gradient(135deg, #1e3a5f, #2d5a8e);
      color: #fff;
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-family: inherit;
      font-weight: 600;
      transition: all 0.3s;
      white-space: nowrap;
    }
    .btn-buscar:hover { background: linear-gradient(135deg, #2d5a8e, #3d7abe); }

    /* ── Controles Listado ────────────────── */
    #controlesListado {
      margin-bottom: 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      background: rgba(13,31,53,0.6);
      padding: 12px;
      border-radius: 10px;
      border: 1px solid #1e3a5f;
    }
    #controlesListado label { font-weight: 600; color: #8ab4d4; }
    #controlesListado select {
      font-family: inherit;
      padding: 8px 10px;
      flex: 1 1 100px;
      min-width: 80px;
      background: #0d1f35;
      color: #e0e6f0;
      border: 1px solid #2d5a8e;
      border-radius: 8px;
      outline: none;
    }
    #controlesListado input {
      font-family: inherit;
      padding: 8px 10px;
      flex: 2 1 150px;
      min-width: 100px;
      background: #0d1f35;
      color: #e0e6f0;
      border: 1px solid #2d5a8e;
      border-radius: 8px;
      outline: none;
    }
    #controlesListado input:focus, #controlesListado select:focus {
      border-color: #4a9eff;
      box-shadow: 0 0 0 3px rgba(74,158,255,0.2);
    }

    #resumenListado { font-weight: 600; margin-bottom: 12px; color: #4a9eff; }

    /* ── Tabla ────────────────────────────── */
    .tabla-contenedor {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    #tablaHorarios { border-collapse: collapse; width: 100%; font-size: 0.9em; min-width: 700px; }
    #tablaHorarios thead { background: linear-gradient(135deg, #1e3a5f, #2d5a8e); color: #fff; }
    #tablaHorarios tbody tr { background: #0d1f35; color: #e0e6f0; transition: background 0.2s; }
    #tablaHorarios tbody tr:nth-child(even) { background: #112240; }
    #tablaHorarios tbody tr:hover { background: #1a3050; }
    #tablaHorarios td, #tablaHorarios th { padding: 12px 16px; text-align: left; white-space: nowrap; border: 1px solid #1e3a5f; }
    .thOrdenable { cursor: pointer; user-select: none; transition: background 0.2s; }
    .thOrdenable:hover { background: rgba(45,90,142,0.8); }
    .thActivo { background: #2d5a8e; }
    .flechaOrden { margin-left: 4px; font-size: 0.8em; opacity: 0.8; }

    .sin-registros {
      text-align: center;
      padding: 40px 20px;
      color: #8ab4d4;
      font-size: 1.1em;
      background: rgba(13,31,53,0.5);
      border-radius: 10px;
      border: 1px dashed #2d5a8e;
    }

    /* ── Pie de Pagina ────────────────────── */
    #piePagina {
      margin-top: 40px;
      padding: 16px 24px;
      background: linear-gradient(135deg, #020810, #0f1d35);
      color: #8ab4d4;
      font-size: 0.8em;
      text-align: center;
      border-top: 3px solid;
      border-image: linear-gradient(90deg, #1e3a5f, #4a9eff, #1e3a5f) 1;
    }
    .firma { font-size: 1.2em; font-weight: 700; color: #4a9eff; margin: 4px 0 0; letter-spacing: 2px; }

    /* ── Toast Notifications ──────────────── */
    #toastContenedor {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      max-width: 380px;
      width: calc(100% - 40px);
    }
    .toast-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border-radius: 12px;
      font-family: inherit;
      font-size: 0.9em;
      font-weight: 500;
      color: #fff;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      transform: translateX(120%);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: auto;
      backdrop-filter: blur(10px);
    }
    .toast-visible { transform: translateX(0); opacity: 1; }
    .toast-exito { background: linear-gradient(135deg, rgba(13,124,62,0.95), rgba(10,92,46,0.95)); border: 1px solid #10a04e; }
    .toast-error { background: linear-gradient(135deg, rgba(139,26,26,0.95), rgba(107,16,16,0.95)); border: 1px solid #cc3333; }
    .toast-info { background: linear-gradient(135deg, rgba(30,58,95,0.95), rgba(22,48,80,0.95)); border: 1px solid #4a9eff; }
    .toast-advertencia { background: linear-gradient(135deg, rgba(139,119,26,0.95), rgba(107,92,16,0.95)); border: 1px solid #ccaa33; }
    .toast-icono {
      width: 28px; height: 28px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.85em; font-weight: 700;
      flex-shrink: 0;
    }
    .toast-exito .toast-icono { background: #10a04e; }
    .toast-error .toast-icono { background: #cc3333; }
    .toast-info .toast-icono { background: #4a9eff; }
    .toast-advertencia .toast-icono { background: #ccaa33; }
    .toast-texto { flex: 1; line-height: 1.3; }
    .toast-cerrar {
      background: none; border: none; color: rgba(255,255,255,0.6);
      cursor: pointer; font-size: 1em; padding: 4px; line-height: 1;
      transition: color 0.2s;
    }
    .toast-cerrar:hover { color: #fff; }

    /* ── Modal de Confirmacion ────────────── */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s;
      padding: 20px;
    }
    .modal-visible { opacity: 1; }
    .modal-caja {
      background: linear-gradient(135deg, #0f1d35, #0d1f35);
      border: 1px solid #2d5a8e;
      border-radius: 16px;
      padding: 28px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      transform: scale(0.9);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .modal-visible .modal-caja { transform: scale(1); }
    .modal-icono { font-size: 2.5em; margin-bottom: 12px; }
    .modal-titulo { margin: 0 0 8px; color: #4a9eff; font-size: 1.2em; }
    .modal-mensaje { margin: 0 0 20px; color: #8ab4d4; font-size: 0.95em; line-height: 1.5; }
    .modal-botones { display: flex; gap: 10px; }
    .btn-modal {
      flex: 1;
      padding: 12px 20px;
      border: none;
      border-radius: 10px;
      font-family: inherit;
      font-size: 0.95em;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    .btn-modal-cancelar {
      background: linear-gradient(135deg, #3a3a3a, #2a2a2a);
      color: #ccc;
      border: 1px solid #555;
    }
    .btn-modal-cancelar:hover { background: linear-gradient(135deg, #4a4a4a, #3a3a3a); color: #fff; }
    .btn-modal-confirmar {
      background: linear-gradient(135deg, #8b1a1a, #a52020);
      color: #fff;
    }
    .btn-modal-confirmar:hover { background: linear-gradient(135deg, #a52020, #c53030); }

    /* ── Responsive: Tablet ───────────────── */
    @media(min-width:600px) {
      #areaPrincipal { padding: 32px 24px; }
      .cabecera-logo { font-size: 2.2em; }
      #tituloPrincipal { font-size: 1.4em; }
      .campoForm { flex-wrap: nowrap; align-items: flex-start; }
      .campoForm label { width: 200px; flex-shrink: 0; padding-top: 10px; }
      .campoForm input, .campoForm select { width: auto; flex: 1; }
      .campo-ayuda { width: auto; flex: 1; }
      #botonesMenu { max-width: 380px; }
    }

    /* ── Responsive: Movil ────────────────── */
    @media(max-width:599px) {
      #cabeceraApp { padding: 12px 16px; }
      .cabecera-logo { font-size: 1.5em; }
      #tituloPrincipal { font-size: 1em; }
      #subtituloApp { font-size: 0.78em; }
      #areaPrincipal { padding: 16px 12px; }
      h2 { font-size: 1.1em; }
      .btn-menu { padding: 12px 14px; font-size: 0.92em; }

      /* Tabla responsive en celular: cards apiladas */
      .tabla-contenedor {
        border-radius: 0;
        box-shadow: none;
        padding: 0;
      }
      #tablaHorarios {
        min-width: 0;
        font-size: 0.82em;
      }
      #tablaHorarios thead { display: none; }
      #tablaHorarios tbody tr {
        display: block;
        margin-bottom: 12px;
        background: linear-gradient(135deg, #0d1f35, #112240);
        border-radius: 10px;
        border: 1px solid #1e3a5f;
        padding: 10px 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }
      #tablaHorarios tbody tr:nth-child(even) {
        background: linear-gradient(135deg, #112240, #0d1f35);
      }
      #tablaHorarios tbody tr:hover { background: #1a3050; }
      #tablaHorarios td {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 4px;
        border: none;
        border-bottom: 1px solid rgba(30,58,95,0.5);
        white-space: normal;
      }
      #tablaHorarios td:last-child { border-bottom: none; }
      #tablaHorarios td::before {
        content: attr(data-label);
        font-weight: 700;
        color: #4a9eff;
        margin-right: 12px;
        font-size: 0.85em;
        min-width: 70px;
      }

      #controlesListado { padding: 10px; gap: 6px; }
      #controlesListado select,
      #controlesListado input { min-width: 0; font-size: 0.88em; padding: 7px 8px; }
      .btn-buscar, #controlesListado .btn-secundario { padding: 7px 12px; font-size: 0.88em; }

      #toastContenedor { right: 10px; left: 10px; width: auto; max-width: none; }
      .toast-item { font-size: 0.85em; padding: 12px 14px; }
    }

    @media(max-width:360px) {
      #tituloPrincipal { font-size: 0.9em; }
      .btn-menu { padding: 10px 12px; font-size: 0.88em; gap: 8px; }
      .btn-menu-icono { font-size: 1.1em; }
      .btn-accion { padding: 10px 16px; font-size: 0.9em; }
    }
  `;
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
