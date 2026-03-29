<script setup>
import { useShopIdentity } from '~/composables/useShopIdentity'
import { useRelayLists } from '~/composables/useRelayLists'
import { useMarketplace } from '~/composables/useMarketplace'
import { useMerchantProfile } from '~/composables/useMerchantProfile'
import { useCartStore } from '~/stores/cart'
import ShopHeader from '~/components/shop/ShopHeader.vue'
import ProductCard from '~/components/shop/ProductCard.vue'

useSeoMeta({
  title: 'Gamma Market Webshop',
  description: 'Minimal NIP-99 webshop with Gamma market checkout flow.'
})

const cart = useCartStore()
const { resolveIdentity } = useShopIdentity()
const { resolveRelayMap } = useRelayLists()
const { fetchProducts } = useMarketplace()
const { fetchMerchantProfile } = useMerchantProfile()

const loading = ref(true)
const error = ref('')
const merchantNpub = ref('')
const relaySource = ref('')
const products = ref([])
const merchantProfile = ref(null)

const add = (product) => {
  cart.addToCart(product, 1)
}

onMounted(async () => {
  try {
    const identity = await resolveIdentity()
    merchantNpub.value = identity.merchantNpub

    const relayMap = await resolveRelayMap({
      merchantPubkey: identity.merchantPubkey,
      discoveryRelays: identity.discoveryRelays
    })

    relaySource.value = relayMap.sources.merchant

    merchantProfile.value = await fetchMerchantProfile({
      merchantPubkey: identity.merchantPubkey,
      relays: relayMap.merchantOutbox
    })

    products.value = await fetchProducts({
      merchantPubkey: identity.merchantPubkey,
      relays: relayMap.merchantOutbox
    })
  } catch (cause) {
    error.value = cause.message || 'Failed to load products.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen pb-12">
    <ShopHeader :item-count="cart.totalItems" :merchant-profile="merchantProfile" />

    <main class="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
      <section class="mb-8 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <p class="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Gamma Market / NIP-99</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Minimal Webshop</h1>
        <p class="mt-3 max-w-3xl text-[var(--muted)]">
          Products are resolved from the merchant outbox relay set using inbox/outbox discovery.
        </p>
        <div class="mt-4 text-sm text-[var(--muted)]">
          Merchant: <span class="font-mono text-xs">{{ merchantNpub }}</span>
          <span class="mx-2">-</span>
          Relay source: {{ relaySource }}
        </div>
      </section>

      <section v-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
        {{ error }}
      </section>

      <section v-else-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="n in 6" :key="n" class="h-72 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
      </section>

      <section v-else-if="products.length === 0" class="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center">
        <p class="text-lg font-semibold">No products found for this merchant.</p>
        <p class="mt-2 text-sm text-[var(--muted)]">Check the merchant npub or relay list and refresh.</p>
      </section>

      <section v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
          @add="add"
        />
      </section>
    </main>
  </div>
</template>
