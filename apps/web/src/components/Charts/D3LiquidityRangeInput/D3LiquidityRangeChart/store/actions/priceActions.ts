import { CHART_BEHAVIOR } from '~/components/Charts/D3LiquidityRangeInput/D3LiquidityRangeChart/constants'
import type {
  ChartStoreState,
  TickNavigationParams,
} from '~/components/Charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/types'

import { DefaultPriceStrategy } from '~/components/Charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/types'
import {
  calculateStrategyPrices,
  detectPriceStrategy,
} from '~/components/Charts/D3LiquidityRangeInput/D3LiquidityRangeChart/utils/priceStrategies'
import { calculateRangeViewport } from '~/components/Charts/D3LiquidityRangeInput/D3LiquidityRangeChart/utils/rangeViewportUtils'
import {
  findClosestTick,
  navigateTick,
} from '~/components/Charts/D3LiquidityRangeInput/D3LiquidityRangeChart/utils/tickUtils'

interface PriceActionCallbacks {
  onMinPriceChange: (price?: number, tick?: number) => void
  onMaxPriceChange: (price?: number, tick?: number) => void
}

export const createPriceActions = ({
  set,
  get,
  callbacks,
}: {
  set: (fn: (state: ChartStoreState) => ChartStoreState) => void
  get: () => ChartStoreState
  callbacks: PriceActionCallbacks
}) => ({
  // WARNING: This function will cause the CreateLiquidityContext to re-render.
  // Use this sparingly when a user action is complete (i.e drag ends).
  // This function should not react to min/max state changes.
  handlePriceChange: ({ changeType, price, tick }: { changeType: 'min' | 'max'; price?: number; tick?: number }) => {
    if (changeType === 'min') {
      callbacks.onMinPriceChange(price, tick)
    } else {
      callbacks.onMaxPriceChange(price, tick)
    }

    const { maxPrice, minPrice, selectedPriceStrategy, renderingContext } = get()

    if (!renderingContext) {
      return
    }

    const currentPrice = renderingContext.priceData[renderingContext.priceData.length - 1]?.value || 0
    const detectedStrategy = detectPriceStrategy({
      minPrice,
      maxPrice,
      currentPrice,
      liquidityData: renderingContext.liquidityData,
    })

    const currentSelectedStrategy = selectedPriceStrategy
    if (detectedStrategy !== currentSelectedStrategy) {
      set((state) => ({ ...state, selectedPriceStrategy: detectedStrategy }))
    }
  },

  setPriceStrategy: ({ priceStrategy, animate = true }: { priceStrategy: DefaultPriceStrategy; animate: boolean }) => {
    const { actions, dimensions, dynamicZoomMin, renderingContext, defaultMinPrice, defaultMaxPrice } = get()
    if (!renderingContext) {
      return
    }

    set((state) => ({
      ...state,
      selectedPriceStrategy: priceStrategy,
      isFullRange: priceStrategy === DefaultPriceStrategy.FULL_RANGE,
    }))

    const { priceData, liquidityData } = renderingContext
    const currentPrice = priceData[priceData.length - 1].value || 0

    const { minPrice: targetMinPrice, maxPrice: targetMaxPrice } = calculateStrategyPrices({
      priceStrategy,
      currentPrice,
      liquidityData,
      defaultMinPrice,
      defaultMaxPrice,
    })

    const { index: minTickIndex, tick: minTickEntry } = findClosestTick(liquidityData, targetMinPrice)
    const { index: maxTickIndex, tick: maxTickEntry } = findClosestTick(liquidityData, targetMaxPrice)

    const { targetZoom, targetPanY } = calculateRangeViewport({
      minTickIndex,
      maxTickIndex,
      liquidityData,
      dynamicZoomMin,
      dimensions,
    })

    if (animate) {
      actions.animateToState({
        targetZoom,
        targetPan: targetPanY,
        targetMinPrice,
        targetMaxPrice,
      })
    } else {
      actions.setChartState({
        zoomLevel: targetZoom,
        panY: targetPanY,
        minPrice: targetMinPrice,
        maxPrice: targetMaxPrice,
        minTick: minTickEntry.tick,
        maxTick: maxTickEntry.tick,
      })
    }

    setTimeout(() => {
      const { renderingContext } = get()
      if (renderingContext) {
        actions.handlePriceChange({ changeType: 'min', price: targetMinPrice, tick: minTickEntry.tick })
        actions.handlePriceChange({ changeType: 'max', price: targetMaxPrice, tick: maxTickEntry.tick })
      }
    }, CHART_BEHAVIOR.ANIMATION_DURATION)
  },

  incrementMax: ({
    tickSpacing,
    baseCurrency,
    quoteCurrency,
    priceInverted,
    protocolVersion,
  }: TickNavigationParams) => {
    const { maxPrice, actions } = get()
    if (!maxPrice) {
      return
    }

    const newPrice = navigateTick({
      currentPrice: maxPrice,
      tickSpacing,
      direction: 'increment',
      baseCurrency,
      quoteCurrency,
      priceInverted,
      protocolVersion,
    })

    if (newPrice !== undefined) {
      const { renderingContext } = get()
      let tick: number | undefined

      if (renderingContext) {
        const { tick: tickEntry } = findClosestTick(renderingContext.liquidityData, newPrice)
        tick = tickEntry.tick
      }

      actions.setChartState({ maxPrice: newPrice, maxTick: tick })
      actions.handlePriceChange({ changeType: 'max', price: newPrice, tick })
    }
  },

  decrementMax: ({
    tickSpacing,
    baseCurrency,
    quoteCurrency,
    priceInverted,
    protocolVersion,
  }: TickNavigationParams) => {
    const { maxPrice, actions } = get()
    if (!maxPrice) {
      return
    }

    const newPrice = navigateTick({
      currentPrice: maxPrice,
      tickSpacing,
      direction: 'decrement',
      baseCurrency,
      quoteCurrency,
      priceInverted,
      protocolVersion,
    })

    if (newPrice !== undefined) {
      const { renderingContext } = get()
      let tick: number | undefined

      if (renderingContext) {
        const { tick: tickEntry } = findClosestTick(renderingContext.liquidityData, newPrice)
        tick = tickEntry.tick
      }

      actions.setChartState({ maxPrice: newPrice, maxTick: tick })
      actions.handlePriceChange({ changeType: 'max', price: newPrice, tick })
    }
  },

  incrementMin: ({
    tickSpacing,
    baseCurrency,
    quoteCurrency,
    priceInverted,
    protocolVersion,
  }: TickNavigationParams) => {
    const { minPrice, actions } = get()
    if (!minPrice) {
      return
    }

    const newPrice = navigateTick({
      currentPrice: minPrice,
      tickSpacing,
      direction: 'increment',
      baseCurrency,
      quoteCurrency,
      priceInverted,
      protocolVersion,
    })

    if (newPrice !== undefined) {
      const { renderingContext } = get()
      let tick: number | undefined

      if (renderingContext) {
        const { tick: tickEntry } = findClosestTick(renderingContext.liquidityData, newPrice)
        tick = tickEntry.tick
      }

      actions.setChartState({ minPrice: newPrice, minTick: tick })
      actions.handlePriceChange({ changeType: 'min', price: newPrice, tick })
    }
  },

  decrementMin: ({
    tickSpacing,
    baseCurrency,
    quoteCurrency,
    priceInverted,
    protocolVersion,
  }: TickNavigationParams) => {
    const { minPrice, actions } = get()
    if (!minPrice) {
      return
    }

    const newPrice = navigateTick({
      currentPrice: minPrice,
      tickSpacing,
      direction: 'decrement',
      baseCurrency,
      quoteCurrency,
      priceInverted,
      protocolVersion,
    })

    if (newPrice !== undefined) {
      const { renderingContext } = get()
      let tick: number | undefined

      if (renderingContext) {
        const { tick: tickEntry } = findClosestTick(renderingContext.liquidityData, newPrice)
        tick = tickEntry.tick
      }

      actions.setChartState({ minPrice: newPrice, minTick: tick })
      actions.handlePriceChange({ changeType: 'min', price: newPrice, tick })
    }
  },

  syncIsFullRangeFromParent: (isFullRange: boolean) => {
    const { actions, isFullRange: currentIsFullRange } = get()
    if (currentIsFullRange === isFullRange) {
      return
    }

    set((state) => ({ ...state, isFullRange }))
    actions.reset({ animate: false })
  },
})
