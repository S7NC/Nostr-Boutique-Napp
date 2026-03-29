import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure'
import * as nip19 from 'nostr-tools/nip19'
import { SimplePool } from 'nostr-tools/pool'

const getTagValue = (tags, tagName) => {
  const tag = tags.find((item) => item[0] === tagName)
  return tag?.[1] || ''
}

const getPaymentInvoice = (tags) => {
  for (const tag of tags) {
    if (tag[0] === 'payment' && tag[1] === 'lightning' && tag[2]) {
      return tag[2]
    }
  }

  return ''
}

const toHexSecret = (nsec) => {
  const decoded = nip19.decode(nsec)
  if (decoded.type !== 'nsec') {
    throw new Error('Invalid nsec key')
  }
  return decoded.data
}

export const useNostrOrders = () => {
  const pool = new SimplePool()

  const generateGuestIdentity = () => {
    const secretKey = generateSecretKey()
    const pubkey = getPublicKey(secretKey)

    return {
      npub: nip19.npubEncode(pubkey),
      nsec: nip19.nsecEncode(secretKey),
      pubkey
    }
  }

  const buildOrderEvent = ({
    merchantPubkey,
    orderId,
    amountSats,
    items,
    shippingReference,
    address,
    email,
    phone,
    notes
  }) => {
    const tags = [
      ['p', merchantPubkey],
      ['subject', `order-${orderId}`],
      ['type', '1'],
      ['order', orderId],
      ['amount', String(amountSats)]
    ]

    for (const item of items) {
      tags.push(['item', item.reference, String(item.quantity)])
    }

    if (shippingReference) tags.push(['shipping', shippingReference])
    if (address) tags.push(['address', address])
    if (email) tags.push(['email', email])
    if (phone) tags.push(['phone', phone])

    return {
      kind: 16,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: notes || ''
    }
  }

  const signAndPublish = async ({ eventTemplate, nsec, relays }) => {
    const secretKey = toHexSecret(nsec)
    const event = finalizeEvent(eventTemplate, secretKey)

    const pubs = pool.publish(relays, event)
    await Promise.any(pubs)

    return event
  }

  const findPaymentRequest = async ({ merchantPubkey, buyerPubkey, orderId, relays }) => {
    const primaryEvents = merchantPubkey
      ? await pool.querySync(relays, {
          kinds: [16],
          authors: [merchantPubkey],
          '#p': [buyerPubkey],
          limit: 100
        })
      : []

    const fallbackEvents = await pool.querySync(relays, {
      kinds: [16],
      '#p': [buyerPubkey],
      limit: 200
    })

    const events = [...primaryEvents, ...fallbackEvents]

    const paymentEvent = events
      .filter((event) => {
        const type = getTagValue(event.tags, 'type')
        const order = getTagValue(event.tags, 'order')
        return type === '2' && order === orderId
      })
      .sort((a, b) => b.created_at - a.created_at)[0]

    if (!paymentEvent) return null

    const invoice = getPaymentInvoice(paymentEvent.tags)
    if (!invoice) return null

    return {
      eventId: paymentEvent.id,
      amount: getTagValue(paymentEvent.tags, 'amount'),
      invoice,
      expiration: getTagValue(paymentEvent.tags, 'expiration')
    }
  }

  return {
    generateGuestIdentity,
    buildOrderEvent,
    signAndPublish,
    findPaymentRequest
  }
}
