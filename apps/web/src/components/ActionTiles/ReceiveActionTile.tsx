import { useTranslation } from 'react-i18next'
import { FlexProps } from 'ui/src'
import { ArrowDownCircleFilled } from 'ui/src/components/icons/ArrowDownCircleFilled'
import { ElementName } from 'uniswap/src/features/telemetry/constants'
import Trace from 'uniswap/src/features/telemetry/Trace'
import { TestID } from 'uniswap/src/test/fixtures/testIDs'
import { ActionTileWithIconAnimation } from '~/components/ActionTiles/ActionTileWithIconAnimation'
import { ReceiveModalState } from '~/components/ReceiveCryptoModal/types'
import { useOpenReceiveCryptoModal } from '~/components/ReceiveCryptoModal/useOpenReceiveCryptoModal'

export function ReceiveActionTile({ padding = '$spacing12' }: { padding?: FlexProps['p'] }) {
  const { t } = useTranslation()

  const openReceiveCryptoModal = useOpenReceiveCryptoModal({
    modalState: ReceiveModalState.DEFAULT,
  })

  return (
    <Trace logPress element={ElementName.PortfolioActionReceive}>
      <ActionTileWithIconAnimation
        dataTestId={TestID.WalletReceiveCrypto}
        Icon={ArrowDownCircleFilled}
        name={t('common.receive')}
        onClick={openReceiveCryptoModal}
        padding={padding}
      />
    </Trace>
  )
}
