export function sortByLowestPrice(products) {
  return [...products].sort((a, b) => a.currentPrice - b.currentPrice);
}

