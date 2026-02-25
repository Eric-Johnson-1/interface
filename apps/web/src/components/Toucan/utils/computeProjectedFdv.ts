import type { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import {
  approximateNumberFromRaw,
  computeFdvBidTokenRaw,
  formatCompactFromRaw,
} from '~/components/Toucan/Auction/utils/fixedPointFdv'
import type { AuctionWithCurrencyInfo } from '~/state/explore/topAuctions/useTopAuctions'

export interface ProjectedFdvTableValue {
  raw: bigint // Raw FDV in bid token for computation
  usd?: number // USD value for sorting/display
  formattedBidToken: string // Formatted bid token (e.g., "1.5K ETH")
}

/**
 * Computes all projected FDV values for table display:
 * - Raw bigint for precise calculations
 * - USD value for sorting and primary display
 * - Formatted strings for both USD and bid token
 */
export function computeProjectedFdvTableValue({
  auction,
  bidTokenCurrencyInfo,
  bidTokenUsdPrice,
}: {
  auction: AuctionWithCurrencyInfo
  bidTokenCurrencyInfo: Maybe<CurrencyInfo>
  bidTokenUsdPrice: number | undefined
}): ProjectedFdvTableValue {
  const fallback: ProjectedFdvTableValue = {
    raw: 0n,
    usd: undefined,
    formattedBidToken: '—',
  }

  try {
    if (!auction.auction || !bidTokenCurrencyInfo) {
      return fallback
    }

    const priceQ96 = auction.auction.clearingPrice !== '0' ? auction.auction.clearingPrice : auction.auction.floorPrice
    const totalSupply = auction.auction.tokenTotalSupply ?? auction.auction.totalSupply

    if (priceQ96 === '0' || !totalSupply) {
      return fallback
    }

    // Compute raw FDV in bid token units
    const raw = computeFdvBidTokenRaw({
      priceQ96,
      bidTokenDecimals: bidTokenCurrencyInfo.currency.decimals,
      totalSupplyRaw: totalSupply,
      auctionTokenDecimals: auction.currencyInfo?.currency.decimals,
    })

    // Convert to USD
    const usd = bidTokenUsdPrice
      ? approximateNumberFromRaw({ raw, decimals: bidTokenCurrencyInfo.currency.decimals }) * bidTokenUsdPrice
      : undefined

    // Format bid token value
    const formattedAmount = formatCompactFromRaw({
      raw,
      decimals: bidTokenCurrencyInfo.currency.decimals,
    })
    const formattedBidToken = `${formattedAmount} ${bidTokenCurrencyInfo.currency.symbol}`

    return {
      raw,
      usd,
      formattedBidToken,
    }
  } catch (_error) {
    return fallback
  }
}
