import { createVtexStore } from "../vtex/createVtexStore.js";

export function createPigmentoStore(options = {}) {
  return createVtexStore({
    name: "Pigmento",
    origin: "https://www.perfumeriaspigmento.com.ar",
    ...options,
  });
}

export const pigmentoStore = createPigmentoStore();
