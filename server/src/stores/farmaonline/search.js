import { createVtexStore } from "../vtex/createVtexStore.js";

export function createFarmaonlineStore(options = {}) {
  return createVtexStore({
    name: "Farmaonline",
    origin: "https://www.farmaonline.com",
    ...options,
  });
}

export const farmaonlineStore = createFarmaonlineStore();
