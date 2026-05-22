# Sales App

Aplicación para registrar ventas en una tienda.

- `api`: backend PHP + Apache
- `frontend`: React + Vite + Tailwind, servido con Nginx en Docker

El ambiente local se levanta con un solo `docker-compose.yml` en la raíz (patrón similar a [budget-manager](https://github.com/codedthemes/berry-free-angular-admin-template)).

## Requisitos

- Docker Desktop instalado y en ejecución
- Docker Compose disponible desde la terminal

## Configuración inicial

```bash
cd c:\projects\sales-app
copy .env.example .env
docker compose up -d --build
```

La primera ejecución puede tardar porque descarga imágenes y construye los contenedores.

## Servicios

| Servicio | Descripción |
|----------|-------------|
| `web` | React (build) + Nginx — **único puerto público** |
| `api` | PHP 8.2 + Apache (solo red Docker) |
| `db` | MySQL 5.7 (solo red Docker) |

Opcional con overlays:

- `docker-compose.db-port.yml` — expone MySQL en el host
- `docker-compose.phpmyadmin.yml` — phpMyAdmin
- `docker-compose.dev.yml` — monta `frontend/dist` sin rebuild de imagen

## URLs locales

- **App (producción Docker):** `http://localhost:18080` (o el valor de `WEB_PORT` en `.env`)
- **API:** `http://localhost:18080/api` (proxy vía Nginx)
- **Dev React (Vite):** `http://localhost:5173` — requiere `docker compose up -d` para API y proxy `/api`

### phpMyAdmin (opcional)

```bash
docker compose -f docker-compose.yml -f docker-compose.phpmyadmin.yml up -d
```

- URL: `http://localhost:8081` (o `PMA_PORT` en `.env`)

### MySQL desde el host (opcional)

```bash
docker compose -f docker-compose.yml -f docker-compose.db-port.yml up -d
```

## Credenciales

### Usuario de la aplicación

Cuando la base de datos se inicializa por primera vez:

#### Superadmin

- Usuario: `superadmin`
- Contraseña: `StrongP@ssw0rd`
- Email: `super@local`

#### Admin

- Usuario: `admin`
- Contraseña: `AdminP@ssw0rd`
- Email: `admin@local`

Con **admin** o **superadmin** puedes gestionar usuarios, productos, histórico global y anulación de ventas. Los vendedores (`user`) ven **Ventas (TPV)** y **Mis ventas**.

### Base de datos

- Base de datos: `app_db`
- Usuario: `app_user`
- Contraseña: `app_password` (configurable en `.env`)
- Root password: `rootpassword` (configurable en `.env`)

## Inicialización de base de datos

Scripts en `database/` montados en `/docker-entrypoint-initdb.d/`:

- `00-charset.sql`
- `schema.sql`
- `02-superadmin.sql`
- `03-admin.sql`

## Desarrollo del frontend

Con la API en Docker:

```bash
docker compose up -d
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. El proxy de Vite envía `/api` a `VITE_DEV_API_PROXY` (por defecto `http://127.0.0.1:18080`).

Iteración rápida sin rebuild de imagen `web`:

```bash
cd frontend && npm run build
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d web
```

## Ver contenedores activos

```bash
docker compose ps
```

## Ver logs

```bash
docker compose logs -f
docker compose logs -f web
docker compose logs -f api
```

## Apagar el ambiente

```bash
docker compose down
```

## Reiniciar la base de datos desde cero

```bash
docker compose down -v
docker compose up -d --build
```

## Reconstruir servicios

```bash
docker compose up -d --build web
docker compose up -d --build api
```

## Acentos / UTF-8

MySQL usa `utf8mb4` en el servicio `db`. Si ya tenías un volumen con datos corruptos, recrea con `docker compose down -v`.
