import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { useTokenTableSortStore } from '~/pages/Explore/tables/Tokens/tokenTableSortStore'
import { useBackendSortedTopTokens } from '~/state/explore/topTokens/useBackendSortedTopTokens'
import { useTopTokensLegacy } from '~/state/explore/topTokens/useTopTokensLegacy'
import { useExploreBackendSortingEnabled } from '~/state/explore/useExploreBackendSortingEnabled'
import { useExploreQueryLatencyTracking } from '~/state/explore/useExploreQueryLatencyTracking'

/**
 * Hook that returns top tokens data.
 * Uses the new ListTopTokens endpoint with backend sorting when ExplorePaginationImprovements is enabled,
 * otherwise falls back to the legacy ExploreContext implementation.
 * @param chainId - Optional chain ID to filter tokens
 */
export function useTopTokens(chainId: UniverseChainId | undefined) {
  const isExploreBackendSortingEnabled = useExploreBackendSortingEnabled()
  const { sortMethod, sortAscending } = useTokenTableSortStore((s) => ({
    sortMethod: s.sortMethod,
    sortAscending: s.sortAscending,
  }))

  // Legacy uses ExploreContext - skip processing when new endpoint is enabled
  const legacyResult = useTopTokensLegacy({ enabled: !isExploreBackendSortingEnabled, sortMethod, sortAscending })
  // Only fetch from new endpoint when feature flag is enabled
  const backendSortedResult = useBackendSortedTopTokens({
    chainId,
    enabled: isExploreBackendSortingEnabled,
    sortMethod,
    sortAscending,
  })

  const result = isExploreBackendSortingEnabled
    ? backendSortedResult
    : {
        ...legacyResult,
        loadMore: undefined,
        hasNextPage: false,
        isFetchingNextPage: false,
      }

  // Track latency when data first loads (for both legacy and new implementations)
  useExploreQueryLatencyTracking({
    queryType: 'tokens',
    isBackendSortingEnabled: isExploreBackendSortingEnabled,
    isLoading: result.isLoading,
    resultCount: result.topTokens?.length,
    chainId,
  })

  return result
}
