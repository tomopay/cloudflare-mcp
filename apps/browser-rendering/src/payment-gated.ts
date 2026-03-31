/**
 * Tomopay payment-gated entry point for Cloudflare MCP — Browser Rendering + Workers AI
 *
 * This is an ADDITIVE wrapper — original server code is untouched.
 * Drop this file into apps/browser-rendering/src/ and import instead of the default entry.
 *
 * Agents pay via x402 (USDC on Base) or MPP (Stripe Machine Payments Protocol).
 * Settled directly to the operator's wallet/account.
 *
 * Usage:
 *   import { withPayments } from '@tomopay/gateway'
 *   import { server } from './browser.app'
 *
 *   const { server: gatedServer } = withPayments(server, {
 *     payTo: process.env.TOMOPAY_ADDRESS,
 *     protocols: ['x402', 'mpp'],
 *     pricing: BROWSER_PRICING,
 *   })
 *
 *   export default gatedServer
 */

import { withPayments } from '@tomopay/gateway'
import { server } from './browser.app'

/**
 * Pricing schedule for Cloudflare Browser Rendering + Workers AI tools.
 *
 * Amounts are in micro-USD (1 = $0.000001), so:
 *   50000  = $0.05
 *   20000  = $0.02
 *   10000  = $0.01
 *
 * Rationale:
 *   - get_url_screenshot / get_url_html_content / get_url_markdown:
 *       Cloudflare Browser Rendering spins a full headless Chromium instance per request.
 *       Cost is non-trivial; $0.05/call covers infra + reasonable margin.
 *   - AI inference tools (ai_run, ai_text_generation, ai_image_classification):
 *       Lighter compute than full browser; $0.02/call reflects inference cost.
 *   - KV namespace management (kv_namespaces_list, kv_namespace_create, etc.):
 *       Low-cost metadata ops; $0.01 read-equivalent, $0.02 write-equivalent.
 */
export const BROWSER_PRICING = {
  // Browser Rendering — full headless Chromium per call
  get_url_screenshot: { amount: 50000, currency: 'USD', description: 'Browser screenshot via Cloudflare Browser Rendering' },
  get_url_html_content: { amount: 50000, currency: 'USD', description: 'Page HTML fetch via Cloudflare Browser Rendering' },
  get_url_markdown: { amount: 50000, currency: 'USD', description: 'Page-to-Markdown conversion via Cloudflare Browser Rendering' },

  // Workers AI inference
  ai_run: { amount: 20000, currency: 'USD', description: 'AI model inference via Workers AI' },
  ai_text_generation: { amount: 20000, currency: 'USD', description: 'Text generation via Workers AI' },
  ai_image_classification: { amount: 20000, currency: 'USD', description: 'Image classification via Workers AI' },

  // KV namespace management
  kv_namespaces_list: { amount: 10000, currency: 'USD', description: 'List KV namespaces' },
  kv_namespace_get: { amount: 10000, currency: 'USD', description: 'Get KV namespace metadata' },
  kv_namespace_create: { amount: 20000, currency: 'USD', description: 'Create KV namespace' },
  kv_namespace_update: { amount: 20000, currency: 'USD', description: 'Update KV namespace' },
  kv_namespace_delete: { amount: 20000, currency: 'USD', description: 'Delete KV namespace' },
} as const

/**
 * Payment-gated server instance.
 *
 * withPayments wraps each registered tool. When an agent calls a priced tool,
 * the gateway intercepts, checks for a valid x402 or MPP payment header,
 * and either proceeds (paid) or returns a 402 + payment instructions.
 *
 * Unpaid / free tools (e.g. accounts_list, set_active_account) pass through
 * unchanged — only tools listed in `pricing` are gated.
 */
export const { server: gatedServer, paymentMiddleware } = withPayments(server, {
  payTo: process.env.TOMOPAY_ADDRESS ?? '',
  protocols: ['x402', 'mpp'],
  pricing: BROWSER_PRICING,
  onPayment: async (event) => {
    // Optional: log or audit payments
    console.log(`[tomopay] Payment received: ${event.tool} — ${event.amount} ${event.currency} from ${event.payer}`)
  },
})

export default gatedServer
