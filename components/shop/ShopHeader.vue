<script setup>
import { useTheme } from '~/composables/useTheme'

defineProps({
  itemCount: {
    type: Number,
    default: 0
  },
  merchantProfile: {
    type: Object,
    default: null
  }
})

const { theme, initializeTheme, toggleTheme } = useTheme()

onMounted(() => {
  initializeTheme()
})
</script>

<template>
  <header class="sticky top-0 z-10 border-b border-[var(--line)] bg-[color:var(--surface)]/95 backdrop-blur">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
      <NuxtLink to="/" class="flex items-center gap-3 text-lg font-semibold tracking-tight">
        <img
          v-if="merchantProfile?.picture"
          :src="merchantProfile.picture"
          alt="Merchant profile"
          class="h-9 w-9 rounded-full border border-[var(--line)] object-cover"
        >
        <div v-else class="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-stone-100 text-xs font-bold text-[var(--muted)]">
          M
        </div>
        <span>{{ merchantProfile?.name || 'Merchant Shop' }}</span>
      </NuxtLink>

      <nav class="flex items-center gap-4 text-sm font-medium">
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)]"
          @click="toggleTheme"
        >
          <span class="sr-only">{{ theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode' }}</span>

          <svg
            v-if="theme === 'dark'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>

          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M12 3a7 7 0 1 0 9 9 9 9 0 1 1-9-9z" />
          </svg>
        </button>
        <NuxtLink to="/">Products</NuxtLink>
        <NuxtLink to="/cart" class="rounded-full border border-[var(--line)] px-3 py-1">
          Cart ({{ itemCount }})
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
