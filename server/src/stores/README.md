# Adaptadores de tiendas

Cada tienda tiene su propio directorio y devuelve productos con la forma
`NormalizedProduct` definida en `../models/normalizedProduct.js`.

Juleriaque, Farmacity y Pigmento tienen configuración e identidad separadas.
Como los tres catálogos usan VTEX, comparten el transporte y normalizador de
`vtex/createVtexStore.js`, sin exponer respuestas crudas al frontend.

No agregar lógica de coordinación, caché o rutas HTTP dentro de un adaptador.
Esas responsabilidades viven en `services/` y `routes/`.
