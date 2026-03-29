import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'gamma-market-cart-v1'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const shippingInfo = ref({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    country: '',
    email: '',
    phone: '',
    notes: ''
  })

  const shippingReference = ref('')
  const guestKeys = ref(null)
  const orderState = ref({
    orderId: '',
    status: 'idle',
    submittedEventId: '',
    invoice: '',
    invoiceAmount: '',
    invoiceExpiration: ''
  })

  const hydrate = () => {
    if (!process.client) return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw)
      items.value = parsed.items || []
      shippingInfo.value = { ...shippingInfo.value, ...(parsed.shippingInfo || {}) }
      shippingReference.value = parsed.shippingReference || ''
      guestKeys.value = parsed.guestKeys || null
      orderState.value = { ...orderState.value, ...(parsed.orderState || {}) }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  if (process.client) {
    hydrate()

    watch(
      [items, shippingInfo, shippingReference, guestKeys, orderState],
      () => {
        const payload = {
          items: items.value,
          shippingInfo: shippingInfo.value,
          shippingReference: shippingReference.value,
          guestKeys: guestKeys.value,
          orderState: orderState.value
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      },
      { deep: true }
    )
  }

  const subtotal = computed(() => {
    return items.value.reduce((sum, item) => {
      const amount = Number(item.price?.amount || 0)
      return sum + (amount * item.quantity)
    }, 0)
  })

  const totalItems = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0)
  })

  const addToCart = (product, quantity = 1) => {
    const existing = items.value.find((item) => item.reference === product.reference)
    if (existing) {
      existing.quantity += quantity
      return
    }

    items.value.push({
      reference: product.reference,
      d: product.d,
      title: product.title,
      image: product.image,
      price: product.price,
      quantity
    })
  }

  const removeFromCart = (reference) => {
    items.value = items.value.filter((item) => item.reference !== reference)
  }

  const updateQuantity = (reference, quantity) => {
    const item = items.value.find((entry) => entry.reference === reference)
    if (!item) return
    item.quantity = Math.max(1, Number(quantity) || 1)
  }

  const setShippingInfo = (payload) => {
    shippingInfo.value = { ...shippingInfo.value, ...payload }
  }

  const setGuestKeys = (keys) => {
    guestKeys.value = keys
  }

  const setOrderState = (payload) => {
    orderState.value = { ...orderState.value, ...payload }
  }

  const clearCheckout = () => {
    shippingReference.value = ''
    orderState.value = {
      orderId: '',
      status: 'idle',
      submittedEventId: '',
      invoice: '',
      invoiceAmount: '',
      invoiceExpiration: ''
    }
  }

  const clearCart = () => {
    items.value = []
    clearCheckout()
  }

  return {
    items,
    shippingInfo,
    shippingReference,
    guestKeys,
    orderState,
    subtotal,
    totalItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    setShippingInfo,
    setGuestKeys,
    setOrderState,
    clearCheckout,
    clearCart
  }
})
