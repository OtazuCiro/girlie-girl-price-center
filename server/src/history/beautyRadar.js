export const BEAUTY_RADAR_RULES = Object.freeze({
  recentDays: 14,
  minimumSnapshotsForHistoricalLow: 5,
  minimumObservedDaysForHistoricalLow: 3,
  minimumHistorySpanDays: 7,
  resultLimit: 10,
});

export function hasSufficientHistoryForNewLow({
  snapshotCount,
  observedDays,
  historySpanDays,
}) {
  return (
    snapshotCount >= BEAUTY_RADAR_RULES.minimumSnapshotsForHistoricalLow &&
    observedDays >= BEAUTY_RADAR_RULES.minimumObservedDaysForHistoricalLow &&
    historySpanDays >= BEAUTY_RADAR_RULES.minimumHistorySpanDays
  );
}

function validEntry(entry) {
  return (
    entry &&
    typeof entry.name === "string" &&
    typeof entry.store === "string" &&
    Number.isFinite(entry.currentPrice) &&
    Number.isFinite(entry.difference)
  );
}

function byAbsoluteDifference(left, right) {
  return (
    Math.abs(right.difference) - Math.abs(left.difference) ||
    left.name.localeCompare(right.name, "es")
  );
}

export function normalizeBeautyRadarPayload(payload, limit = 10) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 10, 1), 10);
  const recentDrops = Array.isArray(payload?.recentDrops)
    ? payload.recentDrops
        .filter((entry) => validEntry(entry) && entry.difference < 0)
        .sort(byAbsoluteDifference)
        .slice(0, cappedLimit)
    : [];
  const newHistoricalLows = Array.isArray(payload?.newHistoricalLows)
    ? payload.newHistoricalLows
        .filter(validEntry)
        .sort(byAbsoluteDifference)
        .slice(0, cappedLimit)
    : [];
  const favoriteChanges = Array.isArray(payload?.favoriteChanges)
    ? payload.favoriteChanges.filter(validEntry).sort(byAbsoluteDifference)
    : [];

  return { recentDrops, newHistoricalLows, favoriteChanges };
}
