<script setup>
import NsiteCloneFab from '~/components/shop/NsiteCloneFab.vue'

const props = defineProps({
  merchantProfile: {
    type: Object,
    default: null
  },
  merchantNpub: {
    type: String,
    default: ''
  }
})

const year = new Date().getFullYear()

const footerTitle = computed(() => {
  return props.merchantProfile?.name || 'Nostr Boutique'
})

const footerDescription = computed(() => {
  return props.merchantProfile?.about || 'A sovereign storefront powered by Nostr relays and Blossom hosting.'
})

const websiteUrl = computed(() => {
  const raw = String(props.merchantProfile?.website || props.merchantProfile?.url || '').trim()
  if (!raw) return ''
  return raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
})

const websiteLabel = computed(() => {
  if (!websiteUrl.value) return ''
  return websiteUrl.value.replace(/^https?:\/\//, '')
})

const openSearch = () => {
  if (!process.client) return
  window.dispatchEvent(new CustomEvent('shop:open-search'))
}

const openDevConsole = () => {
  if (!process.client) return
  window.dispatchEvent(new CustomEvent('shop:open-dev-console'))
}

const footerDescriptionParts = computed(() => {
  const text = footerDescription.value
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
  const matches = Array.from(text.matchAll(urlPattern))

  if (!matches.length) {
    return [{ type: 'text', value: text }]
  }

  const parts = []
  let lastIndex = 0

  for (const match of matches) {
    const value = match[0]
    const index = match.index || 0

    if (index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, index) })
    }

    parts.push({
      type: 'link',
      value,
      href: value.startsWith('http') ? value : `https://${value}`
    })

    lastIndex = index + value.length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return parts
})
</script>

<template>
  <footer class="mt-12 border-t border-[var(--line)] bg-[var(--surface)]/70">
    <div class="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.5fr_0.9fr] lg:px-8">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Nostr Boutique</p>
        <h2 class="mt-2 text-xl font-semibold tracking-tight">{{ footerTitle }}</h2>
        <p class="mt-3 max-w-xl text-sm text-[var(--muted)]">
          <template v-for="(part, index) in footerDescriptionParts" :key="`${part.type}-${index}`">
            <a
              v-if="part.type === 'link'"
              :href="part.href"
              target="_blank"
              rel="noopener noreferrer"
              class="underline underline-offset-4 hover:text-[var(--text)]"
            >
              {{ part.value }}
            </a>
            <span v-else>{{ part.value }}</span>
          </template>
        </p>
        <a
          v-if="websiteUrl"
          :href="websiteUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-3 inline-flex text-sm font-medium underline underline-offset-4 hover:text-[var(--text)]"
        >
          {{ websiteLabel }}
        </a>
      </div>

      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Browse</p>
        <div class="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm font-medium md:grid-cols-3">
          <NuxtLink to="/">Home</NuxtLink>
          <NuxtLink to="/products">Products</NuxtLink>
          <NuxtLink to="/categories">Categories</NuxtLink>
          <a href="#" @click.prevent="openDevConsole">Dev Console</a>
          <NuxtLink to="/cart">Cart</NuxtLink>
          <a href="#" @click.prevent="openSearch">Search</a>
        </div>
      </div>
    </div>

    <div class="border-t border-[var(--line)]">
      <div class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-xs text-[var(--muted)] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <p>{{ year }} {{ footerTitle }}. Powered by Nostr.</p>
          <p class="mt-1">Decentralized products, merchant-owned identity.</p>
        </div>
        <div class="md:ml-auto">
          <NsiteCloneFab embedded />
        </div>
      </div>
    </div>
  </footer>
</template>
