<script setup>
import DeveloperConsoleFab from '~/components/shop/DeveloperConsoleFab.vue'
import ShopSplash from '~/components/shop/ShopSplash.vue'
import { useShopBootstrap } from '~/composables/useShopBootstrap'

const { bootstrapState, ensureBootstrap } = useShopBootstrap()
const route = useRoute()

useHead(() => {
  const storeName = bootstrapState.value.merchantProfile?.name?.trim()
  const baseTitle = storeName ? `Nostr Boutique - ${storeName}` : 'Nostr Boutique'

  return {
    titleTemplate: (titleChunk) => {
      if (!titleChunk) return baseTitle
      if (titleChunk === baseTitle || titleChunk === 'Nostr Boutique') return baseTitle
      return `${titleChunk} | ${baseTitle}`
    }
  }
})

const shouldBootstrapRoute = computed(() => {
  const path = route.path || ''
  return path === '/'
    || path === '/products'
    || path === '/categories'
    || path === '/cart'
    || path.startsWith('/product/')
})

const retryBootstrap = async () => {
  try {
    await ensureBootstrap({ force: true })
  } catch {
  }
}

onMounted(async () => {
  if (shouldBootstrapRoute.value && !bootstrapState.value.isBootstrapped) {
    try {
      await ensureBootstrap()
    } catch {
    }
  }
})

watch(shouldBootstrapRoute, async (needsBootstrap) => {
  if (!needsBootstrap || bootstrapState.value.isBootstrapped || bootstrapState.value.isBootstrapping) return
  try {
    await ensureBootstrap()
  } catch {
  }
})
</script>
<template>
  <div>
    <ShopSplash
      v-if="shouldBootstrapRoute && !bootstrapState.isBootstrapped"
      :loading="bootstrapState.isBootstrapping"
      :error="bootstrapState.error"
      :status-text="bootstrapState.statusText"
      @retry="retryBootstrap"
    />
    <NuxtPage />
    <DeveloperConsoleFab hidden-trigger />
  </div>
</template>
