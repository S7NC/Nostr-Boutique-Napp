import { SimplePool } from 'nostr-tools/pool'

const getTagValue = (tags, tagName) => {
  const tag = (tags || []).find((item) => item[0] === tagName)
  return tag?.[1] || ''
}

const parseLud16 = (value) => {
  const [name, domain] = String(value || '').trim().split('@')
  if (!name || !domain) return null
  return { name, domain }
}

export const useLightningInvoice = () => {
  const pool = new SimplePool()

  const fetchMerchantLud16 = async ({ merchantPubkey, relays }) => {
    const events = await pool.querySync(relays, {
      kinds: [0],
      authors: [merchantPubkey],
      limit: 5
    })

    const latest = [...events].sort((a, b) => b.created_at - a.created_at)[0]
    if (!latest) return ''

    let content = {}
    try {
      content = JSON.parse(latest.content || '{}')
    } catch {
      content = {}
    }

    return content.lud16 || content.lightning_address || getTagValue(latest.tags, 'lud16') || ''
  }

  const requestInvoiceFromLud16 = async ({ lud16, amountSats, comment = '' }) => {
    const parsed = parseLud16(lud16)
    if (!parsed) {
      throw new Error('Merchant has no valid lud16 lightning address.')
    }

    const lnurlUrl = `https://${parsed.domain}/.well-known/lnurlp/${parsed.name}`
    const lnurlResponse = await fetch(lnurlUrl, { cache: 'no-store' })
    if (!lnurlResponse.ok) {
      throw new Error(`Failed lnurlp lookup (${lnurlResponse.status})`)
    }

    const lnurlData = await lnurlResponse.json()
    if (!lnurlData?.callback) {
      throw new Error('Invalid lnurlp response: missing callback URL')
    }

    const amountMsat = Math.round(Number(amountSats || 0) * 1000)
    if (!Number.isFinite(amountMsat) || amountMsat <= 0) {
      throw new Error('Invalid sats amount for lightning invoice request.')
    }

    if (Number.isFinite(lnurlData.minSendable) && amountMsat < lnurlData.minSendable) {
      throw new Error('Order total is below merchant minimum lightning amount.')
    }

    if (Number.isFinite(lnurlData.maxSendable) && amountMsat > lnurlData.maxSendable) {
      throw new Error('Order total is above merchant maximum lightning amount.')
    }

    const callback = new URL(lnurlData.callback)
    callback.searchParams.set('amount', String(amountMsat))
    if (comment && Number(lnurlData.commentAllowed || 0) > 0) {
      callback.searchParams.set('comment', comment.slice(0, Number(lnurlData.commentAllowed || 0)))
    }

    const invoiceResponse = await fetch(callback.toString(), { cache: 'no-store' })
    if (!invoiceResponse.ok) {
      throw new Error(`Failed lightning invoice request (${invoiceResponse.status})`)
    }

    const invoiceData = await invoiceResponse.json()
    if (!invoiceData?.pr) {
      throw new Error('No bolt11 invoice returned by merchant lightning endpoint.')
    }

    return {
      invoice: invoiceData.pr,
      source: 'lud16'
    }
  }

  return {
    fetchMerchantLud16,
    requestInvoiceFromLud16
  }
}
