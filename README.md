# Girlie Girl Price Central 🎀

> Que complementes tu preciosura con los mejores precios.
>
> Powered by tu gordito 💗

Aplicación web mobile-first para comparar precios de productos de belleza en
tiendas argentinas.

La versión actual incluye una experiencia visual, búsqueda y comparación bajo
demanda sobre los catálogos públicos de Juleriaque, Farmacity, Pigmento,
Farmaonline, Farmaplus y Simplicity, una
API Express serverless y preparación PWA. No incluye base de datos,
autenticación ni persistencia.

## Requisitos

- Node.js 22.x.
- npm 10 o superior.

## Estructura

```text
girlie-girl-price-central/
├── api/                    # Entry points serverless para Vercel
├── client/                 # React + Vite
│   ├── public/             # Manifest, iconos y assets
│   └── src/
│       ├── components/
│       └── data/           # Datos mock reservados para tests
├── server/                 # Node.js + Express
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   └── stores/         # Adaptadores aislados por tienda
│   └── test/
├── package.json            # Scripts raíz y npm workspaces
└── vercel.json
```

`server/src/app.js` define y exporta Express. `server/src/server.js` abre el
puerto únicamente para desarrollo local. `api/health.js` exporta esa misma app
para que Vercel la ejecute como función serverless, sin iniciar un servidor
persistente.

## Instalación

Desde la raíz:

```bash
npm install
```

npm instala los paquetes `client` y `server` mediante workspaces.

## Desarrollo local

Backend:

```bash
npm run dev:server
```

Frontend, en otra terminal:

```bash
npm run dev:client
```

URLs locales:

- Aplicación: `http://localhost:5173`
- API: `http://localhost:3001`
- Health: `http://localhost:3001/api/health`
- Búsqueda: `http://localhost:3001/api/search?q=maybelline`

Vite redirige `/api` a Express durante desarrollo. El cliente utiliza siempre
rutas relativas (`/api/health` y `/api/search`); no depende de `localhost` en
producción.

También se pueden ejecutar los scripts desde cada directorio:

```bash
cd client
npm run dev
npm run build
npm test

cd ../server
npm run dev
npm test
```

## Tests y build

Todos los tests:

```bash
npm test
```

Build de producción:

```bash
npm run build
```

El resultado se genera en `client/dist/`.

## Variables de entorno

La búsqueda funciona sin base de datos, pero el historial requiere PostgreSQL:

- `DATABASE_URL`: conexión a la rama Neon del environment actual.
- `PRICE_HISTORY_DATABASE_ROLE`: `preview`, `production` o `development`.

Preview y Production deben usar ramas Neon distintas y variables con scope
separado en Vercel. El rol debe coincidir con `VERCEL_ENV`; ante una
configuración incorrecta el historial se deshabilita y la búsqueda continúa.
No se imprimen conexiones ni errores internos en respuestas o logs.

Los archivos `.env` reales están ignorados por Git. Cuando se agreguen variables,
se deberán configurar también desde **Vercel → Project Settings → Environment
Variables**.

## Migraciones de historial

Las migraciones versionadas viven en `server/migrations/`. Son repetibles:
`schema_migrations` registra versión y checksum, omite las ya aplicadas y detiene
la ejecución si un archivo aplicado fue alterado.

Para una rama Preview:

```bash
VERCEL_ENV=preview \
PRICE_HISTORY_DATABASE_ROLE=preview \
MIGRATION_TARGET=preview \
DATABASE_URL="..." \
npm run migrate
```

Production requiere sus propias credenciales, `MIGRATION_TARGET=production` y
la confirmación explícita `ALLOW_PRODUCTION_MIGRATIONS=true`. Nunca reutilizar
la URL de Production en Preview.

## Publicar el repositorio en GitHub

1. Crear un repositorio vacío en GitHub, sin README, licencia ni `.gitignore`.
2. Desde la raíz local revisar los archivos:

   ```bash
   git status
   git add .
   git commit -m "Prepare Girlie Girl Price Central for deployment"
   ```

3. Renombrar la rama principal si se desea usar `main`:

   ```bash
   git branch -M main
   ```

4. Asociar el repositorio reemplazando la URL de ejemplo:

   ```bash
   git remote add origin https://github.com/USUARIO/REPOSITORIO.git
   git push -u origin main
   ```

No subir archivos `.env`, credenciales ni tokens.

## Deploy en Vercel

1. Iniciar sesión en [Vercel](https://vercel.com/) usando GitHub.
2. Elegir **Add New → Project**.
3. Importar el repositorio de Girlie Girl.
4. Mantener **Root Directory** en la raíz del repositorio.
5. Vercel leerá `vercel.json`. Verificar:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `client/dist`
   - Install Command: `npm install`
6. No agregar variables de entorno para este sprint.
7. Seleccionar **Deploy**.
8. Abrir la URL pública HTTPS y comprobar:
   - `/`
   - `/api/health`
   - `/api/search?q=maybelline`
   - `/manifest.webmanifest`
   - `/apple-touch-icon.png`
   - `/icon-192.png`
   - `/icon-512.png`

Cada push posterior a la rama conectada generará un nuevo deployment.

## PWA e iPhone

La aplicación incluye manifest, favicon, Apple Touch Icon, iconos PWA, metadata
de Safari y presentación `standalone`. El layout contempla safe areas de
dispositivos con notch o Dynamic Island.

Con la URL HTTPS desplegada:

1. Abrir la aplicación en Safari desde el iPhone.
2. Tocar **Compartir**.
3. Elegir **Agregar a pantalla de inicio**.
4. Confirmar el nombre **Girlie Girl** y tocar **Agregar**.
5. Abrir la aplicación desde el icono creado.

Esta versión requiere conexión: no incorpora service worker, modo offline,
sincronización en segundo plano ni notificaciones. Safari puede conservar en
caché iconos o metadata y requerir cerrar/reabrir la aplicación para reflejar
cambios.

## Comparación de tiendas

`GET /api/search?q=<texto>` consulta concurrentemente los endpoints JSON
públicos de Juleriaque, Farmacity, Pigmento, Farmaonline, Farmaplus y
Simplicity. Las seis tiendas usan VTEX y comparten un adaptador configurable;
no requieren login ni navegador headless.

Cada adaptador:

- limita cada búsqueda a 20 productos;
- cancela la consulta externa después de 8 segundos;
- envía un User-Agent identificable;
- convierte precios, promociones, stock, imágenes y URLs al contrato
  `NormalizedProduct`;
- utiliza una caché en memoria de 10 minutos por consulta y tienda;
- devuelve errores controlados sin exponer respuestas crudas ni stack traces.

Las tiendas se consultan en paralelo. Si alguna falla, la API devuelve los
resultados disponibles y describe el estado de cada fuente en `sources`; sólo
responde con error cuando fallan todas.

`productKey` identifica una presentación exacta y estable. Sólo ofertas de la
misma marca, tamaño, variante, tipo y cantidad de unidades pueden competir por
“Mejor precio”. Tamaños distintos, una unidad y un pack, packs con cantidades
distintas, variantes `waterproof` o `refill`, y sets frente a productos
individuales permanecen siempre separados. Un pack, kit, set o combo puede
aparecer como resultado propio y sólo se agrupa si otra tienda devuelve esa
misma presentación exacta.

El agrupamiento es deliberadamente conservador: ante la duda deja ofertas
separadas. “Mejor precio” se calcula sólo dentro de una presentación
exacta con al menos dos tiendas, ignorando ofertas sin stock; el ahorro se
compara contra la siguiente oferta disponible.

La caché es oportunista: puede perderse cuando Vercel recicla una función. No se
realiza fallback silencioso a mocks. Los mocks de `client/src/data/` se conservan
exclusivamente para tests.

## Favoritos

Los favoritos representan una presentación exacta (`productKey`), no ofertas de
una tienda. Se guardan en `localStorage` mediante una capa dedicada y la clave versionada
`girlieGirl:favorites:v1`. Esta opción mantiene v1.1 pequeña y privada para una
única usuaria, sin requerir cuentas ni base de datos.

Al abrir **Mis favoritos**, la aplicación vuelve a consultar la API en lotes
limitados y muestra precios y stock actuales. Los precios no se persisten. Si un
producto no puede actualizarse, permanece guardado y se indica que no hay
ofertas disponibles en ese momento.

En iOS, los favoritos pertenecen al almacenamiento local del sitio/PWA en ese
dispositivo. No se sincronizan con otros dispositivos o navegadores y pueden
perderse si Safari elimina los datos del sitio o la usuaria los borra. Una
implementación server-side futura puede reemplazar la capa de almacenamiento sin
cambiar los componentes de la interfaz.

## Historial de precios

v1.3 registra snapshots únicamente cuando una persona realiza una búsqueda real.
No existen cron, crawling periódico, alertas ni notificaciones. Una falla de
persistencia nunca convierte una búsqueda válida en error.

Cada snapshot pertenece a `productKey + store` y guarda fecha, precio actual,
precio anterior, descuento y stock. Una tabla de estado actual con clave única
permite que un UPSERT transaccional descarte estados consecutivos idénticos,
incluido el primer snapshot bajo concurrencia. Los nombres, marcas, URLs y
ofertas se normalizan en tablas separadas; no se duplican imágenes, HTML ni
respuestas de los catálogos.

`GET /api/history/:productKey?store=<tienda>&limit=<n>` devuelve como máximo 50
snapshots. La tendencia compara los dos últimos de la misma tienda. Mínimo,
máximo y promedio consideran precios con stock. “Buen precio” requiere al menos
5 snapshots con stock distribuidos en 7 días y un precio actual inferior al
promedio menos una desviación estándar.

## Compartir y privacidad

La acción **Compartir Girlie Girl** usa Web Share API en navegadores compatibles
y, como fallback, copia el `origin` actual al portapapeles. La metadata Open Graph
y Twitter utiliza el asset estático `client/public/social-preview.png` de
1200×630. No se hardcodean URLs de Preview.

La aplicación no incorpora analytics, trackers, cookies publicitarias,
fingerprinting, cuentas ni datos personales. Los únicos datos persistentes son
los favoritos funcionales guardados localmente en cada navegador.

La caché server-side sólo contiene resultados públicos por tienda y consulta; no
guarda estado de una usuaria ni mezcla respuestas entre búsquedas distintas.
Cada request construye su propia respuesta y las consultas a tiendas continúan
siendo concurrentes y tolerantes a fallos parciales. Para la escala inicial no se
agrega un rate limiter propio: Vercel aporta límites de plataforma y cada
búsqueda ya tiene límite de resultados, timeout y caché. Si el tráfico o abuso
real lo justifican, deberá evaluarse protección en el borde sin introducir
fricción en el uso normal.
