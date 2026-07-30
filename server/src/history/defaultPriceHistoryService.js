import { resolveDatabaseConfig } from "./databaseConfig.js";
import { createNeonPriceHistoryRepository } from "./neonPriceHistoryRepository.js";
import { createPriceHistoryService } from "./priceHistory.js";

function createDefaultPriceHistoryService() {
  try {
    const config = resolveDatabaseConfig();
    if (!config.enabled) return createPriceHistoryService();

    return createPriceHistoryService({
      repository: createNeonPriceHistoryRepository(config.connectionString),
    });
  } catch {
    return createPriceHistoryService();
  }
}

export const defaultPriceHistoryService = createDefaultPriceHistoryService();
