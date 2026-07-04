# horariosDocenteApp
**CIAF – Corporación Instituto de Administración y Finanzas**
Proyecto: Administración de Horarios Docentes
Stack: Node.js + MySQL + HTML + JavaScript puro

---

## Estructura del Proyecto

```
horariosDocenteApp/
├── api/                     ← Funciones serverless usadas en PRODUCCIÓN (Vercel)
│   ├── horarios.js          ← Endpoints CRUD de horarios
│   ├── admin.js             ← Endpoint del panel de administración
│   ├── health.js            ← Verificación del servicio y la BD
│   ├── conexionBD.js        ← Pool de conexiones MySQL (usa variables MYSQL*)
│   └── sanitizador.js       ← Funciones de sanitización
├── back/                    ← Servidor Express alternativo, SOLO para desarrollo local
│   ├── servidor.js          ← Servidor principal Express
│   ├── conexionBD.js        ← Pool de conexiones MySQL (usa variables DB_*)
│   ├── rutasHorarios.js     ← Endpoints API REST (rutas distintas a las de api/)
│   ├── sanitizador.js       ← Funciones de sanitización
│   ├── validadorHorario.js  ← Validación de datos
│   ├── package.json         ← Dependencias Node.js
│   └── .env                 ← Variables de entorno (configurar, no se sube a git)
├── front/
│   ├── index.html           ← Página principal (SPA)
│   ├── admin.html           ← Panel de administración de permisos
│   └── appHorarios.js       ← Toda la lógica del front (llama a los endpoints de api/)
└── variables/
    ├── horariosdocentes.sql ← Script de creación de la BD
    └── .env.example         ← Plantilla de configuración para back/
```

> **Importante:** el front (`front/appHorarios.js`) llama siempre a `/api/horarios` y `/api/admin`.
> Eso significa que la app en producción usa la carpeta **`api/`**, no `back/`.
> La carpeta `back/` es un servidor Express independiente que se dejó para poder
> correr y probar el proyecto de forma 100% local, con su propia base de datos MySQL local.
> Sus rutas son distintas a las de `api/` y no están conectadas al `front/` actual.

---

## Despliegue en producción (Vercel + Railway)

La app real, la que usan los usuarios, está desplegada así:

- **Vercel** aloja el frontend (`front/`) y las funciones serverless (`api/`).
- **Railway** aloja únicamente la base de datos MySQL (no corre código de la app).

### Variables de entorno necesarias en Vercel

Configuradas en *Project → Settings → Environment Variables*:

| Variable | Descripción |
|---|---|
| `MYSQLHOST` | Host del proxy público de MySQL en Railway (no el host interno `*.railway.internal`) |
| `MYSQLPORT` | Puerto del proxy público (Railway lo asigna, no siempre es 3306) |
| `MYSQLUSER` | Usuario de MySQL (normalmente `root`) |
| `MYSQLPASSWORD` | Contraseña de MySQL |
| `MYSQLDATABASE` | Nombre de la base de datos en Railway |
| `ADMIN_PASSWORD` | Contraseña para entrar al panel `front/admin.html` |
| `MODO_SOLO_LECTURA` | `"true"` para bloquear crear/editar/borrar globalmente, `"false"` en operación normal |

> Estas variables están marcadas como **"Sensible"** para los entornos Production/Preview,
> por lo que una vez guardadas no se pueden volver a leer desde el dashboard ni por CLI.
> Para desarrollo local (ver siguiente sección) hace falta crearlas también en el entorno
> **Development**, ya que ese entorno no admite variables sensibles.

### Desarrollo local con `vercel dev` (recomendado)

Esto simula el entorno de producción completo (front + funciones de `api/`) en tu propia máquina:

```bash
npm install -g vercel
vercel login
vercel link                      # vincula esta carpeta con el proyecto real en Vercel
vercel env add MYSQLHOST development
vercel env add MYSQLPORT development
vercel env add MYSQLUSER development
vercel env add MYSQLPASSWORD development
vercel env add MYSQLDATABASE development
vercel env add ADMIN_PASSWORD development
vercel env add MODO_SOLO_LECTURA development
vercel env pull .env.local        # descarga esas variables a un archivo local
vercel dev                        # levanta el entorno local en http://localhost:3000
```

Luego abre `http://localhost:3000/front/index.html` o `http://localhost:3000/front/admin.html`.

---

## Desarrollo 100% local con `back/` (alternativa sin Vercel)

Esta opción usa una base de datos MySQL local propia (no la de Railway) y el servidor Express de
`back/`. Es útil si no tienes acceso a la CLI de Vercel, pero ten en cuenta que sus rutas no
coinciden con las que usa `front/appHorarios.js` tal como está hoy.

### PASO 1 – Crear la Base de Datos

1. Abra **MySQL Workbench** y conéctese con el usuario `root`
2. Abra el archivo `variables/horariosdocentes.sql`
3. Ejecute el script completo (F5 o botón Execute)
4. Verifique que se creó la base `horariosdocentes` y la tabla `horarios_docentes`

---

### PASO 2 – Configurar Variables de Entorno

Copie `variables/.env.example` como `back/.env` y ajuste la contraseña de MySQL:

```
HOST=127.0.0.1
PORT=8080
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña_aqui   ← Cambie esto por su contraseña real
DB_NAME=horariosdocentes
```

> `back/.env` nunca debe subirse a git (ya está en `.gitignore`).

---

### PASO 3 – Instalar Dependencias Node.js

Abra CMD en modo Administrador y ejecute:

```cmd
cd ruta\a\horariosDocenteApp\back
npm install
```

Esto instala: `express`, `mysql2`, `dotenv`, `cors`

Para verificar:
```cmd
npm list
```

---

### PASO 4 – Iniciar el Servidor

Desde CMD, estando en la carpeta `back/`:

```cmd
node servidor.js
```

Debería ver en consola:
```
[BD] Conexión a MySQL establecida correctamente.
=================================================
  horariosDocenteApp - Servidor iniciado
  URL: http://127.0.0.1:8080
=================================================
```

---

### PASO 5 – Abrir en el Navegador

Abra su navegador web y vaya a:

```
http://127.0.0.1:8080
```

---

## Endpoints de la API real (`api/`, usados en producción)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/health | Verificación del servicio y la BD |
| GET | /api/horarios | Listado completo de horarios |
| POST | /api/horarios | Crear horario (body JSON) |
| PUT | /api/horarios?id=N | Editar horario con ese ID (body JSON) |
| DELETE | /api/horarios?id=N | Eliminar horario con ese ID |
| GET | /api/admin | Obtener configuración de permisos (crear/editar/borrar) |
| POST | /api/admin | Actualizar configuración de permisos (requiere `clave_admin`) |

## Endpoints alternativos (`back/`, solo si corres el servidor Express local)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/horarios/list | Listado con búsqueda y orden |
| GET | /api/horarios/list-basic | Listado sin filtros |
| GET | /api/horarios/byidHorario?idHorario=N | Buscar por ID |
| GET | /api/horarios/check?field=...&value=... | Verificar duplicado de campo |
| GET | /api/horarios/check-duplicado?... | Verificar duplicado completo |
| POST | /api/horarios | Crear horario |
| PUT | /api/horarios/:id | Editar horario |
| DELETE | /api/horarios/by-idHorario | Eliminar horario (body JSON) |

---

## Solución de Problemas

**Error: Cannot find module 'express'**
→ Ejecute `npm install` en la carpeta `back/`

**Error: Access denied for user 'root'**
→ Revise la contraseña en `back/.env`

**Error: Unknown database 'horariosdocentes'**
→ Ejecute el script SQL del paso 1

**El navegador no carga la página**
→ Verifique que el servidor esté corriendo (`node servidor.js`)
→ Asegúrese de acceder a `http://127.0.0.1:8080` (no localhost si hay conflictos)

**El panel admin no avanza al ingresar la contraseña, corriendo con Live Server**
→ Live Server no ejecuta las funciones de `api/`. Usa `vercel dev` en su lugar
(ver sección "Desarrollo local con vercel dev" arriba).

---

## Detener el Servidor

En la ventana CMD donde corre el servidor, presione:
```
Ctrl + C
```