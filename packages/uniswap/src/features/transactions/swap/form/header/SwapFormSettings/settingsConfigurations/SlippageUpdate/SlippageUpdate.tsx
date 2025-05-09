import type { SwapSettingConfig } from 'uniswap/src/features/transactions/swap/form/header/SwapFormSettings/settingsConfigurations/types'
import { PlatformSplitStubError } from 'utilities/src/errors'

export const SlippageUpdate: SwapSettingConfig = {
  renderTitle: (t) => t('swap.slippage.settings.title'),
  renderCloseButtonText: (t) => t('common.button.save'),
  Control() {
    throw new PlatformSplitStubError('Slippage')
  },
}
