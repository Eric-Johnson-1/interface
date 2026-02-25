import type { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { approximateNumberFromRaw, formatTokenAmountWithSymbol } from '~/components/Toucan/Auction/utils/fixedPointFdv'
import type { AuctionWithCurrencyInfo } from '~/state/explore/topAuctions/useTopAuctions'

export interface CommittedVolumeTableValue {
  raw: bigint
  usd?: number
  formattedBidToken: string
}

/**
 * Computes all committed volume values for table display.
 * Uses fixed decimals with trailing zeros: 3 for abbreviated (K/M/B/T), 2 for stablecoins, 5 for others.
 */
export function computeCommittedVolumeTableValue({
  auction,
  bidTokenCurrencyInfo,
  bidTokenUsdPrice,
  isStablecoin = false,
}: {
  auction: AuctionWithCurrencyInfo
  bidTokenCurrencyInfo: Maybe<CurrencyInfo>
  bidTokenUsdPrice: number | undefined
  isStablecoin?: boolean
}): CommittedVolumeTableValue {
  const fallback: CommittedVolumeTableValue = {
    raw: 0n,
    usd: undefined,
    formattedBidToken: '—',
  }

  try {
    if (!auction.totalBidVolume || !bidTokenCurrencyInfo) {
      return fallback
    }

    const raw = BigInt(auction.totalBidVolume)
    const decimals = bidTokenCurrencyInfo.currency.decimals

    // Convert to USD
    const usd = bidTokenUsdPrice ? approximateNumberFromRaw({ raw, decimals }) * bidTokenUsdPrice : undefined

    const formattedBidToken = formatTokenAmountWithSymbol({
      raw,
      decimals,
      symbol: bidTokenCurrencyInfo.currency.symbol ?? '',
      isStablecoin,
    })

    return {
      raw,
      usd,
      formattedBidToken,
    }
  } catch (_error) {
    return fallback
  }
}
