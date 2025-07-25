import { TFunction } from 'i18next'
import { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, TouchableArea, useSporeColors } from 'ui/src'
import { ChartBar } from 'ui/src/components/icons/ChartBar'
import { zIndexes } from 'ui/src/theme'
import { WarningSeverity } from 'uniswap/src/components/modals/WarningModal/types'
import { WarningInfo } from 'uniswap/src/components/modals/WarningModal/WarningInfo'
import { uniswapUrls } from 'uniswap/src/constants/urls'
import { Routing } from 'uniswap/src/data/tradingApi/__generated__'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { isUniswapX } from 'uniswap/src/features/transactions/swap/utils/routing'
import { openUri } from 'uniswap/src/utils/linking'
import { isWeb } from 'utilities/src/platform'

function getPriceImpactInfo({ t, routing, missing }: { t: TFunction; routing: Routing; missing: boolean }): {
  caption: string
  link: string
} {
  if (isUniswapX({ routing })) {
    if (missing) {
      return {
        caption: t('swap.impactOfTrade.uniswapx.missing'),
        link: uniswapUrls.helpArticleUrls.uniswapXInfo,
      }
    } else {
      return {
        caption: t('swap.impactOfTrade.uniswapx'),
        link: uniswapUrls.helpArticleUrls.uniswapXInfo,
      }
    }
  } else {
    return {
      caption: t('swap.impactOfTrade'),
      link: uniswapUrls.helpArticleUrls.priceImpact,
    }
  }
}

export function MarketPriceImpactWarningModal({
  children,
  routing,
  missing,
}: PropsWithChildren<{ routing: Routing; missing: boolean }>): JSX.Element {
  const colors = useSporeColors()
  const { t } = useTranslation()

  const { caption, link } = getPriceImpactInfo({ t, routing, missing })

  return (
    <WarningInfo
      infoButton={
        <TouchableArea onPress={async () => await openUri({ uri: link })}>
          <Text color="$accent1" variant={isWeb ? 'body4' : 'buttonLabel2'}>
            {t('common.button.learn')}
          </Text>
        </TouchableArea>
      }
      modalProps={{
        hideIcon: isWeb,
        icon: <ChartBar color="$neutral1" size="$icon.18" />,
        backgroundIconColor: colors.surface2.get(),
        captionComponent: (
          <Text color="$neutral2" textAlign={isWeb ? 'left' : 'center'} variant={isWeb ? 'body4' : 'body2'}>
            {caption}
          </Text>
        ),
        rejectText: t('common.button.close'),
        modalName: ModalName.NetworkFeeInfo,
        severity: WarningSeverity.None,
        title: t('swap.priceImpact'),
        zIndex: zIndexes.popover,
      }}
      tooltipProps={{ text: caption, placement: 'top' }}
      analyticsTitle="Price Impact"
    >
      {children}
    </WarningInfo>
  )
}
