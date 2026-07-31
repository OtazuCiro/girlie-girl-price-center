import { describe, expect, it } from "vitest";

import {
  buildProductSearchQuery,
  keepFreshestProduct,
  matchesFavorite,
  mergeFavoriteUpdates,
  resolveFavoriteGroup,
  selectPrimaryOffer,
} from "./currentProduct.js";

const revlonFavorite = {
  productKey: "legacy-revlon-key",
  brand: "Revlon",
  name: "Revlon Colorstay Skin Awaken 5 In 1 Concealer Corrector 015 Light 8 ml",
  offerIds: ["legacy-farmaplus-offer"],
};

const revlonGroup = {
  productKey: "current-revlon-key",
  brand: "Revlon",
  displayName: "Revlon Colorstay Skin Awaken 5 In 1 Concealer Corrector 015 Light 8 ml",
  bestPriceOfferId: "farmaplus-current",
  offers: [
    {
      id: "farmaplus-current",
      store: "Farmaplus",
      currentPrice: 10428,
      inStock: true,
    },
  ],
};

describe("current product resolution", () => {
  it("does not duplicate the brand in a canonical favorite search", () => {
    expect(
      buildProductSearchQuery({
        brand: "Revlon",
        name: revlonFavorite.name,
      }),
    ).toBe(revlonFavorite.name);
  });

  it("resolves the Revlon favorite after productKey and offerId changed", () => {
    expect(resolveFavoriteGroup([revlonGroup], revlonFavorite)).toBe(revlonGroup);
  });

  it("uses the same match and primary offer for favorites and detail", () => {
    expect(matchesFavorite(revlonGroup, revlonFavorite)).toBe(true);
    expect(selectPrimaryOffer(revlonGroup)).toEqual(
      expect.objectContaining({ store: "Farmaplus", currentPrice: 10428 }),
    );
  });

  it("does not let an older empty response overwrite valid offers", () => {
    expect(keepFreshestProduct(revlonGroup, null)).toBe(revlonGroup);
    expect(
      mergeFavoriteUpdates(
        { [revlonFavorite.productKey]: revlonGroup },
        [{ productKey: revlonFavorite.productKey, group: null }],
      ),
    ).toEqual({ [revlonFavorite.productKey]: revlonGroup });
  });

  it("keeps a truly unavailable product empty", () => {
    expect(keepFreshestProduct(undefined, null)).toBeNull();
  });
});
