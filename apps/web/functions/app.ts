import { poolImageHandler } from 'functions/api/image/pools'
import { tokenImageHandler } from 'functions/api/image/tokens'
import { metaTagInjectionMiddleware } from 'functions/components/metaTagInjector'
import { rewriteProxiedCookies } from 'functions/cookie-utils'
import { Context, Hono } from 'hono'
import { proxy } from 'hono/proxy'

type Bindings = {
  ASSETS?: { fetch: typeof fetch } // Only present on Cloudflare Workers
}

/**
 * Platform-specific dependencies injected by each entry point.
 * - fetchSpaHtml: how to get the SPA index.html (CF uses ASSETS binding, Vercel fetches from CDN)
 * - getEntryGatewayUrl: how to resolve the backend URL (CF uses worker bindings, Vercel uses process.env)
 */
interface AppConfig {
  fetchSpaHtml: (c: Context) => Promise<Response>
  getEntryGatewayUrl: (c: Context) => string
}

// ── Shared constants ─────────────────────────────────────────────────
export const ENTRY_GATEWAY_URLS = {
  development: 'https://entry-gateway.backend-staging.api.uniswap.org',
  staging: 'https://entry-gateway.backend-staging.api.uniswap.org',
  production: 'https://entry-gateway.backend-prod.api.uniswap.org',
} as const

// Statsig proxy via Cloudflare gateway — the URL is constant for the web app
// (platform prefix "interface", service prefix "gating")
const STATSIG_PROXY_TARGET = 'https://gating.interface.gateway.uniswap.org'

// ── Cache-Control middleware for image routes ───────────────────────────
function cacheControl(maxAge: number) {
  return async (c: Context, next: () => Promise<void>) => {
    await next()
    if (c.res.ok) {
      c.res.headers.set('Cache-Control', `public, max-age=${maxAge}`)
    }
  }
}

export function createApp({ fetchSpaHtml, getEntryGatewayUrl }: AppConfig) {
  const app = new Hono<{ Bindings: Bindings }>()

  // ── OG image routes ────────────────────────────────────────────────────
  app.get('/api/image/tokens/:networkName/:tokenAddress', cacheControl(604800), tokenImageHandler)

  app.get('/api/image/pools/:networkName/:poolAddress', cacheControl(604800), poolImageHandler)

  // ── BFF proxy: entry-gateway ─────────────────────────────────────────
  app.all('/entry-gateway/*', async (c) => {
    const backendUrl = getEntryGatewayUrl(c)
    const path = c.req.path.slice('/entry-gateway'.length) || '/'
    const query = new URL(c.req.url).search

    // Forward the real client IP so the EGW authorizer (and downstream providers
    // like Coinbase) see the user's IP, not the proxy's IP.
    // On Cloudflare Workers, cf-connecting-ip is already set by Cloudflare.
    // On Vercel, we set it from Vercel's trusted x-real-ip header (set at the
    // TCP level by Vercel's edge, cannot be spoofed by clients).
    // We always overwrite cf-connecting-ip when we have a trusted source to
    // prevent clients from spoofing it on the Vercel path (where there's no
    // Cloudflare to sanitize headers).
    const clientIp = c.req.header('x-real-ip')
    const extraHeaders: Record<string, string> = {}
    if (clientIp) {
      extraHeaders['cf-connecting-ip'] = clientIp
    }

    const response = await proxy(`${backendUrl}${path}${query}`, {
      raw: c.req.raw,
      headers: {
        ...c.req.header(),
        ...extraHeaders,
        host: undefined,
      },
    })

    // Rewrite Set-Cookie headers so cookies work on non-.uniswap.org domains
    // (Vercel previews, staging, etc.)
    return rewriteProxiedCookies(response)
  })

  // ── BFF proxy: config ──────────────────────────────────────────────
  app.all('/config/*', async (c) => {
    const path = c.req.path.replace(/^\/config/, '/v1/statsig-proxy')
    const query = new URL(c.req.url).search

    return proxy(`${STATSIG_PROXY_TARGET}${path}${query}`, {
      raw: c.req.raw,
      headers: {
        ...c.req.header(),
        host: undefined,
      },
    })
  })

  // ── Catch-all: SPA serving + meta tag injection ────────────────────────
  app.all('*', async (c: Context) => {
    const url = new URL(c.req.url)

    const next = async () => {
      const response = await fetchSpaHtml(c)
      c.res = response
    }

    // API routes should not be processed by meta tag injection
    if (url.pathname.startsWith('/api/')) {
      await next()
      return c.res
    }

    // For non-API routes, use meta tag injection middleware
    return metaTagInjectionMiddleware(c, next)
  })

  return app
}
