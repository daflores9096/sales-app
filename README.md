# Sales App

Aplicacion web para gestion de productos, ventas, importacion de inventario, usuarios, historico de ventas y dashboard de reportes.

## Arquitectura

El proyecto corre con Docker Compose y expone un solo servicio publico:

- `web`: Nginx publico. Sirve el build React y proxya `/api` hacia el backend.
- `api`: PHP 8.2 + Apache. Queda solo dentro de la red Docker.
- `db`: MySQL 5.7. Queda solo dentro de la red Docker en el compose base.

El frontend esta en `frontend/` y usa React + Vite + Tailwind. El backend esta en `api/`. Los scripts de inicializacion de base de datos estan en `database/`.

## Requisitos Locales

- Docker Desktop instalado y en ejecucion.
- Docker Compose disponible con `docker compose`.
- Git, si vas a clonar o actualizar desde repositorio.
- Node.js 22 o compatible solo si vas a usar `npm run dev` fuera de Docker.

## Variables De Entorno

1. Copia el archivo de ejemplo:

```powershell
copy .env.example .env
```

En Linux/macOS:

```bash
cp .env.example .env
```

2. Revisa `.env` y ajusta si corresponde:

```env
WEB_PORT=18080
APP_URL=http://localhost:18080

MYSQL_DATABASE=app_db
MYSQL_USER=app_user
MYSQL_PASSWORD=app_password
MYSQL_ROOT_PASSWORD=rootpassword

JWT_SECRET=super_secret_key_123
JWT_TTL=3600
APP_ENV=development
APP_DEBUG=true

VITE_DEV_API_PROXY=http://127.0.0.1:18080
PMA_PORT=8081
```

Notas:

- `WEB_PORT` define el puerto local de la aplicacion.
- `APP_URL` debe coincidir con la URL publica usada por el usuario.
- `JWT_SECRET` debe cambiarse en produccion.
- `APP_DEBUG` debe estar en `false` en produccion.

## Levantar Ambiente Local

Desde la raiz del proyecto:

```powershell
cd C:\projects\sales-app
docker compose up -d --build
```

La primera ejecucion puede tardar porque descarga imagenes, instala dependencias y crea la base de datos.

Verifica que todo este arriba:

```powershell
docker compose ps
```

La aplicacion queda disponible en:

- App: `http://localhost:18080` o el puerto configurado en `WEB_PORT`.
- API: `http://localhost:18080/api` mediante Nginx.

Si en tu `.env` tienes, por ejemplo, `WEB_PORT=38080`, abre:

```text
http://localhost:38080
```

## Credenciales Iniciales

Cuando la base de datos se inicializa por primera vez, se crean estos usuarios:

Superadmin:

- Usuario: `superadmin`
- Contrasena: `StrongP@ssw0rd`
- Email: `super@local`

Admin:

- Usuario: `admin`
- Contrasena: `AdminP@ssw0rd`
- Email: `admin@local`

Roles:

- `superadmin`: acceso completo.
- `admin`: gestion operativa, usuarios permitidos, productos, ventas e historico.
- `user` / Vendedor: ventas, mis ventas y dashboard filtrado a sus propias ventas.

## Base De Datos

Valores por defecto:

- Host interno Docker: `db`
- Base de datos: `app_db`
- Usuario: `app_user`
- Contrasena: `app_password`
- Root password: `rootpassword`

Los scripts de inicializacion se ejecutan solo cuando el volumen de MySQL se crea por primera vez:

- `database/00-charset.sql`
- `database/schema.sql`
- `database/02-superadmin.sql`
- `database/03-admin.sql`

Si modificas estos scripts y necesitas recrear todo desde cero:

```powershell
docker compose down -v
docker compose up -d --build
```

Advertencia: `docker compose down -v` elimina el volumen `db_data` y borra los datos locales.

## Comandos Utiles Locales

Ver estado:

```powershell
docker compose ps
```

Ver logs generales:

```powershell
docker compose logs -f
```

Ver logs por servicio:

```powershell
docker compose logs -f web
docker compose logs -f api
docker compose logs -f db
```

Reiniciar servicios:

```powershell
docker compose restart web
docker compose restart api
docker compose restart db
```

Reconstruir todo:

```powershell
docker compose up -d --build
```

Reconstruir solo frontend servido por Nginx:

```powershell
docker compose up -d --build web
```

Reconstruir solo API:

```powershell
docker compose up -d --build api
```

Apagar sin borrar datos:

```powershell
docker compose down
```

Apagar borrando datos locales:

```powershell
docker compose down -v
```

## phpMyAdmin Opcional

Levantar phpMyAdmin junto al stack:

```powershell
docker compose -f docker-compose.yml -f docker-compose.phpmyadmin.yml up -d
```

URL:

```text
http://localhost:8081
```

O el puerto configurado en `PMA_PORT`.

Credenciales por defecto:

- Servidor: `db`
- Usuario: `root`
- Contrasena: valor de `MYSQL_ROOT_PASSWORD`

Para detenerlo:

```powershell
docker compose -f docker-compose.yml -f docker-compose.phpmyadmin.yml down
```

## Conectar MySQL Desde El Host

El compose base no expone MySQL al host. Para usar DBeaver, MySQL Workbench u otra herramienta local:

```powershell
docker compose -f docker-compose.yml -f docker-compose.db-port.yml up -d
```

Conexion:

- Host: `localhost`
- Puerto: `3306` o el valor de `MYSQL_PORT`
- Base de datos: `app_db`
- Usuario: `app_user`
- Contrasena: `app_password`

Si el puerto `3306` ya esta ocupado, define otro en `.env`:

```env
MYSQL_PORT=3308
```

Y conecta a `localhost:3308`.

## Desarrollo Frontend Con Vite

Para trabajar con hot reload en React:

1. Levanta los servicios Docker para tener API y base de datos:

```powershell
docker compose up -d
```

2. Instala dependencias y arranca Vite:

```powershell
cd frontend
npm install
npm run dev
```

3. Abre:

```text
http://localhost:5173
```

El proxy de Vite envia `/api` hacia `VITE_DEV_API_PROXY`, por defecto:

```env
VITE_DEV_API_PROXY=http://127.0.0.1:18080
```

Si cambiaste `WEB_PORT`, ajusta tambien `VITE_DEV_API_PROXY`.

## Iteracion Rapida Del Frontend En Docker

Si no quieres reconstruir la imagen `web` completa cada vez:

```powershell
cd frontend
npm run build
cd ..
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d web
```

El overlay `docker-compose.dev.yml` monta `frontend/dist` directamente en Nginx.

## Funcionalidades Principales

- Login con JWT.
- Roles: superadmin, admin y vendedor.
- Dashboard con filtros por dia, semana, mes y rango.
- Dashboard con tarjetas de ventas, ingresos, productos vendidos y ventas por tipo de pago.
- Gestion de productos.
- Importacion Excel de productos con columna `stock` y actualizacion de productos existentes.
- TPV para registrar ventas.
- Confirmacion de venta con metodo de pago: Efectivo, QR o Tarjeta.
- Historico de ventas, detalle y anulacion con restauracion de stock.
- Gestion de usuarios segun permisos.

## Formato De Excel Para Importar Productos

La opcion `Productos > Importar Excel` espera estas columnas:

```text
nombre_producto, barcode, marca, precio_compra, precio_venta, stock
```

Reglas:

- `nombre_producto`, `precio_compra`, `precio_venta` y `stock` son obligatorios.
- `precio_compra`, `precio_venta` y `stock` deben ser numericos.
- Si el producto ya existe por `barcode`, se actualiza.
- Si no hay coincidencia por `barcode`, se busca por `nombre_producto`.
- Solo se actualizan campos que cambiaron.
- Si el stock en base es `20` y el Excel trae `50`, queda actualizado a `50`.

## Produccion Con Docker

La forma recomendada de desplegar es mantener el mismo stack Docker:

- `web` como unico servicio expuesto.
- `api` y `db` solo en red interna Docker.
- Un proxy reverso externo como Nginx, Caddy, Traefik o un balanceador cloud terminando HTTPS.

### 1. Preparar El Servidor

Instala en el servidor:

- Docker Engine.
- Docker Compose plugin.
- Git.
- Certbot/Nginx, Caddy, Traefik o el proxy HTTPS que uses.

En Ubuntu/Debian, de forma resumida:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
```

Instala Docker siguiendo la documentacion oficial de Docker para tu distribucion.

### 2. Obtener El Codigo

Ejemplo:

```bash
cd /opt
sudo git clone https://github.com/daflores9096/sales-app.git
sudo chown -R $USER:$USER /opt/sales-app
cd /opt/sales-app
```

Si usas otra ruta, mantente consistente en scripts de backup y despliegue.

### 3. Crear `.env` De Produccion

```bash
cp .env.example .env
nano .env
```

Ejemplo:

```env
WEB_PORT=18080
APP_URL=https://ventas.tudominio.com

MYSQL_DATABASE=sales_app
MYSQL_USER=sales_user
MYSQL_PASSWORD=CAMBIAR_PASSWORD_MYSQL
MYSQL_ROOT_PASSWORD=CAMBIAR_ROOT_PASSWORD

JWT_SECRET=CAMBIAR_SECRET_LARGO_ALEATORIO
JWT_TTL=3600
APP_ENV=production
APP_DEBUG=false

PMA_PORT=8081
```

Recomendaciones:

- Usa passwords largos y unicos.
- No subas `.env` al repositorio.
- No expongas MySQL publicamente.
- No levantes phpMyAdmin en produccion salvo que este protegido por VPN, firewall o autenticacion adicional.

### 4. Levantar Produccion

```bash
docker compose up -d --build
docker compose ps
```

La app quedara escuchando internamente en el puerto definido por `WEB_PORT`, por ejemplo:

```text
http://127.0.0.1:18080
```

### 5. Configurar Dominio Y HTTPS

Configura tu DNS:

```text
ventas.tudominio.com -> IP_PUBLICA_DEL_SERVIDOR
```

Ejemplo de Nginx en el host como proxy reverso:

```nginx
server {
    listen 80;
    server_name ventas.tudominio.com;

    location / {
        proxy_pass http://127.0.0.1:18080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Luego emite certificado HTTPS, por ejemplo con Certbot:

```bash
sudo certbot --nginx -d ventas.tudominio.com
```

Si usas Caddy, Traefik o un proxy cloud, apunta el upstream a:

```text
127.0.0.1:18080
```

### 6. Firewall

Expone solo:

- `80/tcp`
- `443/tcp`
- `22/tcp` restringido si es posible

No expongas:

- MySQL `3306`
- phpMyAdmin `8081`, salvo acceso controlado
- API directamente

Con UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 7. Actualizar Una Instalacion En Produccion

Desde la carpeta del proyecto:

```bash
git pull
docker compose up -d --build
docker compose ps
```

Verifica logs:

```bash
docker compose logs -f web
docker compose logs -f api
```

### 8. Backups De Base De Datos

Backup manual:

```bash
mkdir -p backups
docker exec ventas_mysql_db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot "$MYSQL_DATABASE"' > backups/sales-app-$(date +%F-%H%M).sql
```

Restaurar un backup:

```bash
docker exec -i ventas_mysql_db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot "$MYSQL_DATABASE"' < backups/archivo.sql
```

Recomendaciones:

- Automatiza backups con cron.
- Copia backups fuera del servidor.
- Prueba restauraciones periodicamente.
- Cifra backups si contienen datos sensibles.

### 9. Persistencia

Los datos MySQL viven en el volumen Docker:

```text
db_data
```

No ejecutes `docker compose down -v` en produccion salvo que quieras borrar la base de datos.

### 10. Logs Y Diagnostico En Produccion

Estado:

```bash
docker compose ps
```

Logs:

```bash
docker compose logs -f web
docker compose logs -f api
docker compose logs -f db
```

Probar API desde el servidor:

```bash
curl -i http://127.0.0.1:18080/api
```

Si el frontend carga pero `/api` falla con 502:

```bash
docker compose ps
docker compose logs --tail=100 web api
docker compose restart web
```

El Nginx interno usa el resolver Docker `127.0.0.11` para evitar IPs antiguas del contenedor `api`.

## Migraciones Y Cambios De Esquema

Actualmente el proyecto inicializa esquema desde `database/schema.sql` para instalaciones nuevas.

En instalaciones existentes, si se agrega una columna nueva al esquema, debes aplicar el `ALTER TABLE` correspondiente manualmente o mediante un script de migracion controlado antes de desplegar codigo que la use.

Ejemplo usado para metodos de pago:

```sql
ALTER TABLE sales
ADD COLUMN payment_method ENUM('cash','qr','card') NOT NULL DEFAULT 'cash' AFTER status;
```

Antes de aplicar cambios de esquema en produccion:

1. Haz backup.
2. Prueba en staging/local.
3. Aplica la migracion.
4. Despliega el codigo.
5. Verifica logs y funcionalidad.

## Problemas Frecuentes

### `localhost` no abre

Verifica puerto y contenedores:

```powershell
docker compose ps
```

Revisa el valor de `WEB_PORT` en `.env`. Si es `38080`, abre:

```text
http://localhost:38080
```

### Error HTTP 502 En Login O API

Revisa logs:

```powershell
docker compose logs --tail=100 web api
```

Reinicia `web`:

```powershell
docker compose restart web
```

Si reconstruiste `api`, tambien puedes levantar ambos:

```powershell
docker compose up -d --build api web
```

### Cambios De Frontend No Se Ven

Reconstruye `web`:

```powershell
docker compose up -d --build web
```

Luego recarga fuerte en el navegador:

```text
Ctrl + F5
```

### MySQL No Toma Cambios De `schema.sql`

Los scripts de inicializacion solo corren cuando el volumen esta vacio. En local puedes recrear:

```powershell
docker compose down -v
docker compose up -d --build
```

En produccion no borres el volumen; aplica migraciones con `ALTER TABLE`.

## Seguridad Basica Para Produccion

- Cambiar `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` y `JWT_SECRET`.
- Usar `APP_ENV=production` y `APP_DEBUG=false`.
- Usar HTTPS.
- No exponer MySQL al publico.
- No exponer phpMyAdmin al publico.
- Mantener backups.
- Restringir SSH.
- Actualizar imagenes y sistema operativo periodicamente.
- Revisar logs despues de cada despliegue.

## Estructura Relevante

```text
api/                         Backend PHP
database/                    SQL de inicializacion
docker/php/Dockerfile        Imagen API PHP + Apache
docker/web/Dockerfile        Build React + Nginx
docker/web/nginx.conf        Nginx publico y proxy /api
frontend/                    React + Vite + Tailwind
docker-compose.yml           Stack base
docker-compose.dev.yml       Overlay frontend dist local
docker-compose.db-port.yml   Overlay para exponer MySQL
docker-compose.phpmyadmin.yml Overlay phpMyAdmin
.env.example                 Variables de ejemplo
```
