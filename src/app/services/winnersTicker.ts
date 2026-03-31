import { buildPublicCacheKey } from './apiCompatibility';
import { fetchJsonWithRetry } from './networkClient';
import { RUNTIME_ENVIRONMENT } from './runtimeEnvironment';

export type WinnersTickerEntry = {
  emoji: string;
  user: string;
  amount: string;
};

type WinnersTickerResponse = {
  entries?: WinnersTickerEntry[];
};

const CACHE_KEY = buildPublicCacheKey('winners-ticker', 'v1');

export async function fetchWinnersTicker(): Promise<WinnersTickerEntry[]> {
  const payload = await fetchJsonWithRetry<WinnersTickerResponse>({
    url: `${RUNTIME_ENVIRONMENT.apiBaseUrl}/public/winners-ticker`,
    init: {
      headers: {
        apikey: RUNTIME_ENVIRONMENT.publicAnonKey,
        Authorization: `Bearer ${RUNTIME_ENVIRONMENT.publicAnonKey}`,
      },
    },
    timeoutMs: 6000,
    retries: 1,
    retryDelayMs: 200,
    cacheKey: CACHE_KEY,
    cacheTtlMs: 60 * 1000,
    pageTag: 'winners-ticker',
  });

  return Array.isArray(payload?.entries)
    ? payload.entries.filter((item) => item && typeof item.user === 'string' && typeof item.amount === 'string')
    : [];
}
