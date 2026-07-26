# Adaptadores de tiendas

Cada tienda tiene su propio directorio y devuelve productos con la forma
`NormalizedProduct` definida en `../models/normalizedProduct.js`.

La primera integración es `juleriaque/search.js`. Consulta bajo demanda el
endpoint JSON público de catálogo de Juleriaque, normaliza los resultados y no
expone la respuesta cruda al frontend.

No agregar lógica de coordinación, caché o rutas HTTP dentro de un adaptador.
Esas responsabilidades viven en `services/` y `routes/`.
