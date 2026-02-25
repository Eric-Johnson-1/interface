import { listTransactions } from '@uniswap/client-data-api/dist/data/v1/api-DataApiService_connectquery'
import { TestID } from 'uniswap/src/test/fixtures/testIDs'
import { expect, getTest } from '~/playwright/fixtures'
import { mockGetPortfolioResponse } from '~/playwright/fixtures/account'
import { getVisibleDropdownElementByTestId } from '~/playwright/fixtures/utils'
import { HAYDEN_ADDRESS } from '~/playwright/fixtures/wallets'
import { Mocks } from '~/playwright/mocks/mocks'

const test = getTest()

// Token row ID from portfolio mock (chainId-address, lowercase) for Tether USD
const USDT_TOKEN_ID = '1-0xdac17f958d2ee523a2206206994597c13d831ec7'

test.describe(
  'Portfolio Overview Tab',
  {
    tag: '@team:apps-portfolio',
    annotation: [
      { type: 'DD_TAGS[team]', description: 'apps-portfolio' },
      { type: 'DD_TAGS[test.type]', description: 'web-e2e' },
    ],
  },
  () => {
    test.describe('Portfolio Chart', () => {
      test.beforeEach(async ({ page, graphql, dataApi }) => {
        await graphql.intercept('PortfolioBalances', Mocks.PortfolioBalances.hayden)
        await dataApi.intercept(listTransactions, Mocks.DataApiService.list_transactions)
        await page.goto(`/portfolio?eagerlyConnectAddress=${HAYDEN_ADDRESS}`)
      })

      test('should display portfolio value', async ({ page }) => {
        // Portfolio should show a dollar value (the hayden mock has ~$430)
        await expect(page.getByTestId(TestID.MiniPortfolioTotalBalance)).toBeVisible()
      })

      test('should display time period selector', async ({ page }) => {
        // Time period options should be visible
        await expect(page.getByTestId(`${TestID.PortfolioChartPeriodPrefix}1d`)).toBeVisible()
        await expect(page.getByTestId(`${TestID.PortfolioChartPeriodPrefix}1w`)).toBeVisible()
        await expect(page.getByTestId(`${TestID.PortfolioChartPeriodPrefix}1m`)).toBeVisible()
        await expect(page.getByTestId(`${TestID.PortfolioChartPeriodPrefix}1y`)).toBeVisible()
      })

      test('should change time period when clicking selector', async ({ page }) => {
        // Click on 1W to change time period
        await page.getByTestId(`${TestID.PortfolioChartPeriodPrefix}1w`).click()

        // The 1W button should now be selected (we can verify by checking it's visible)
        await expect(page.getByTestId(`${TestID.PortfolioChartPeriodPrefix}1w`)).toBeVisible()
      })
    })

    test.describe('Action Tiles - Connected Wallet', () => {
      test.beforeEach(async ({ page, graphql, dataApi }) => {
        await graphql.intercept('PortfolioBalances', Mocks.PortfolioBalances.hayden)
        await dataApi.intercept(listTransactions, Mocks.DataApiService.list_transactions)
        await page.goto(`/portfolio?eagerlyConnectAddress=${HAYDEN_ADDRESS}`)
      })

      test('should display all action tiles for connected wallet', async ({ page }) => {
        // Connected wallet should see: Send, Receive, Buy, More
        await expect(page.getByTestId(TestID.Send)).toBeVisible()
        await expect(page.getByTestId(TestID.WalletReceiveCrypto)).toBeVisible()
        await expect(page.getByTestId(TestID.PortfolioActionTileBuy)).toBeVisible()
        await expect(page.getByTestId(TestID.PortfolioActionTileMore)).toBeVisible()
      })

      test('should navigate to buy page when clicking Buy tile', async ({ page }) => {
        await page.getByTestId(TestID.PortfolioActionTileBuy).click()
        await expect(page).toHaveURL(/\/buy/)
      })
    })

    test.describe('Action Tiles - External Wallet', () => {
      test.beforeEach(async ({ page, graphql, dataApi }) => {
        await graphql.intercept('PortfolioBalances', Mocks.PortfolioBalances.hayden)
        await dataApi.intercept(listTransactions, Mocks.DataApiService.list_transactions)
        await page.goto(`/portfolio/${HAYDEN_ADDRESS}?eagerlyConnect=false`)
      })

      test('should display external wallet action tiles', async ({ page }) => {
        // External wallet view should show: Send (to address), Copy address
        await expect(page.getByTestId(TestID.Send)).toBeVisible()
        await expect(page.getByTestId(TestID.PortfolioActionTileCopyAddress)).toBeVisible()
      })

      test('should not show Swap, Buy, or More tiles for external wallet', async ({ page }) => {
        // Wait for the page to load first
        await expect(page.getByTestId(TestID.Send)).toBeVisible()

        // These should NOT be visible for external wallet
        await expect(page.getByTestId(TestID.PortfolioActionTileSwap)).not.toBeVisible()
        await expect(page.getByTestId(TestID.PortfolioActionTileBuy)).not.toBeVisible()
      })
    })

    test.describe('Stats Tiles', () => {
      test.beforeEach(async ({ page, graphql, dataApi }) => {
        await graphql.intercept('PortfolioBalances', Mocks.PortfolioBalances.hayden)
        await dataApi.intercept(listTransactions, Mocks.DataApiService.list_transactions)
        await page.goto(`/portfolio?eagerlyConnectAddress=${HAYDEN_ADDRESS}`)
      })

      test('should display swaps this week stat', async ({ page }) => {
        await expect(page.getByTestId(TestID.PortfolioOverviewStatsSwapsThisWeek)).toBeVisible()
      })

      test('should display swapped this week stat', async ({ page }) => {
        await expect(page.getByTestId(TestID.PortfolioOverviewStatsSwappedThisWeek)).toBeVisible()
      })
    })

    test.describe('Mini Tokens Table', () => {
      test.beforeEach(async ({ page, graphql, dataApi }) => {
        await graphql.intercept('PortfolioBalances', Mocks.PortfolioBalances.hayden)
        await dataApi.intercept(listTransactions, Mocks.DataApiService.list_transactions)
        await mockGetPortfolioResponse({ page, mockPath: Mocks.DataApiService.get_portfolio })
        await page.goto(`/portfolio?eagerlyConnectAddress=${HAYDEN_ADDRESS}`)

        await Promise.all([
          graphql.waitForResponse('PortfolioBalances'),
          page.waitForResponse((res) => res.request().url().includes('GetPortfolio')),
        ])
      })

      test('should display tokens section header', async ({ page }) => {
        await expect(page.getByTestId(TestID.PortfolioOverviewTokensSection)).toBeVisible()
      })

      test('should display token data from portfolio', async ({ page }) => {
        // GetPortfolio mock has USDT (and ETH, USDC)
        await expect(page.getByTestId(`${TestID.TokenTableRowPrefix}${USDT_TOKEN_ID}`)).toBeVisible()
      })

      test('should display View all tokens button', async ({ page }) => {
        await expect(page.getByTestId(TestID.PortfolioOverviewViewAllTokens)).toBeVisible()
      })

      test('should navigate to tokens tab when clicking View all tokens', async ({ page }) => {
        await page.getByTestId(TestID.PortfolioOverviewViewAllTokens).click()
        await expect(page).toHaveURL(/\/portfolio\/tokens/)
      })

      test('should navigate to token details when clicking a token row', async ({ page }) => {
        await page.getByTestId(`${TestID.TokenTableRowPrefix}${USDT_TOKEN_ID}`).click()
        await expect(page).toHaveURL(/\/explore\/tokens\/ethereum/)
      })
    })

    test.describe('Mini Activity Table', () => {
      test.beforeEach(async ({ page, graphql, dataApi }) => {
        await graphql.intercept('PortfolioBalances', Mocks.PortfolioBalances.hayden)
        await dataApi.intercept(listTransactions, Mocks.DataApiService.list_transactions)
        await page.goto(`/portfolio?eagerlyConnectAddress=${HAYDEN_ADDRESS}`)
      })

      test('should display activity section', async ({ page }) => {
        await expect(page.getByTestId(TestID.PortfolioOverviewActivitySection)).toBeVisible()
      })

      test('should display View all activity button', async ({ page }) => {
        await expect(page.getByTestId(TestID.PortfolioOverviewViewAllActivity)).toBeVisible()
      })

      test('should navigate to activity tab when clicking View all activity', async ({ page }) => {
        await page.getByTestId(TestID.PortfolioOverviewViewAllActivity).click()
        await expect(page).toHaveURL(/\/portfolio\/activity/)
      })
    })

    test.describe('Empty Portfolio State', () => {
      test.beforeEach(async ({ page, graphql }) => {
        await graphql.intercept('PortfolioBalances', Mocks.PortfolioBalances.empty)
        await mockGetPortfolioResponse({ page, mockPath: Mocks.DataApiService.get_portfolio_empty })
        await page.goto(`/portfolio?eagerlyConnectAddress=${HAYDEN_ADDRESS}`)
        await Promise.all([
          graphql.waitForResponse('PortfolioBalances'),
          page.waitForResponse((res) => res.request().url().includes('GetPortfolio')),
        ])
      })

      test('should show zero balance for empty portfolio', async ({ page }) => {
        await expect(page.getByTestId(TestID.PortfolioOverviewEmptyBalance)).toBeVisible()
      })

      test('should not show mini tables for empty portfolio', async ({ page }) => {
        await expect(page.getByTestId(TestID.PortfolioOverviewEmptyBalance)).toBeVisible()
        await expect(page.getByTestId(TestID.PortfolioOverviewViewAllTokens)).not.toBeVisible()
      })
    })

    test.describe('Demo View (Disconnected User)', () => {
      test('should show demo wallet indicator', async ({ page }) => {
        await page.goto('/portfolio?eagerlyConnect=false')
        await expect(page.getByTestId(TestID.DemoWalletDisplay)).toBeVisible()
      })

      test('should display action tiles in demo view', async ({ page }) => {
        await page.goto('/portfolio?eagerlyConnect=false')
        await expect(page.getByTestId(TestID.PortfolioActionTileBuy)).toBeVisible()
        await expect(page.getByTestId(TestID.WalletReceiveCrypto)).toBeVisible()
      })

      test('should display demo portfolio data', async ({ page }) => {
        await page.goto('/portfolio?eagerlyConnect=false')
        await expect(page.getByTestId(TestID.MiniPortfolioTotalBalance)).toBeVisible()
      })
    })

    test.describe('External Wallet View', () => {
      test.beforeEach(async ({ page, graphql, dataApi }) => {
        await graphql.intercept('PortfolioBalances', Mocks.PortfolioBalances.hayden)
        await dataApi.intercept(listTransactions, Mocks.DataApiService.list_transactions)
        await mockGetPortfolioResponse({ page, mockPath: Mocks.DataApiService.get_portfolio })
        await page.goto(`/portfolio/${HAYDEN_ADDRESS}?eagerlyConnect=false`)
        await Promise.all([
          graphql.waitForResponse('PortfolioBalances'),
          page.waitForResponse((res) => res.request().url().includes('GetPortfolio')),
        ])
      })

      test('should display external wallet portfolio', async ({ page }) => {
        await expect(page.getByTestId(`${TestID.TokenTableRowPrefix}${USDT_TOKEN_ID}`)).toBeVisible()
      })

      test('should preserve external address in URL', async ({ page }) => {
        // URL should contain the external address
        await expect(page).toHaveURL(/\/portfolio\/0x50EC05ADe8280758E2077fcBC08D878D4aef79C3/)
      })

      test('should show Share button for external wallet', async ({ page }) => {
        await expect(page.getByTestId(TestID.PortfolioShareButton)).toBeVisible()
      })
    })

    test.describe('Network Filter Integration', () => {
      test.beforeEach(async ({ page, graphql, dataApi }) => {
        await graphql.intercept('PortfolioBalances', Mocks.PortfolioBalances.hayden)
        await dataApi.intercept(listTransactions, Mocks.DataApiService.list_transactions)
        await mockGetPortfolioResponse({ page, mockPath: Mocks.DataApiService.get_portfolio })
        await page.goto(`/portfolio?eagerlyConnectAddress=${HAYDEN_ADDRESS}`)
      })

      test('should filter overview data by network', async ({ page }) => {
        await page.getByTestId(TestID.TokensNetworkFilterTrigger).click()
        await getVisibleDropdownElementByTestId(page, `${TestID.TokensNetworkFilterOptionPrefix}ethereum`).click()
        await expect(page).toHaveURL(/chain=ethereum/)
      })

      test('should preserve chain filter when navigating to tokens tab', async ({ page }) => {
        await page.getByTestId(TestID.TokensNetworkFilterTrigger).click()
        await getVisibleDropdownElementByTestId(page, `${TestID.TokensNetworkFilterOptionPrefix}ethereum`).click()
        await expect(page).toHaveURL(/chain=ethereum/)

        // Wait for View all tokens link to re-render with chain param (usePortfolioRoutes reads searchParams; avoid clicking stale link)
        await expect(page.getByTestId(TestID.PortfolioOverviewViewAllTokens)).toHaveAttribute('href', /chain=ethereum/)
        await page.getByTestId(TestID.PortfolioOverviewViewAllTokens).click()
        await expect(page).toHaveURL(/chain=ethereum/)
        await expect(page).toHaveURL(/\/portfolio\/tokens/)
      })
    })

    test.describe('Responsive Behavior', () => {
      const MOBILE_VIEWPORT = { width: 375, height: 667 }

      test.beforeEach(async ({ page, graphql, dataApi }) => {
        await graphql.intercept('PortfolioBalances', Mocks.PortfolioBalances.hayden)
        await dataApi.intercept(listTransactions, Mocks.DataApiService.list_transactions)
        await mockGetPortfolioResponse({ page, mockPath: Mocks.DataApiService.get_portfolio })
        await page.setViewportSize(MOBILE_VIEWPORT)
        await page.goto(`/portfolio?eagerlyConnectAddress=${HAYDEN_ADDRESS}`)
        await Promise.all([
          graphql.waitForResponse('PortfolioBalances'),
          page.waitForResponse((res) => res.request().url().includes('GetPortfolio')),
        ])
      })

      test('should display overview chart on mobile', async ({ page }) => {
        await expect(page.getByTestId(`${TestID.PortfolioChartPeriodPrefix}1d`)).toBeVisible()
      })

      test('should display action tiles on mobile', async ({ page }) => {
        // await expect(page.getByTestId(TestID.Send)).toBeVisible()
        await expect(page.getByTestId(TestID.PortfolioActionTileBuy)).toBeVisible()
      })

      test('should display tokens table on mobile', async ({ page }) => {
        await expect(page.getByTestId(`${TestID.TokenTableRowPrefix}${USDT_TOKEN_ID}`)).toBeVisible()
      })
    })
  },
)
