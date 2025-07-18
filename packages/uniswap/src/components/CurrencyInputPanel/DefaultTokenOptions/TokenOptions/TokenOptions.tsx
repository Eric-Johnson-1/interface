import { useMemo } from 'react'
import { TokenOptionItem } from 'uniswap/src/components/CurrencyInputPanel/DefaultTokenOptions/TokenOptions/TokenOptionItem/TokenOptionItem'
import { MAX_NUMBER_OF_TOKENS } from 'uniswap/src/components/CurrencyInputPanel/DefaultTokenOptions/constants'
import { useCommonTokensOptionsWithFallback } from 'uniswap/src/components/TokenSelector/hooks/useCommonTokensOptionsWithFallback'

import { useAccountMeta } from 'uniswap/src/contexts/UniswapContext'
import type { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { useSwapFormStoreDerivedSwapInfo } from 'uniswap/src/features/transactions/swap/stores/swapFormStore/useSwapFormStore'
import type { CurrencyField } from 'uniswap/src/types/currency'

const createKey = (currency: CurrencyInfo['currency']): string =>
  currency.isNative ? `${currency.chainId}-native` : `${currency.chainId}-${currency.address}`

const useCommonTokensOptionsInfo = (): {
  allCurrencyInfos: CurrencyInfo[]
  numberOfCommonTokenOptions: number
} => {
  const account = useAccountMeta()
  const chainId = useSwapFormStoreDerivedSwapInfo((s) => s.chainId)

  const { data: commonTokenOptions } = useCommonTokensOptionsWithFallback(account?.address, chainId)

  const numberOfCommonTokenOptions = commonTokenOptions?.length ?? 0

  const allCurrencyInfos: CurrencyInfo[] = useMemo(() => {
    return commonTokenOptions?.slice(0, MAX_NUMBER_OF_TOKENS).map(({ currencyInfo }) => currencyInfo) ?? []
  }, [commonTokenOptions])

  return {
    allCurrencyInfos,
    numberOfCommonTokenOptions,
  }
}

export const TokenOptions = ({ currencyField }: { currencyField: CurrencyField }): JSX.Element => {
  const { allCurrencyInfos, numberOfCommonTokenOptions } = useCommonTokensOptionsInfo()

  return (
    <>
      {allCurrencyInfos.map((currencyInfo, index) => {
        const { currency } = currencyInfo
        const key = createKey(currency)

        return (
          <TokenOptionItem
            key={key}
            currencyField={currencyField}
            currencyInfo={currencyInfo}
            index={index}
            numOptions={numberOfCommonTokenOptions}
          />
        )
      })}
    </>
  )
}
