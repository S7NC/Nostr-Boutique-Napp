<script setup>
import NsiteCloneFab from '~/components/shop/NsiteCloneFab.vue'
import DeveloperConsoleFab from '~/components/shop/DeveloperConsoleFab.vue'
import ShopSplash from '~/components/shop/ShopSplash.vue'
import { useShopBootstrap } from '~/composables/useShopBootstrap'

const { bootstrapState, ensureBootstrap } = useShopBootstrap()
const route = useRoute()

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
      @retry="retryBootstrap"
    />
    <NuxtPage />
    <NsiteCloneFab />
    <DeveloperConsoleFab />
  </div>
</template>
