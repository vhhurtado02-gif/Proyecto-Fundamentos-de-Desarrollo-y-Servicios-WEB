# horariosDocenteApp

**CIAF – Corporación Instituto de Administración y Finanzas**
Sistema de Administración de Horarios Docentes
Stack: Node.js (funciones serverless) · MySQL · HTML / CSS / JavaScript puro (sin frameworks)
Autor: Víctor Hugo Hurtado

---

## Tabla de contenido

1. [Descripción general](#descripción-general)
2. [Arquitectura del proyecto](#arquitectura-del-proyecto)
3. [Estructura de carpetas](#estructura-de-carpetas)
4. [Funcionalidades](#funcionalidades)
5. [Instalación desde cero en una máquina nueva](#instalación-desde-cero-en-una-máquina-nueva)
6. [Despliegue en producción (Vercel + Railway)](#despliegue-en-producción-vercel--railway)
7. [Desarrollo local — Opción A: `vercel dev` + base de datos de Railway](#desarrollo-local--opción-a-vercel-dev--base-de-datos-de-railway)
8. [Desarrollo local — Opción B: `vercel dev` + base de datos MySQL local (recomendado)](#desarrollo-local--opción-b-vercel-dev--base-de-datos-mysql-local-recomendado)
9. [Desarrollo local alternativo: servidor Express (`back/`)](#desarrollo-local-alternativo-servidor-express-back)
10. [Endpoints de la API](#endpoints-de-la-api)
11. [Seguridad — hardening aplicado](#seguridad--hardening-aplicado)
12. [Reglas de negocio implementadas](#reglas-de-negocio-implementadas)
13. [Solución de problemas (troubleshooting)](#solución-de-problemas-troubleshooting)
14. [Detener el servidor](#detener-el-servidor)

---

## Descripción general

Aplicación web para que la CIAF administre los horarios de clase de sus docentes: crear, editar, borrar
y consultar horarios, con un panel de administración que permite habilitar/deshabilitar permisos
(crear/editar/borrar) en tiempo real, y validaciones de negocio como evitar que un mismo docente tenga
dos clases cruzadas en el tiempo.

Es una **SPA (Single Page Application)** hecha en JavaScript puro (sin React/Vue/etc.), que cambia de
"vista" mostrando y ocultando bloques de la página, y usa la **History API** del navegador para que el
botón "atrás" del navegador o del celular navegue dentro de la app en vez de salir de ella.

---

## Arquitectura del proyecto

Este proyecto tiene **dos implementaciones de backend distintas y separadas**. Es fundamental
entenderlas antes de tocar código, para no perder tiempo depurando el lugar equivocado:

| | `api/` | `back/` |
| --- | --- | --- |
| ¿Qué es? | Funciones serverless de Vercel | Servidor Express tradicional |
| ¿Dónde corre? | En producción (Vercel) y en local con `vercel dev` | Solo en tu PC, con `node servidor.js` |
| ¿Se conecta a? | MySQL de Railway (o local, según variables de entorno) | MySQL local propio |
| ¿Lo usa el `front/` actual? | **Sí, siempre** | No — sus rutas no coinciden con lo que llama el `front/` |
| Variables de entorno | `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` |

> **En resumen:** `front/appHorarios.js` llama siempre a `/api/horarios` y `/api/admin` (sin sub-rutas).
> Eso coincide exactamente con `api/horarios.js` y `api/admin.js`. La carpeta `back/` es un servidor
> Express independiente, con sus propias rutas (`/api/horarios/list`, `/api/horarios/:id`, etc.), que
> **no** coinciden con lo que el front realmente pide. Se conserva como alternativa histórica/de
> estudio, pero **no es lo que usa la aplicación real**. Si vas a desarrollar o depurar algo del
> backend, hazlo en `api/`.

---

## Estructura de carpetas

```text
horariosDocenteApp/
├── api/                        ← Backend real (funciones serverless, usado en producción)
│   ├── horarios.js             ← CRUD de horarios + validación de cruces de horario
│   ├── admin.js                ← Panel de administración (permisos crear/editar/borrar)
│   ├── health.js               ← Verificación de estado del servicio y la BD
│   ├── conexionBD.js           ← Pool de conexiones MySQL (variables MYSQL*)
│   └── sanitizador.js          ← Limpieza de texto de entrada
│
├── back/                       ← Servidor Express alternativo (SOLO desarrollo local, no producción)
│   ├── servidor.js
│   ├── conexionBD.js           ← Variables DB_*
│   ├── rutasHorarios.js        ← Rutas distintas a las de api/
│   ├── sanitizador.js
│   ├── validadorHorario.js
│   ├── package.json
│   └── .env                    ← (no se sube a git)
│
├── front/
│   ├── index.html              ← Página principal (SPA)
│   ├── admin.html              ← Panel de administración
│   └── appHorarios.js          ← Toda la lógica de interfaz y llamadas a la API
│
├── variables/
│   ├── horariosdocentes.sql    ← Script de creación de la base de datos
│   └── .env.example            ← Plantilla de configuración para back/
│
├── vercel.json                 ← Enrutamiento de Vercel (formato "routes", legado pero funcional)
├── package.json                ← Dependencias raíz (mysql2, usadas por api/)
└── README.md
```

---

## Funcionalidades

- **CRUD completo de horarios**: crear, editar, borrar y listar, con búsqueda y ordenamiento por columna.
- **Validaciones de negocio**:
  - Todos los campos son obligatorios.
  - La fecha de la clase no puede ser anterior a hoy.
  - La hora de fin debe ser posterior a la hora de inicio.
  - **Un docente no puede tener dos horarios que se crucen en fecha/hora** (se valida tanto al crear
    como al editar, excluyendo el propio registro al editar).
- **Panel de administración** (`admin.html`): protegido por contraseña, permite activar/desactivar en
  caliente los permisos de "crear", "editar" y "borrar" para todos los usuarios de la app, sin tocar
  código.
- **Modo solo lectura global** (`MODO_SOLO_LECTURA`), controlable por variable de entorno.
- **Navegación tipo app nativa**: el botón atrás del navegador o del celular no saca de la aplicación —
  regresa a la vista anterior (por ejemplo, de "Crear horario" al menú), y desde el menú principal
  equivale a pulsar "Salir del programa", implementado con la History API (`pushState` + `popstate`).
- **Interfaz responsiva**, con feedback visual (notificaciones tipo toast, confirmaciones antes de
  borrar).

---

## Instalación desde cero en una máquina nueva

Esta sección asume que quieres clonar el proyecto en un PC que **nunca lo ha tenido antes** y dejarlo
funcionando en modo desarrollo (conectado a la base de datos real de Railway, o a una copia local — tú
eliges al final). Es el mismo procedimiento tanto para retomar el proyecto en otra computadora como para
que un compañero de equipo lo levante por primera vez.

### Requisitos previos

Instala esto antes de empezar, si no lo tienes ya:

| Herramienta | Para qué sirve | Cómo verificar que ya la tienes |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) (versión 18 o superior) | Ejecutar JavaScript fuera del navegador, y las funciones de `api/` | `node -v` |
| [Git](https://git-scm.com/) | Clonar y versionar el proyecto | `git --version` |
| [MySQL Workbench](https://dev.mysql.com/downloads/workbench/) o [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) | Administrar/consultar bases de datos MySQL | Abre Workbench y verifica que puedas conectarte a una instancia |
| Una **cuenta de Vercel** con acceso al proyecto `horarios-docentes-app` | Desplegar y usar `vercel dev` | Que te hayan agregado como colaborador del proyecto en Vercel |
| Un editor de código (recomendado: [VS Code](https://code.visualstudio.com/)) | Editar el proyecto | — |

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/vhhurtado02-gif/Proyecto-Fundamentos-de-Desarrollo-y-Servicios-WEB.git
cd Proyecto-Fundamentos-de-Desarrollo-y-Servicios-WEB
```

### Paso 2 — Instalar las dependencias

En la **raíz** del proyecto (dependencias que usan las funciones de `api/`):

```bash
npm install
```

### Paso 3 — Instalar y autenticar la CLI de Vercel

```bash
npm install -g vercel
vercel login
```

Sigue las instrucciones en pantalla (te pedirá confirmar el inicio de sesión desde el navegador).

### Paso 4 — Vincular la carpeta local con el proyecto real de Vercel

```bash
vercel link
```

Cuando pregunte, indica que quieres vincular con un proyecto **existente** y selecciona
`horarios-docentes-app`. Esto crea una carpeta oculta `.vercel/` con la información de vinculación.

### Paso 5 — Descargar las variables de entorno

```bash
vercel env pull .env.local
```

Esto trae las variables configuradas para el entorno `development` en Vercel (contraseñas, datos de
conexión a MySQL, etc.). Si el resultado viene con campos vacíos, probablemente falta crear esas
variables en el entorno `development` — ver la sección de
[Desarrollo local — Opción A](#desarrollo-local--opción-a-vercel-dev--base-de-datos-de-railway) para el
detalle de cómo crearlas.

### Paso 6 — Levantar el proyecto

```bash
vercel dev
```

Cuando muestre `Ready! Available at http://localhost:3000`, abre en el navegador:

```text
http://localhost:3000/front/index.html
http://localhost:3000/front/admin.html
```

### Paso 7 — Decidir contra qué base de datos vas a trabajar

- Si quieres ver/depurar los **datos reales** (Railway): no necesitas hacer nada más, el Paso 5 ya trae
  esa configuración por defecto.
- Si prefieres **experimentar sin riesgo** contra una base de datos local propia: sigue la
  [Opción B de desarrollo local](#desarrollo-local--opción-b-vercel-dev--base-de-datos-mysql-local-recomendado)
  más abajo, que explica cómo crear la base de datos local y apuntar `.env.local` hacia ella.

### Checklist de verificación rápida

- [ ] `node -v` muestra una versión 18 o superior
- [ ] `git clone` terminó sin errores
- [ ] `npm install` terminó sin errores en la raíz del proyecto
- [ ] `vercel whoami` muestra tu usuario correctamente
- [ ] `vercel dev` levanta el servidor en `http://localhost:3000` sin errores
- [ ] `http://localhost:3000/front/index.html` carga el menú principal
- [ ] El listado de horarios muestra datos (confirma que la conexión a MySQL funciona)
- [ ] `http://localhost:3000/front/admin.html` permite iniciar sesión con la contraseña de administrador

Si algo de esta lista falla, revisa la sección de [Solución de problemas](#solución-de-problemas-troubleshooting) —
prácticamente todos los tropiezos comunes de una instalación nueva ya están documentados ahí.

---

## Despliegue en producción (Vercel + Railway)

- **Vercel** aloja el frontend (`front/`) y las funciones serverless (`api/`).
- **Railway** aloja únicamente la base de datos MySQL (no ejecuta código de la aplicación).

### Variables de entorno en Vercel

Configuradas en *Project → Settings → Environment Variables*, para los entornos **Production** y
**Preview**:

| Variable | Descripción |
| --- | --- |
| `MYSQLHOST` | Host del **proxy público** de MySQL en Railway (⚠️ no el host interno `*.railway.internal`, que solo funciona dentro de la red privada de Railway) |
| `MYSQLPORT` | Puerto del proxy público (Railway lo asigna; no siempre es el 3306 por defecto) |
| `MYSQLUSER` | Usuario de MySQL (normalmente `root`) |
| `MYSQLPASSWORD` | Contraseña de MySQL |
| `MYSQLDATABASE` | Nombre de la base de datos en Railway |
| `ADMIN_PASSWORD` | Contraseña para entrar al panel `front/admin.html` |
| `MODO_SOLO_LECTURA` | `"true"` para bloquear crear/editar/borrar globalmente; `"false"` en operación normal |

> Estas variables están marcadas como **"Sensible"**: una vez guardadas, ni el dashboard ni la CLI
> pueden volver a mostrar su valor. Esto es intencional (seguridad), pero implica que para desarrollo
> local hay que crear **copias separadas** de estas mismas variables en el entorno **Development**
> (que no admite variables sensibles) — ver las dos secciones siguientes.

Para encontrar los datos de conexión pública de tu base de datos en Railway: entra al servicio MySQL en
Railway → pestaña **Variables** → campo `MYSQL_PUBLIC_URL`, con el formato:

```text
mysql://usuario:contraseña@host_publico:puerto/nombre_basedatos
```

> ⚠️ **Cuidado con la traducción automática del navegador.** Si tienes activada la traducción de
> páginas, valores como `root` o `railway` pueden aparecer traducidos como `"Raíz"` o `"Ferrocarril"`
> en el dashboard de Railway. Desactívala antes de copiar cualquier credencial.

### Desplegar el proyecto en una cuenta de Vercel/Railway nueva (si aplica)

Si en algún momento necesitas replicar todo el despliegue en una cuenta distinta (por ejemplo, para un
nuevo entorno), en términos generales:

1. **Railway**: crea un nuevo proyecto → agrega un servicio de tipo *MySQL* → una vez listo, ejecuta el
   contenido de `variables/horariosdocentes.sql` contra esa base de datos (puedes usar la consola web
   de Railway o conectarte con MySQL Workbench usando los datos del `MYSQL_PUBLIC_URL`).
2. **Vercel**: crea un nuevo proyecto → importa este repositorio de GitHub → en la configuración,
   agrega las 7 variables de entorno listadas arriba (para Production y Preview) con los datos del
   Railway que acabas de crear → despliega.
3. Verifica accediendo a la URL que te da Vercel + `/front/index.html`.

---

## Desarrollo local — Opción A: `vercel dev` + base de datos de Railway

Esto simula el entorno de producción completo (front + funciones de `api/`) en tu PC, pero conectado a
la base de datos **real** de Railway. Útil para depurar exactamente lo que ve un usuario real, pero
**cualquier dato que crees, edites o borres afecta la base de datos real**.

```bash
vercel link                          # si aún no lo has hecho (ver sección de instalación)

# Crear copias no-sensibles de las variables para el entorno "development":
vercel env add MYSQLHOST development        # host público de Railway, ej: thomas.proxy.rlwy.net
vercel env add MYSQLPORT development         # puerto público de Railway, ej: 43502
vercel env add MYSQLUSER development         # root
vercel env add MYSQLPASSWORD development     # contraseña real de Railway
vercel env add MYSQLDATABASE development     # railway (o el nombre real de tu BD en Railway)
vercel env add ADMIN_PASSWORD development
vercel env add MODO_SOLO_LECTURA development

vercel env pull .env.local            # descarga esas variables a un archivo local
vercel dev                            # levanta el entorno local en http://localhost:3000
```

Abre `http://localhost:3000/front/index.html` o `http://localhost:3000/front/admin.html`.

---

## Desarrollo local — Opción B: `vercel dev` + base de datos MySQL local (recomendado)

Igual que la Opción A, pero apuntando a tu **propio MySQL local**, para poder crear/editar/borrar
libremente sin ningún riesgo sobre los datos reales. Es la opción recomendada para el día a día de
desarrollo y pruebas.

### Paso 1 — Tener la base de datos local creada

En MySQL Workbench (o el cliente que uses), conectado a tu instancia local:

1. Abre `variables/horariosdocentes.sql`.
2. Ejecuta el script completo.
3. Verifica que exista el schema `horariosdocentes` con la tabla `horarios_docentes`.

### Paso 2 — Editar `.env.local` a mano con tus datos locales

Después de haber corrido `vercel env pull .env.local` al menos una vez (Opción A), edita el archivo
**`.env.local`** (en la raíz del proyecto) y reemplaza estas 5 líneas:

```text
MYSQLHOST="127.0.0.1"
MYSQLPORT="3306"
MYSQLUSER="root"
MYSQLPASSWORD="tu_contraseña_local_real"
MYSQLDATABASE="horariosdocentes"
```

> **Importante:** si además quieres que estos valores locales sobrevivan a un futuro
> `vercel env pull` (que los sobrescribiría con los de Railway), tendrías que actualizar también las
> variables del entorno `development` en la nube (con `vercel env rm` + `vercel env add`, igual que en
> la Opción A pero con los valores locales). Si solo editas `.env.local` a mano sin tocar la nube,
> recuerda que un futuro `vercel env pull` revertirá el cambio.

### Paso 3 — Levantar el entorno

```bash
vercel dev
```

Abre `http://localhost:3000/front/index.html` — ahora todo lo que hagas queda en tu base de datos local.

### Para volver a trabajar contra la base de datos real más adelante

```bash
vercel env pull .env.local
```

---

## Desarrollo local alternativo: servidor Express (`back/`)

Esta opción usa el servidor Express de `back/` en vez de `vercel dev`. **Ten en cuenta la limitación
señalada en la sección de arquitectura**: sus rutas (`/api/horarios/list`, etc.) no coinciden con las
que llama `front/appHorarios.js` (`/api/horarios` a secas), así que ciertas funciones (como el listado)
no funcionarán correctamente usando el `front/` actual contra este servidor, salvo que se adapten las
rutas. Se documenta por completitud/histórico.

### Paso 1 — Crear la base de datos

1. Abra MySQL Workbench, conéctese con `root`.
2. Ejecute `variables/horariosdocentes.sql`.

### Paso 2 — Configurar variables de entorno

Copie `variables/.env.example` como `back/.env` y ajuste la contraseña real:

```text
HOST=127.0.0.1
PORT=8080
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña_aqui
DB_NAME=horariosdocentes
```

> `back/.env` nunca debe subirse a git (ya está en `.gitignore`).

### Paso 3 — Instalar dependencias

```cmd
cd back
npm install
```

Instala: `express`, `mysql2`, `dotenv`, `cors`.

### Paso 4 — Iniciar el servidor

```cmd
node servidor.js
```

Deberías ver:

```text
[BD] Conexión a MySQL establecida correctamente.
=================================================
  horariosDocenteApp - Servidor iniciado
  URL: http://127.0.0.1:8080
=================================================
```

### Paso 5 — Abrir en el navegador

```text
http://127.0.0.1:8080
```

---

## Endpoints de la API

### `api/` — los que realmente usa la aplicación (producción y `vercel dev`)

| Método | Ruta | Descripción |
| -------- | ------ | ------------- |
| GET | `/api/health` | Verifica que el servicio y la conexión a la BD estén activos |
| GET | `/api/horarios` | Listado completo de horarios |
| POST | `/api/horarios` | Crear horario (body JSON). Valida campos obligatorios, hora fin > hora inicio, y que no haya cruce de horario para el mismo docente |
| PUT | `/api/horarios?id=N` | Editar el horario con ese ID (mismas validaciones que crear) |
| DELETE | `/api/horarios?id=N` | Eliminar el horario con ese ID |
| GET | `/api/admin` | Obtener la configuración actual de permisos (crear/editar/borrar) |
| POST | `/api/admin` | Actualizar la configuración de permisos (requiere `clave_admin` correcta en el body) |

### `back/` — solo si corres el servidor Express local

| Método | Ruta | Descripción |
| -------- | ------ | ------------- |
| GET | `/api/horarios/list` | Listado con búsqueda y orden |
| GET | `/api/horarios/list-basic` | Listado sin filtros |
| GET | `/api/horarios/byidHorario?idHorario=N` | Buscar por ID |
| GET | `/api/horarios/check?field=...&value=...` | Verificar duplicado de un campo |
| GET | `/api/horarios/check-duplicado?...` | Verificar duplicado completo |
| POST | `/api/horarios` | Crear horario |
| PUT | `/api/horarios/:id` | Editar horario (por parámetro de ruta, no query string) |
| DELETE | `/api/horarios/by-idHorario` | Eliminar horario (ID en el body) |

---

## Seguridad — hardening aplicado

Estas son las correcciones de seguridad y buenas prácticas ya implementadas en el proyecto:

- **Sin credenciales en el repositorio activo**: `back/.env` se dejó de versionar (`git rm --cached`), y
  la contraseña de ejemplo en `variables/.env.example` se reemplazó por un placeholder genérico.
  *(La contraseña local sigue existiendo en commits antiguos del historial de git — pendiente de
  purgar el historial si se desea eliminarla por completo; decisión consciente de dejarlo así por ahora.)*
- **`/api/health` no expone infraestructura interna**: ya no devuelve host, usuario ni base de datos en
  la respuesta pública cuando hay un error de conexión; el detalle completo solo queda en los logs del
  servidor (Vercel → Logs), nunca en la respuesta al cliente.
- **Sin contraseña de administrador por defecto**: se eliminó el valor `"ciaf2026"` hardcodeado en el
  código. Si `ADMIN_PASSWORD` no está configurada, el sistema rechaza el acceso con un error claro en
  vez de aceptar una clave conocida.
- **Inicialización de tabla de configuración optimizada**: `api/admin.js` ya no ejecuta
  `CREATE TABLE`/`INSERT IGNORE` en cada petición (antes se ejecutaba incluso en cada `GET`, llamado
  cada 5 segundos por el frontend); ahora solo se ejecuta si la tabla realmente no existe.
- **Defensa adicional contra XSS en el listado**: además de la sanitización al guardar
  (`sanitizarTexto`, que limpia `< > " ' \` ;`), el listado ahora también **escapa** el HTML al
  renderizar (`escaparHtml`), como segunda capa de protección independiente.
- **Validaciones de integridad de horarios**: hora de fin posterior a hora de inicio, y sin cruces de
  horario para un mismo docente — implementadas tanto en el backend (obligatorio) como en el frontend
  (para feedback inmediato).

---

## Reglas de negocio implementadas

1. Todos los campos de un horario son obligatorios.
2. La fecha de clase no puede ser anterior a la fecha actual.
3. La hora de fin debe ser estrictamente posterior a la hora de inicio.
4. Un mismo docente no puede tener dos horarios cuyo rango de horas se solape en la misma fecha
   (aplica tanto al crear como al editar; al editar, el propio registro se excluye de la comparación).
5. El panel de administración puede desactivar globalmente la posibilidad de crear, editar o borrar
   horarios, independientemente de estas reglas.

---

## Solución de problemas (troubleshooting)

**El panel admin no avanza al ingresar la contraseña, usando Live Server**
→ Live Server solo sirve archivos estáticos, no ejecuta las funciones de `api/`. Usa `vercel dev` en su
lugar (ver secciones de desarrollo local arriba).

**`vercel env pull` trae las variables vacías (`ADMIN_PASSWORD=""`, etc.)**
→ Las variables de Production/Preview están marcadas como "Sensible" y no se pueden volver a leer.
Hay que crear copias separadas, no-sensibles, específicamente para el entorno `development`
(`vercel env add NOMBRE development`).

**Error de conexión a MySQL usando el host que muestra Railway por defecto**
→ Railway muestra por defecto el host **interno** (`mysql.railway.internal`), que solo funciona dentro
de la red privada de Railway. Desde fuera (tu PC, o Vercel) hay que usar el host y puerto del **proxy
público**, disponibles en la variable `MYSQL_PUBLIC_URL` del servicio MySQL en Railway.

**Los valores que copio de Railway no funcionan (usuario o base de datos "raros")**
→ Revisa si tienes la traducción automática del navegador activada: puede traducir literalmente
`"root"` → `"Raíz"` o `"railway"` → `"Ferrocarril"` dentro de los campos del dashboard. Desactívala
antes de copiar credenciales.

**Sigo viendo los datos de producción (Railway) aunque configuré `.env.local` con datos locales**
→ Causas más comunes, en orden de probabilidad:

1. Hay **otro proceso `vercel dev` corriendo en segundo plano** en otro puerto o terminal, y el
   navegador (o una pestaña vieja) sigue apuntando a ese proceso viejo. Solución: cierra todas las
   terminales, revisa el Administrador de Tareas de Windows y termina cualquier proceso `node.exe`
   sobrante, y vuelve a correr `vercel dev` una sola vez, limpio.
2. `vercel dev` estaba corriendo *antes* de editar `.env.local` — las variables de entorno solo se
   cargan al iniciar el proceso. Hay que detenerlo (`Ctrl+C`) y volver a correrlo después de guardar
   los cambios.
3. Confirma con `netstat -ano | findstr :3000` que no haya un proceso en `LISTENING` desde antes.
4. Para descartar por completo el caché del navegador, prueba con
   `curl http://localhost:3000/api/horarios` directamente desde una terminal — si ahí ya se ven los
   datos correctos, el problema era el navegador.

**Aparece un carácter suelto (ej. una "ñ") en la interfaz, fuera de cualquier botón o texto normal**
→ Revisa el archivo HTML correspondiente (`front/index.html` o `front/admin.html`) con las
herramientas de desarrollador (clic derecho → Inspeccionar) para confirmar si es parte del DOM. Si lo
es, casi siempre es un carácter tecleado por accidente con esa pestaña del editor enfocada (con
guardado automático activado) — revisa el final del archivo en tu editor y elimínalo.

**`vercel dev` falla con `Function 'api/horarios.js' failed with exit code 3221225786` (Windows)**
→ Ese código corresponde a un error de "DLL no encontrada" de Windows, típicamente tras cerrar procesos
`node.exe` de forma forzada. Borra el caché de Vercel y reinstala dependencias:

```bash
Remove-Item -Recurse -Force .vercel\cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
vercel dev
```

**`Cannot find module 'express'` (usando `back/`)**
→ Ejecuta `npm install` dentro de la carpeta `back/`.

**`Access denied for user 'root'` (usando `back/` o MySQL local)**
→ Revisa la contraseña configurada en `back/.env` o en `.env.local`, según cuál estés usando.

**`Unknown database 'horariosdocentes'`**
→ No se ejecutó el script `variables/horariosdocentes.sql` en esa instancia de MySQL.

---

## Detener el servidor

- Si usas `vercel dev` o `node servidor.js`: en la terminal donde está corriendo, presiona `Ctrl + C`.
- Verifica siempre que el proceso haya terminado antes de cerrar la ventana de la terminal, para evitar
  procesos huérfanos que sigan ocupando el puerto la próxima vez que lo inicies.