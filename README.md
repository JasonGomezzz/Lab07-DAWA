# Laboratorio 07 · Seguridad en aplicaciones con JWT

Solución del Laboratorio 07 de Desarrollo de Aplicaciones Web Avanzado (TECSUP). El proyecto `express-mongo-auth` implementa una API de autenticación con Express, MongoDB, bcrypt y JSON Web Tokens organizada por capas (modelo, repositorio, servicio, controlador, middleware, rutas y utilidades). Sobre esa API, la tarea agrega un frontend con EJS y Materialize: **Salvoconducto**, una interfaz que trata el JWT como un pase firmado.

Repositorio: [JasonGomezzz/Lab07-DAWA](https://github.com/JasonGomezzz/Lab07-DAWA)

## Requisitos

- Node.js 18 o superior (probado con Node 22.18).
- MongoDB local en `mongodb://localhost:27017` (probado con MongoDB 8.0 instalado con Homebrew).
- npm.
- Opcional: MongoDB Compass o `mongosh` para revisar la base de datos.

## Instalación y ejecución

```bash
npm install
```

```bash
cp .env.example .env
```

Edita `.env`: genera tu propia clave con `openssl rand -hex 32` para `JWT_SECRET` y define la contraseña del administrador inicial.

```bash
npm run dev
```

La aplicación queda en `http://localhost:3000` (la raíz redirige a `/signIn`). En el primer arranque, `seedRoles` crea los roles `user` y `admin`, y `seedUsers` crea el administrador definido en `.env`.

Pruebas automáticas (no necesitan MongoDB):

```bash
npm test
```

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). El archivo `.env` real no se versiona.

| Variable | Uso |
|---|---|
| `PORT` | Puerto de Express (3000). |
| `MONGODB_URI` | Conexión a MongoDB; la base se llama `auth_db`. |
| `JWT_SECRET` | Clave para firmar y verificar los tokens (HS256). Sin ella el servidor no arranca. |
| `JWT_EXPIRES_IN` | Vida del token (`1h`). |
| `BCRYPT_SALT_ROUNDS` | Rondas de sal de bcrypt (10). |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Credenciales del administrador que crea `seedUsers`. La contraseña va **entre comillas** porque dotenv corta los valores en `#`. |
| `ADMIN_NAME`, `ADMIN_LASTNAME`, `ADMIN_PHONE`, `ADMIN_BIRTHDATE` | Resto de campos obligatorios del administrador. |

## Estructura del proyecto

```text
Lab07-DAWA/
├── src/
│   ├── controllers/           # AuthController, UserController
│   ├── middlewares/           # authenticate, authorize, errorHandler
│   ├── models/                # Role, User
│   ├── public/
│   │   ├── css/               # app.css (tema sobre Materialize) y pages/*.css
│   │   ├── img/
│   │   └── js/                # auth.js (sesión JWT), ui.js y pages/*.js
│   ├── repositories/          # RoleRepository, UserRepository
│   ├── routes/                # auth.routes, users.routes, pages.routes
│   ├── services/              # AuthService, UserService
│   ├── utils/                 # seedRoles, seedUsers, passwordPolicy, age, password, httpError
│   ├── views/                 # Vistas EJS y parciales
│   └── server.js
├── test/                      # node --test
├── .env.example
└── package.json
```

## Procedimiento del documento

El historial de commits sigue el orden del documento: modelos `Role` y `User`, repositorios, servicios, controladores, middlewares `authenticate` y `authorize`, rutas, `seedRoles` y `server.js`. Con `npm run dev` el servidor se conecta a `auth_db`, siembra los roles `user` y `admin`, y queda escuchando en el puerto 3000. Los roles se consultan con `show dbs`, `use auth_db` y `db.roles.find().pretty()`.

## Tarea

### Requisitos previos: campos del modelo `User`

| Campo | Tipo | Restricción |
|---|---|---|
| `name` | String | Requerido (el formulario de registro lo pide). |
| `lastName` | String | Requerido. |
| `email` | String | Requerido, único, en minúsculas y con formato válido. |
| `password` | String (hash) | Mínimo 8 caracteres, 1 mayúscula, 1 dígito y 1 especial de `# $ % & * @`. Se valida **antes** de hashear (`src/utils/passwordPolicy.js`). |
| `phoneNumber` | String | Requerido; dígitos, espacios, guiones y `+` inicial. |
| `birthdate` | Date | Requerido; no puede ser futura. La **edad** es un campo virtual (`age`) calculado en `src/utils/age.js`. |
| `url_profile` | String | Opcional; solo `http://` o `https://`. |
| `address` | String | Opcional; hasta 120 caracteres. |
| `roles` | ObjectId[] → `Role` | `user` por defecto; `admin` solo mediante `seedUsers`. |

`seedUsers.js` registra el administrador desde `.env` y se llama en `server.js` después de `seedRoles`. Es idempotente: si el correo ya existe no hace nada, y no promueve a admin una cuenta creada desde el formulario público.

### Endpoints de la API

| Método | Ruta | Protección | Descripción |
|---|---|---|---|
| POST | `/api/auth/signUp` | Pública | Registra con rol `user`; ignora `roles` del body. |
| POST | `/api/auth/signIn` | Pública | Devuelve `{ token }` con `sub` y `roles`. |
| GET | `/api/users/me` | Token | Datos del usuario autenticado (con `age`, sin `password`). |
| PUT | `/api/users/me` | Token | Edita `name`, `lastName`, `phoneNumber`, `birthdate`, `url_profile` y `address`. Para cambiar la contraseña exige `currentPassword`. |
| GET | `/api/users` | Token + `admin` | Lista de usuarios sin hashes, de la más reciente a la más antigua. |
| GET | `/api/users/:id` | Token + `admin` | Ficha de un usuario. |
| GET | `/health` | Pública | Estado del servidor. |

Errores: 400 (validación, email duplicado, JSON mal formado), 401 (sin token, token inválido o caducado), 403 (rol insuficiente), 404 (recurso o ruta de API inexistente, en JSON) y 500 sin detalles internos.

### Páginas (EJS + Materialize)

| Ruta | Acceso | Contenido |
|---|---|---|
| `/signIn` | Invitado | Email y password → `POST /api/auth/signIn`; guarda el JWT en `sessionStorage` y redirige al dashboard según el rol. |
| `/signUp` | Invitado | name, lastName, phoneNumber, birthdate, email y password, con la checklist de la política en vivo → redirige a `/signIn`. |
| `/dashboard` | `user` o superior | "Te damos la bienvenida: aquí están tus datos". Credencial con los datos de `GET /api/users/me`, vigencia del token y anatomía del JWT. |
| `/profile` | `user` o superior | Muestra todos los datos y permite editarlos (`PUT /api/users/me`), incluida la contraseña. |
| `/admin/dashboard` | `admin` | Tabla de `GET /api/users` con fecha de registro, edad, rol y teléfono; búsqueda, filtro por rol y botón **Ver** que abre la ficha de `GET /api/users/:id`. |
| `/403` | — | Acceso denegado, con la ruta que se intentó abrir. |
| cualquier otra | — | 404 personalizada. |

### Reglas de navegación y dónde se aplican

El token vive en `sessionStorage`, y el navegador no lo envía cuando pide una página, así que **el servidor no sabe quién pide `/admin/dashboard`** y entrega la vista a cualquiera. Por eso la protección se reparte así:

- **En el navegador** (`src/public/js/auth.js`): sin token válido → `/signIn`; token con `exp` vencido → cierra la sesión y vuelve a `/signIn` (también con un temporizador mientras la página está abierta); rol insuficiente → `/403`; en `/signIn` con sesión activa → dashboard según el rol. El rol `admin` puede usar todo lo de `user`. Esto es experiencia de usuario: el navegador puede leer el payload pero no verificar la firma.
- **En el servidor** (`authenticate` + `authorize`): es la autorización real. Un token alterado a mano pasa la guarda del cliente, pero la API responde 401 y `auth.js` cierra la sesión. Lo mismo ocurre si el token caducó o la firma no coincide.

### Interfaz

Salvoconducto pertenece a la misma familia editorial que la Bitácora del Lab 06 (papel, tinta, bordes finos y titulares con una palabra en itálica de acento), pero cambia de concepto: el token es un **pase firmado**. Tiene paleta azul noche, burdeos de pasaporte y dorado de sello; tipografías Instrument Sans, Instrument Serif y Space Mono (para datos y tokens), autoalojadas con Fontsource. El dashboard muestra una credencial con zona MRZ (con dígitos de control ICAO 9303) y la página 403 un sello de "DENEGADO". Materialize aporta la grilla, el sidenav móvil, los toasts, la tabla, los chips y el modal; su tema se redefine en `src/public/css/app.css`.

## Cómo probar

1. `npm test`: 36 pruebas de política de contraseña, cálculo de edad, `authenticate`, `authorize` y el manejador de errores.
2. Flujo manual: crea una cuenta en `/signUp`, ingresa y revisa `/dashboard` y `/profile`. Luego intenta abrir `/admin/dashboard` (debe enviarte a `/403`). Cierra sesión e ingresa con el administrador de `.env` para ver el registro.
3. Expiración rápida: pon `JWT_EXPIRES_IN=1m` en `.env`, reinicia, ingresa y espera un minuto. La sesión se cierra sola y `/signIn` muestra "Tu sesión caducó".
4. Base de datos: en Compass, conéctate a `mongodb://localhost:27017` y abre `auth_db` → `roles` y `users` (o usa `mongosh`).

## Desviaciones respecto al enunciado

- **Nombres de campos:** el documento escribe `phoneNumer` y `adress`; se usan `phoneNumber` y `address`, que es como los nombra la sección de SignUp.
- **Script `dev`:** `nodemon --watch src src/server.js`. El flag `--experimental-specifier-resolution=node` ya no existe en Node 19+.
- **dotenv:** `import 'dotenv/config'` como primer import. En ESM los `import` se evalúan antes que el cuerpo del archivo, así que `dotenv.config()` llamado después llega tarde para cualquier módulo que lea `process.env` al cargarse.
- **`JWT_SECRET`:** no se usa la clave publicada en el documento; cada instalación genera la suya.
- **Dependencias:** `bcrypt` 6 (instala binarios precompilados en Node 22), Express 4 y Mongoose 7 como en el documento, más `ejs`, `@materializecss/materialize` 2.4 y fuentes de Fontsource servidas desde `node_modules`. `npm audit` reporta una alerta de `braces` que llega solo por `nodemon` (dependencia de desarrollo).
- **Seguridad sobre el código del documento:** `signUp` ignora `roles`; `GET /api/users` y `/me` nunca devuelven `password` (`toJSON` y `select('-password')`); `authenticate` fija `HS256`; email y password deben ser texto (bloquea filtros como `{"$ne": null}`); el email se normaliza a minúsculas también al iniciar sesión; el servidor no arranca si faltan `MONGODB_URI` o `JWT_SECRET`.
- **Endpoints añadidos:** `PUT /api/users/me` y `GET /api/users/:id`, necesarios para editar el perfil y "ver información de cada usuario".
- **Manejador de errores:** pasa de `server.js` a `src/middlewares/errorHandler.js` y traduce validaciones de Mongoose, duplicados y JSON mal formado a 400.
- **`name` requerido:** el documento lo deja opcional, pero el formulario de la tarea lo pide.
- **Modal de Materialize:** en la versión 2.4 `M.Modal.open()` está vacío; la ficha usa el `<dialog>` nativo con la clase `.modal`.
