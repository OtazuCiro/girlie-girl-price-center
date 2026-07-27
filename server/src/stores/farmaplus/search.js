import { createVtexStore } from "../vtex/createVtexStore.js";

export function createFarmaplusStore(options = {}) {
  return createVtexStore({
    name: "Farmaplus",
    origin: "https://www.farmaplus.com.ar",
    ...options,
  });
}

export const farmaplusStore = createFarmaplusStore();
