import { Currency } from '@uniswap/sdk-core'
import { useMemo } from 'react'
import { TickTooltip } from '~/components/Charts/ActiveLiquidityChart/TickTooltip'
import { PriceDifferenceTooltips } from '~/components/Charts/D3LiquidityRangeInput/D3LiquidityRangeChart/components/PriceDifferenceTooltips'
import { CHART_DIMENSIONS } from '~/components/Charts/D3LiquidityRangeInput/D3LiquidityRangeChart/constants'
import { useChartDragState } from '~/components/Charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/selectors/dragSelectors'
import { useChartHoverState } from '~/components/Charts/D3LiquidityRangeInput/D3LiquidityRangeChart/store/selectors/hoverSelectors'
import { findClosestTick } from '~/components/Charts/D3LiquidityRangeInput/D3LiquidityRangeChart/utils/tickUtils'
import { ChartEntry } from '~/components/Charts/LiquidityRangeInput/types'
import { PriceChartData } from '~/components/Charts/PriceChart'

export function LiquidityActiveTooltips({
  quoteCurrency,
  baseCurrency,
  priceData,
  liquidityData,
}: {
  quoteCurrency: Currency
  baseCurrency: Currency
  priceData: PriceChartData[]
  liquidityData: ChartEntry[]
}) {
  const { dragStartY, dragCurrentY, dragStartTick, dragCurrentTick } = useChartDragState()
  const { hoveredY, hoveredTick } = useChartHoverState()

  // Calculate current tick and price for TickTooltip
  const currentPrice = useMemo(() => {
    if (priceData.length === 0) {
      return 0
    }
    return priceData[priceData.length - 1].value
  }, [priceData])

  const { tick: currentTick } = useMemo(() => {
    return findClosestTick(liquidityData, currentPrice)
  }, [currentPrice, liquidityData])

  // Calculate content width and axis label pane width
  const contentWidth = CHART_DIMENSIONS.LIQUIDITY_CHART_WIDTH - CHART_DIMENSIONS.LIQUIDITY_SECTION_OFFSET
  const axisLabelPaneWidth = CHART_DIMENSIONS.LIQUIDITY_SECTION_OFFSET

  return (
    <>
      {/* Price difference tooltips - show on hover only */}
      <PriceDifferenceTooltips />

      {/* Hover tooltip (only show when not dragging) */}
      {hoveredY && hoveredTick && dragStartY === null ? (
        <TickTooltip
          containerHeight={CHART_DIMENSIONS.LIQUIDITY_CHART_HEIGHT}
          hoverY={hoveredY}
          hoveredTick={hoveredTick}
          currentTick={currentTick.tick}
          currentPrice={currentPrice}
          contentWidth={contentWidth}
          axisLabelPaneWidth={axisLabelPaneWidth}
          quoteCurrency={quoteCurrency}
          baseCurrency={baseCurrency}
        />
      ) : null}

      {/* Drag start tooltip */}
      {dragStartY !== null && dragStartTick ? (
        <TickTooltip
          containerHeight={CHART_DIMENSIONS.LIQUIDITY_CHART_HEIGHT}
          hoverY={dragStartY}
          hoveredTick={dragStartTick}
          currentTick={currentTick.tick}
          currentPrice={currentPrice}
          contentWidth={contentWidth}
          axisLabelPaneWidth={axisLabelPaneWidth}
          quoteCurrency={quoteCurrency}
          baseCurrency={baseCurrency}
        />
      ) : null}

      {/* Drag current tooltip */}
      {dragCurrentY !== undefined && dragCurrentTick ? (
        <TickTooltip
          containerHeight={CHART_DIMENSIONS.LIQUIDITY_CHART_HEIGHT}
          hoverY={dragCurrentY}
          hoveredTick={dragCurrentTick}
          currentTick={currentTick.tick}
          currentPrice={currentPrice}
          contentWidth={contentWidth}
          axisLabelPaneWidth={axisLabelPaneWidth}
          quoteCurrency={quoteCurrency}
          baseCurrency={baseCurrency}
        />
      ) : null}
    </>
  )
}
