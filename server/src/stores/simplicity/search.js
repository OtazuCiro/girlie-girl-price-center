import { createVtexStore } from "../vtex/createVtexStore.js";

export function createSimplicityStore(options = {}) {
  return createVtexStore({
    name: "Simplicity",
    origin: "https://www.simplicity.com.ar",
    ...options,
  });
}

export const simplicityStore = createSimplicityStore();
