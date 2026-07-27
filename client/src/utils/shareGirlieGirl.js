export const SHARE_TITLE = "Girlie Girl Price Central";
export const SHARE_TEXT =
  "Que complementes tu preciosura con los mejores precios 💗";

export function createShareData(locationImpl = globalThis.location) {
  return {
    title: SHARE_TITLE,
    text: SHARE_TEXT,
    url: locationImpl?.origin ?? "",
  };
}

export async function shareGirlieGirl({
  navigatorImpl = globalThis.navigator,
  locationImpl = globalThis.location,
} = {}) {
  const data = createShareData(locationImpl);

  if (typeof navigatorImpl?.share === "function") {
    try {
      await navigatorImpl.share(data);
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }

  if (typeof navigatorImpl?.clipboard?.writeText === "function") {
    try {
      await navigatorImpl.clipboard.writeText(data.url);
      return "copied";
    } catch {
      return "unavailable";
    }
  }

  return "unavailable";
}
