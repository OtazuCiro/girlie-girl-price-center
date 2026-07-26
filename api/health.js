import app from "../server/src/app.js";

// Vercel ejecuta esta app como una función; el proceso local sigue usando
// server/src/server.js, que es el único lugar donde se llama a app.listen().
export default app;

