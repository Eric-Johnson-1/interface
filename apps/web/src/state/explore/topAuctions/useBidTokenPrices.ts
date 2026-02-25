import { GraphQLApi } from '@universe/api'
import { useMemo } from 'react'
import { ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import { toGraphQLChain } from 'uniswap/src/features/chains/utils'
import type { AuctionWithCurrencyInfo } from '~/state/explore/topAuctions/useTopAuctions'
import { CurrencyKey, currencyKeyFromGraphQL } from '~/utils/currencyKey'
import { getNativeTokenDBAddress } from '~/utils/nativeTokens'

/**
 * Fetches USD prices for all bid tokens used in the provided auctions.
 */
type PriceMap = { [key: CurrencyKey]: number | undefined }
export function useBidTokenPrices(auctions: readonly AuctionWithCurrencyInfo[]): {
  priceMap: PriceMap
  loading: boolean
} {
  const contracts = useMemo(() => {
    if (!auctions.length) {
      return []
    }

    const contractMap = auctions.reduce((acc: { [key: string]: GraphQLApi.ContractInput }, auction) => {
      if (auction.auction?.currency && auction.auction.chainId) {
        const key = `${auction.auction.chainId}-${auction.auction.currency}`
        const chain = toGraphQLChain(auction.auction.chainId)
        // Deduplicate by chainId-currency combination
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!acc[key]) {
          acc[key] = {
            address:
              auction.auction.currency === ZERO_ADDRESS ? getNativeTokenDBAddress(chain) : auction.auction.currency,
            chain,
          }
        }
      }
      return acc
    }, {})
    return Object.values(contractMap)
  }, [auctions])

  const { data, loading } = GraphQLApi.useUniswapPricesQuery({
    variables: { contracts },
    skip: !contracts.length,
  })

  const priceMap = useMemo(() => {
    return (
      data?.tokens?.reduce((acc: PriceMap, token) => {
        if (token) {
          acc[currencyKeyFromGraphQL(token)] = token.project?.markets?.[0]?.price?.value
        }
        return acc
      }, {}) ?? {}
    )
  }, [data?.tokens])

  return { priceMap, loading: loading && !data }
}
