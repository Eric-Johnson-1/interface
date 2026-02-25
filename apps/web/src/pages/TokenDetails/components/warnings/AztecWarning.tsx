import { FeatureFlags, useFeatureFlag } from '@universe/gating'
import { useTranslation } from 'react-i18next'
import { Flex, GeneratedIcon, Text } from 'ui/src'
import { InlineWarningCard } from 'uniswap/src/components/InlineWarningCard/InlineWarningCard'
import { WarningSeverity } from 'uniswap/src/components/modals/WarningModal/types'
import { WarningModal } from 'uniswap/src/components/modals/WarningModal/WarningModal'
import { LearnMoreLink } from 'uniswap/src/components/text/LearnMoreLink'
import WarningIcon from 'uniswap/src/components/warnings/WarningIcon'
import { AZTEC_ADDRESS } from 'uniswap/src/constants/addresses'
import { uniswapUrls } from 'uniswap/src/constants/urls'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { useShouldShowAztecWarning } from 'uniswap/src/hooks/useShouldShowAztecWarning'
import { useTDPContext } from '~/pages/TokenDetails/context/TDPContext'

export function AztecWarningBanner(): JSX.Element | null {
  const { t } = useTranslation()
  const { address } = useTDPContext()
  const showAztecWarning = useShouldShowAztecWarning(address)

  if (!showAztecWarning) {
    return null
  }

  return (
    <Flex mt="$spacing24">
      <InlineWarningCard
        severity={WarningSeverity.Low}
        Icon={WarningIcon as GeneratedIcon}
        heading={t('web.explore.tokenDetails.data.warning')}
      />
    </Flex>
  )
}

export function AztecWarningModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation()

  const { address } = useTDPContext()

  const isAztecDisabled = useFeatureFlag(FeatureFlags.DisableAztecToken)
  const isAztec = address.toLowerCase() === AZTEC_ADDRESS.toLowerCase()
  const showAztecWarning = isAztec && isAztecDisabled

  if (!showAztecWarning || !isOpen) {
    return null
  }

  return (
    <WarningModal
      isOpen={isOpen}
      modalName={ModalName.SwapWarning}
      severity={WarningSeverity.Blocked}
      title={t('swap.warning.noRoutesFound.title')}
      captionComponent={
        <Flex centered gap="$spacing12">
          <Text color="$neutral2" textAlign="center" variant="body3">
            {t('swap.warning.aztecUnavailable.message')}
          </Text>
          <LearnMoreLink display="inline" textColor="$neutral1" textVariant="buttonLabel3" url={uniswapUrls.aztecUrl} />
        </Flex>
      }
      acknowledgeText={t('common.button.close')}
      onClose={onClose}
      onAcknowledge={onClose}
    />
  )
}
