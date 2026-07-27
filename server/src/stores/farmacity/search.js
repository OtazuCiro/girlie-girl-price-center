import { createVtexStore } from "../vtex/createVtexStore.js";

export function createFarmacityStore(options = {}) {
  return createVtexStore({
    name: "Farmacity",
    origin: "https://www.farmacity.com",
    ...options,
  });
}

export const farmacityStore = createFarmacityStore();
