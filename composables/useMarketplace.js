import { SimplePool } from 'nostr-tools/pool'

const getTagValues = (tags, name) => tags.filter((tag) => tag[0] === name).map((tag) => tag.slice(1))
const getTagValue = (tags, name, fallback = '') => {
  const found = tags.find((tag) => tag[0] === name)
  return found?.[1] || fallback
}

const parsePrice = (tags) => {
  const priceTag = tags.find((tag) => tag[0] === 'price')
  if (!priceTag) {
    return { amount: 0, currency: 'SATS', display: '0 SATS' }
  }

  const amount = Number(priceTag[1] || 0)
  const currency = (priceTag[2] || 'SATS').toUpperCase()

  return {
    amount: Number.isFinite(amount) ? amount : 0,
    currency,
    display: `${priceTag[1] || '0'} ${currency}`
  }
}

const parseImages = (tags) => {
  return getTagValues(tags, 'image')
    .map((imageTag) => ({
      url: imageTag[0],
      dimensions: imageTag[1] || '',
      order: Number(imageTag[2] || 999)
    }))
    .filter((image) => !!image.url)
    .sort((a, b) => a.order - b.order)
}

const parseProductEvent = (event) => {
  const tags = event.tags || []
  const dTag = getTagValue(tags, 'd')
  if (!dTag) return null

  const title = getTagValue(tags, 'title', 'Untitled Product')
  const summary = getTagValue(tags, 'summary', '')
  const visibility = getTagValue(tags, 'visibility', 'on-sale')
  if (visibility === 'hidden') return null

  const typeTag = tags.find((tag) => tag[0] === 'type')
  const productType = typeTag?.[1] || 'simple'
  const format = typeTag?.[2] || 'digital'
  const stockRaw = getTagValue(tags, 'stock', '')
  const stock = stockRaw ? Number(stockRaw) : null

  const specs = getTagValues(tags, 'spec').map((spec) => ({
    key: spec[0] || '',
    value: spec[1] || ''
  })).filter((spec) => spec.key && spec.value)

  const shippingOptions = getTagValues(tags, 'shipping_option').map((value) => ({
    ref: value[0],
    extraCost: value[1] || null
  })).filter((option) => option.ref)

  const categoryTags = getTagValues(tags, 't').map((tag) => tag[0]).filter(Boolean)
  const images = parseImages(tags)
  const firstImage = images[0]?.url || ''
  const price = parsePrice(tags)

  return {
    id: event.id,
    d: dTag,
    reference: `30402:${event.pubkey}:${dTag}`,
    pubkey: event.pubkey,
    title,
    summary,
    description: event.content || '',
    visibility,
    productType,
    format,
    stock,
    specs,
    shippingOptions,
    categories: categoryTags,
    images,
    image: firstImage,
    price,
    createdAt: event.created_at
  }
}

const collectDeletionTargets = (deleteEvents) => {
  const deletedRefs = new Set()
  const deletedEventIds = new Set()

  for (const event of deleteEvents) {
    for (const tag of event.tags || []) {
      if (tag[0] === 'a' && tag[1]?.startsWith('30402:')) {
        deletedRefs.add(tag[1])
      }

      if (tag[0] === 'e' && tag[1]) {
        deletedEventIds.add(tag[1])
      }
    }
  }

  return {
    deletedRefs,
    deletedEventIds
  }
}

export const useMarketplace = () => {
  const pool = new SimplePool()

  const fetchProducts = async ({ merchantPubkey, relays }) => {
    const events = await pool.querySync(relays, {
      kinds: [30402],
      authors: [merchantPubkey],
      limit: 300
    })

    const deleteEvents = await pool.querySync(relays, {
      kinds: [5],
      authors: [merchantPubkey],
      limit: 300
    })

    const { deletedRefs, deletedEventIds } = collectDeletionTargets(deleteEvents)

    const parsedProducts = events
      .filter((event) => {
        const dTag = getTagValue(event.tags || [], 'd')
        const reference = dTag ? `30402:${event.pubkey}:${dTag}` : ''
        if (event.id && deletedEventIds.has(event.id)) return false
        if (reference && deletedRefs.has(reference)) return false
        return true
      })
      .map(parseProductEvent)
      .filter(Boolean)

    const latestByD = new Map()
    for (const product of parsedProducts) {
      const existing = latestByD.get(product.d)
      if (!existing) {
        latestByD.set(product.d, product)
        continue
      }

      if (product.createdAt > existing.createdAt) {
        latestByD.set(product.d, product)
        continue
      }

      if (product.createdAt === existing.createdAt && product.id > existing.id) {
        latestByD.set(product.d, product)
      }
    }

    return Array.from(latestByD.values())
      .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id))
  }

  const fetchProductByD = async ({ merchantPubkey, dTag, relays }) => {
    const events = await pool.querySync(relays, {
      kinds: [30402],
      authors: [merchantPubkey],
      '#d': [dTag],
      limit: 10
    })

    const deleteEvents = await pool.querySync(relays, {
      kinds: [5],
      authors: [merchantPubkey],
      limit: 300
    })

    const { deletedRefs, deletedEventIds } = collectDeletionTargets(deleteEvents)
    const reference = `30402:${merchantPubkey}:${dTag}`
    if (deletedRefs.has(reference)) return null

    const product = events
      .filter((event) => !(event.id && deletedEventIds.has(event.id)))
      .map(parseProductEvent)
      .filter(Boolean)
      .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id))[0]

    return product || null
  }

  return {
    fetchProducts,
    fetchProductByD
  }
}
