# Girlie Girl Price Central 🎀

> Que complementes tu preciosura con los mejores precios.
>
> Powered by tu gordito 💗

Aplicación web mobile-first para comparar precios de productos de belleza en
tiendas argentinas.

La versión actual incluye una experiencia visual, búsqueda bajo demanda sobre
el catálogo público de Juleriaque, una API Express serverless y preparación PWA.
No incluye comparación entre tiendas, base de datos, autenticación ni
persistencia.

## Requisitos

- Node.js 20 o superior.
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

El proyecto no necesita variables de entorno en este sprint. `.env.example`
documenta esta situación y queda preparado para incorporar nombres de variables
futuras sin publicar valores privados.

Los archivos `.env` reales están ignorados por Git. Cuando se agreguen variables,
se deberán configurar también desde **Vercel → Project Settings → Environment
Variables**.

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

## Integración con Juleriaque

`GET /api/search?q=<texto>` consulta bajo demanda el endpoint JSON público del
catálogo de Juleriaque. No requiere login ni navegador headless.

El adaptador:

- limita cada búsqueda a 20 productos;
- cancela la consulta externa después de 8 segundos;
- envía un User-Agent identificable;
- convierte precios, promociones, stock, imágenes y URLs al contrato
  `NormalizedProduct`;
- utiliza una caché en memoria de 10 minutos por instancia;
- devuelve errores controlados sin exponer respuestas crudas ni stack traces.

La caché es oportunista: puede perderse cuando Vercel recicla una función. No se
realiza fallback silencioso a mocks. Los mocks de `client/src/data/` se conservan
exclusivamente para tests.

La insignia “Mejor precio” está desactivada mientras exista una sola tienda,
porque todavía no hay comparación de productos equivalentes entre comercios.
