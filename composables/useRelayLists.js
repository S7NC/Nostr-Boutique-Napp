import { SimplePool } from 'nostr-tools/pool'

const toRelay = (value) => {
  if (typeof value !== 'string') return null
  const relay = value.trim()
  if (!relay.startsWith('wss://')) return null
  return relay
}

const uniq = (relays) => {
  return Array.from(new Set(relays.map(toRelay).filter(Boolean)))
}

const parseRelayTags = (event) => {
  const readRelays = []
  const writeRelays = []

  for (const tag of event?.tags || []) {
    if (tag[0] !== 'r' || !tag[1]) continue

    const relay = toRelay(tag[1])
    if (!relay) continue

    const marker = tag[2]
    if (marker === 'read') {
      readRelays.push(relay)
      continue
    }

    if (marker === 'write') {
      writeRelays.push(relay)
      continue
    }

    readRelays.push(relay)
    writeRelays.push(relay)
  }

  return {
    readRelays: uniq(readRelays),
    writeRelays: uniq(writeRelays)
  }
}

export const useRelayLists = () => {
  const pool = new SimplePool()

  const fetchRelayList = async (pubkey, discoveryRelays) => {
    const relays = uniq(discoveryRelays)
    if (!pubkey || relays.length === 0) {
      return {
        inboxRelays: [],
        outboxRelays: [],
        source: 'none'
      }
    }

    const events = await pool.querySync(relays, {
      kinds: [10002],
      authors: [pubkey],
      limit: 5
    })

    const latest = [...events].sort((a, b) => b.created_at - a.created_at)[0]
    if (!latest) {
      return {
        inboxRelays: relays,
        outboxRelays: relays,
        source: 'bootstrap'
      }
    }

    const parsed = parseRelayTags(latest)

    const inboxRelays = parsed.readRelays.length > 0 ? parsed.readRelays : relays
    const outboxRelays = parsed.writeRelays.length > 0 ? parsed.writeRelays : relays

    return {
      inboxRelays,
      outboxRelays,
      source: 'kind10002'
    }
  }

  const resolveRelayMap = async ({ merchantPubkey, buyerPubkey, discoveryRelays }) => {
    const [merchant, buyer] = await Promise.all([
      fetchRelayList(merchantPubkey, discoveryRelays),
      buyerPubkey ? fetchRelayList(buyerPubkey, discoveryRelays) : Promise.resolve(null)
    ])

    const readRelays = uniq([
      ...(buyer?.inboxRelays || []),
      ...merchant.outboxRelays
    ])

    return {
      merchantInbox: merchant.inboxRelays,
      merchantOutbox: merchant.outboxRelays,
      buyerInbox: buyer?.inboxRelays || [],
      buyerOutbox: buyer?.outboxRelays || [],
      orderPublishRelays: uniq([
        ...(buyer?.outboxRelays || []),
        ...merchant.inboxRelays
      ]),
      paymentListenRelays: readRelays,
      sources: {
        merchant: merchant.source,
        buyer: buyer?.source || 'none'
      }
    }
  }

  const close = () => {
    pool.close([])
  }

  return {
    fetchRelayList,
    resolveRelayMap,
    close
  }
}
