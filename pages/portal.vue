<script setup>
import ShopHeader from '~/components/shop/ShopHeader.vue'
import ShopFooter from '~/components/shop/ShopFooter.vue'
import { useCartStore } from '~/stores/cart'
import { useShopBootstrap } from '~/composables/useShopBootstrap'
import { buildNamedNsiteUrl } from '~/composables/useNamedNsiteUrl'

useSeoMeta({
  title: 'Merchant Portal',
  description: 'Connect to merchant portal deployment gateways.'
})

const cart = useCartStore()
const { ensureBootstrap, bootstrapState } = useShopBootstrap()

const merchantProfile = ref(bootstrapState.value.merchantProfile || null)
const merchantNpub = ref(bootstrapState.value.identity?.merchantNpub || '')
const status = ref('connecting')
const statusText = ref('Connecting you to merchant portal...')
const error = ref('')

const NOSTR_OSTRICH_ANIM_URL = '/nostr-assets/nostr-ostrich-running.gif'
const gateways = ['nsite.lol', 'nsite.cloud']

const portalTargets = computed(() => {
  const pubkey = bootstrapState.value.identity?.merchantPubkey || ''
  if (!pubkey) return []

  return gateways.map((gateway) => {
    return {
      gateway,
      url: buildNamedNsiteUrl({
        pubkey,
        name: 'portal',
        gateway
      })
    }
  })
})

const navigateTo = (url) => {
  if (!url || !process.client) return
  window.location.assign(url)
}

const probeGateway = async (url, timeoutMs = 5000) => {
  if (!process.client) return false

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal
    })
    return response.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}

const resolveFirstReachable = async () => {
  const targets = portalTargets.value
  if (!targets.length) return ''

  return new Promise((resolve) => {
    let pending = targets.length
    let settled = false

    for (const target of targets) {
      probeGateway(target.url)
        .then((ok) => {
          if (settled) return
          if (ok) {
            settled = true
            resolve(target.url)
            return
          }

          pending -= 1
          if (pending === 0) {
            settled = true
            resolve('')
          }
        })
        .catch(() => {
          pending -= 1
          if (!settled && pending === 0) {
            settled = true
            resolve('')
          }
        })
    }
  })
}

const startPortalResolution = async () => {
  status.value = 'connecting'
  statusText.value = 'Connecting you to merchant portal...'
  error.value = ''

  try {
    const bootstrap = await ensureBootstrap()
    merchantProfile.value = bootstrap.merchantProfile || null
    merchantNpub.value = bootstrap.identity?.merchantNpub || ''

    if (!bootstrap.identity?.merchantPubkey) {
      throw new Error('Merchant identity is missing. Could not build portal URL.')
    }

    const winner = await resolveFirstReachable()
    if (winner) {
      status.value = 'redirecting'
      statusText.value = 'Portal found. Redirecting now...'
      window.setTimeout(() => navigateTo(winner), 150)
      return
    }

    status.value = 'failed'
    statusText.value = 'Could not reach merchant portal automatically.'
    error.value = 'Choose a gateway below to continue manually.'
  } catch (cause) {
    status.value = 'failed'
    statusText.value = 'Could not connect to merchant portal.'
    error.value = cause?.message || 'Please try again or open a gateway manually.'
  }
}

onMounted(async () => {
  await startPortalResolution()
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <ShopHeader :item-count="cart.totalItems" :merchant-profile="merchantProfile" :merchant-npub="merchantNpub" />

    <main class="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <section class="w-full max-w-2xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center sm:p-8">
        <img
          :src="NOSTR_OSTRICH_ANIM_URL"
          alt="Connecting to merchant portal"
          class="mx-auto h-24 w-24 object-contain"
        >
        <h1 class="mt-4 text-2xl font-semibold tracking-tight">Merchant Portal</h1>
        <p class="mt-2 text-sm text-[var(--muted)]">{{ statusText }}</p>

        <p v-if="error" class="mt-3 text-sm text-red-500">{{ error }}</p>

        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <a
            v-for="target in portalTargets"
            :key="target.gateway"
            :href="target.url"
            class="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold transition hover:border-[var(--brand)] hover:bg-black/5"
          >
            Open on {{ target.gateway }}
          </a>
        </div>

        <button
          class="mt-4 rounded-lg border border-[var(--line)] px-4 py-2 text-sm"
          :disabled="status === 'connecting'"
          @click="startPortalResolution"
        >
          Retry connection
        </button>
      </section>
    </main>

    <ShopFooter :merchant-profile="merchantProfile" :merchant-npub="merchantNpub" />
  </div>
</template>
