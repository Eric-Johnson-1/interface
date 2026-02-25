// Cloudflare Workers entry point
import { createApp, ENTRY_GATEWAY_URLS } from 'functions/app'

const app = createApp({
  fetchSpaHtml: (c) => c.env.ASSETS.fetch(c.req.raw),
  getEntryGatewayUrl: (c) => c.env?.ENTRY_GATEWAY_API_URL || ENTRY_GATEWAY_URLS.production,
})

// eslint-disable-next-line import/no-unused-modules
export default app
