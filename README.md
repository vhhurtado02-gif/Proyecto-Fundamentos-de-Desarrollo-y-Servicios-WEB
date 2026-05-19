# horariosDocenteApp
**CIAF – Corporación Instituto de Administración y Finanzas**
Proyecto: Administración de Horarios Docentes
Stack: Node.js + Express.js + MySQL + HTML + JavaScript puro

---

## Estructura del Proyecto

```
horariosDocenteApp/
├── back/
│   ├── servidor.js          ← Servidor principal Express
│   ├── conexionBD.js        ← Pool de conexiones MySQL
│   ├── rutasHorarios.js     ← Endpoints API REST
│   ├── sanitizador.js       ← Funciones de sanitización
│   ├── validadorHorario.js  ← Validación de datos
│   ├── package.json         ← Dependencias Node.js
│   └── .env                 ← Variables de entorno (configurar)
├── front/
│   ├── index.html           ← Página principal (SPA)
│   └── appHorarios.js       ← Toda la lógica del front
└── variables/
    ├── horariosdocentes.sql ← Script de creación de la BD
    └── .env.example         ← Plantilla de configuración
```

---

## PASO 1 – Crear la Base de Datos

1. Abra **MySQL Workbench** y conéctese con el usuario `root`
2. Abra el archivo `variables/horariosdocentes.sql`
3. Ejecute el script completo (F5 o botón Execute)
4. Verifique que se creó la base `horariosdocentes` y la tabla `horarios_docentes`

---

## PASO 2 – Configurar Variables de Entorno

Abra el archivo `back/.env` y ajuste la contraseña de MySQL:

```
HOST=127.0.0.1
PORT=8080
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=12345       ← Cambie esto si su contraseña es diferente
DB_NAME=horariosdocentes
```

> **Nota:** En las salas de sistemas del CIAF la contraseña del root es `12345`.
> Si instaló MySQL con su número de identificación, cámbielo aquí.

---

## PASO 3 – Instalar Dependencias Node.js

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

## PASO 4 – Iniciar el Servidor

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

## PASO 5 – Abrir en el Navegador

Abra su navegador web y vaya a:

```
http://127.0.0.1:8080
```

---

## Endpoints de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/health | Verificación del servicio y BD |
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

---

## Detener el Servidor

En la ventana CMD donde corre el servidor, presione:
```
## Ctrl + C
```
## cd C:\Users\usuario\horariosDocenteApp\back  y despues ejecutar el siguiente comando para iniciar node servidor.js

## http://127.0.0.1:8080