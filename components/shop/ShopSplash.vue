<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: true
  },
  error: {
    type: String,
    default: ''
  }
})

defineEmits(['retry'])

const NOSTR_OSTRICH_ANIM_URL = '/nostr-assets/nostr-ostrich-running.gif'
</script>

<template>
  <div class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4">
    <div class="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center shadow-2xl">
      <img
        :src="NOSTR_OSTRICH_ANIM_URL"
        alt="Loading shop"
        class="mx-auto h-24 w-24 object-contain"
      >
      <h2 class="mt-3 text-xl font-semibold">Loading shop...</h2>
      <p class="mt-2 text-sm text-[var(--muted)]">Before we shop the shop, we are fetching everything from relays.</p>

      <p v-if="loading" class="mt-3 text-sm text-[var(--muted)]">Connecting to relays...</p>

      <div v-else-if="error" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-sm text-red-800">
        <p class="font-semibold">Could not load the shop.</p>
        <p class="mt-1">{{ error }}</p>
        <button class="mt-3 rounded border border-red-300 bg-white px-3 py-1 text-xs" @click="$emit('retry')">
          Retry
        </button>
      </div>
    </div>
  </div>
</template>
