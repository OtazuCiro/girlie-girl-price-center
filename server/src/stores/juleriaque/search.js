import {
  StoreSearchError,
  createVtexStore,
  normalizeVtexProduct,
  parseVtexResponse,
} from "../vtex/createVtexStore.js";

const STORE_NAME = "Juleriaque";

export const JuleriaqueStoreError = StoreSearchError;
export const normalizeJuleriaqueProduct = (product) =>
  normalizeVtexProduct(product, STORE_NAME);
export const parseJuleriaqueResponse = (payload) =>
  parseVtexResponse(payload, STORE_NAME);

export function createJuleriaqueStore(options = {}) {
  return createVtexStore({
    name: STORE_NAME,
    origin: "https://www.juleriaque.com.ar",
    ...options,
  });
}

export const juleriaqueStore = createJuleriaqueStore();
