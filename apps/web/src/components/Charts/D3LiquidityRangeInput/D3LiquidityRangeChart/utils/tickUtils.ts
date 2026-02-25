import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Rounding } from '@uniswap/sdk-core'
import { nearestUsableTick, priceToClosestTick, TickMath, tickToPrice as tickToPriceV3 } from '@uniswap/v3-sdk'
import { priceToClosestTick as priceToClosestV4Tick, tickToPrice as tickToPriceV4 } from '@uniswap/v4-sdk'
import { logger } from 'utilities/src/logger/logger'
import { TickNavigationParams } from '~/components/Charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/types'
import { ChartEntry } from '~/components/Charts/LiquidityRangeInput/types'
import { PriceChartData } from '~/components/Charts/PriceChart'
import { tryParsePrice } from '~/state/mint/v3/utils'

const PRICE_FIXED_DIGITS = 8

/**
 * Navigates price by tick spacing
 * using v3/v4 sdk functions
 */
export const navigateTick = ({
  currentPrice,
  tickSpacing,
  direction,
  baseCurrency,
  quoteCurrency,
  priceInverted,
  protocolVersion,
}: TickNavigationParams & { currentPrice: number; direction: 'increment' | 'decrement' }) => {
  try {
    if (!baseCurrency || !quoteCurrency) {
      return undefined
    }

    const adjustedDirection = priceInverted ? (direction === 'increment' ? 'decrement' : 'increment') : direction
    const rounding = adjustedDirection === 'increment' ? Rounding.ROUND_UP : Rounding.ROUND_DOWN

    if (protocolVersion === ProtocolVersion.V3 || !protocolVersion) {
      const baseToken = baseCurrency.wrapped
      const quoteToken = quoteCurrency.wrapped

      const price = tryParsePrice({
        baseToken,
        quoteToken,
        value: currentPrice.toString(),
      })

      if (!price) {
        return undefined
      }

      // Check if price is within valid tick bounds before converting to tick
      const minPrice = tickToPriceV3(baseToken, quoteToken, TickMath.MIN_TICK)
      const maxPrice = tickToPriceV3(baseToken, quoteToken, TickMath.MAX_TICK)

      let tick: number
      if (price.lessThan(minPrice)) {
        tick = TickMath.MIN_TICK
      } else if (price.greaterThan(maxPrice)) {
        tick = TickMath.MAX_TICK
      } else {
        tick = priceToClosestTick(price)
      }

      const currentTick = nearestUsableTick(tick, tickSpacing)
      const newTick =
        adjustedDirection === 'increment'
          ? Math.min(currentTick + tickSpacing, TickMath.MAX_TICK)
          : Math.max(currentTick - tickSpacing, TickMath.MIN_TICK)

      const newPriceObj = tickToPriceV3(baseToken, quoteToken, newTick)
      return parseFloat(newPriceObj.toFixed(PRICE_FIXED_DIGITS, undefined, rounding))
    }

    if (protocolVersion === ProtocolVersion.V4) {
      const price = tryParsePrice({
        baseToken: baseCurrency,
        quoteToken: quoteCurrency,
        value: currentPrice.toString(),
      })

      if (!price) {
        return undefined
      }

      // Check if price is within valid tick bounds before converting to tick
      const minPrice = tickToPriceV4(baseCurrency, quoteCurrency, TickMath.MIN_TICK)
      const maxPrice = tickToPriceV4(baseCurrency, quoteCurrency, TickMath.MAX_TICK)

      let tick: number
      if (price.lessThan(minPrice)) {
        tick = TickMath.MIN_TICK
      } else if (price.greaterThan(maxPrice)) {
        tick = TickMath.MAX_TICK
      } else {
        tick = priceToClosestV4Tick(price)
      }

      const currentTick = nearestUsableTick(tick, tickSpacing)
      const newTick =
        adjustedDirection === 'increment'
          ? Math.min(currentTick + tickSpacing, TickMath.MAX_TICK)
          : Math.max(currentTick - tickSpacing, TickMath.MIN_TICK)

      const newPriceObj = tickToPriceV4(baseCurrency, quoteCurrency, newTick)
      return parseFloat(newPriceObj.toFixed(PRICE_FIXED_DIGITS, undefined, rounding))
    }

    return undefined
  } catch (error) {
    logger.error(error, {
      tags: {
        file: 'navigateTick',
        function: 'navigateTick',
      },
    })
    return undefined
  }
}

const DEFAULT_TICK: ChartEntry = {
  tick: TickMath.MIN_TICK,
  price0: 0,
  activeLiquidity: 0,
}

/**
 * Finds the closest tick from liquidity data to a target price
 */
export function findClosestTick(liquidityData: ChartEntry[], targetPrice: number) {
  // Liquidity data should never be empty, but if it is, return the default tick
  if (liquidityData.length === 0) {
    return { tick: DEFAULT_TICK, index: 0 }
  }

  let closestIndex = 0
  let closestDiff = Math.abs(liquidityData[0].price0 - targetPrice)

  for (let i = 1; i < liquidityData.length; i++) {
    const diff = Math.abs(liquidityData[i].price0 - targetPrice)
    if (diff < closestDiff) {
      closestDiff = diff
      closestIndex = i
    }
  }

  return { tick: liquidityData[closestIndex], index: closestIndex }
}

/**
 * Calculates tick indices with price information for efficient lookups from liquidity data
 */
export const calculateTickIndices = (liquidityData: ChartEntry[]) => {
  return liquidityData.map((d, i) => ({
    tick: d.tick ?? 0,
    index: i,
    price: d.price0,
  }))
}

/**
 * Gets the minimum and maximum bounds from price and liquidity data
 */
export const getDataBounds = (data: PriceChartData[], liquidityData: ChartEntry[]) => {
  const allPrices = [...data.map((d) => d.value), ...liquidityData.map((d) => d.price0)]
  return {
    min: Math.min(...allPrices),
    max: Math.max(...allPrices),
  }
}

/**
 * Calculates new price range based on center tick and tick range size
 */
export const calculateNewRange = ({
  centerTick,
  tickRangeSize,
  tickIndices,
  liquidityData,
}: {
  centerTick: ChartEntry
  tickRangeSize: number
  tickIndices: { tick: number; index: number; price: number }[]
  liquidityData: ChartEntry[]
}) => {
  const centerIndex = tickIndices.find((t) => t.tick === centerTick.tick)?.index || 0
  const halfRange = Math.floor(tickRangeSize / 2)

  const newMinIndex = Math.max(0, centerIndex - halfRange)
  const newMaxIndex = Math.min(liquidityData.length - 1, centerIndex + halfRange)

  return {
    minPrice: tickIndices[newMinIndex]?.price,
    maxPrice: tickIndices[newMaxIndex]?.price,
  }
}
