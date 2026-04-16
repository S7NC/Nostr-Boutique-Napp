<script setup>
import { useShopDebug } from '~/composables/useShopDebug'

const props = defineProps({
  hiddenTrigger: {
    type: Boolean,
    default: false
  }
})

const open = ref(false)
const { debugState } = useShopDebug()

const openConsole = () => {
  open.value = true
}

onMounted(() => {
  if (process.client) {
    window.addEventListener('shop:open-dev-console', openConsole)
  }
})

onBeforeUnmount(() => {
  if (process.client) {
    window.removeEventListener('shop:open-dev-console', openConsole)
  }
})
</script>

<template>
  <button
    v-if="!props.hiddenTrigger"
    class="fixed bottom-6 left-6 z-40 rounded-full border border-cyan-300/40 bg-cyan-500/20 px-3 py-2 text-xs font-semibold text-cyan-100 backdrop-blur"
    @click="open = true"
  >
    Dev Console
  </button>

  <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-start bg-black/45 p-4" @click.self="open = false">
    <div class="w-full max-w-lg rounded-2xl border border-cyan-300/40 bg-slate-900 p-4 text-xs text-slate-200 shadow-2xl">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-bold text-cyan-200">Shop Diagnostics</h3>
        <button class="rounded border border-slate-600 px-2 py-1" @click="open = false">Close</button>
      </div>

      <div class="space-y-2">
        <p><span class="text-slate-400">Merchant npub:</span> <span class="font-mono">{{ debugState.merchantNpub || 'n/a' }}</span></p>
        <p><span class="text-slate-400">Identity source:</span> {{ debugState.identitySource || 'n/a' }}</p>
        <p><span class="text-slate-400">Relay source:</span> {{ debugState.relaySource || 'n/a' }}</p>
        <p><span class="text-slate-400">Last page:</span> {{ debugState.lastPage || 'n/a' }}</p>

        <div>
          <p class="mb-1 text-slate-400">Merchant outbox relays:</p>
          <ul class="max-h-24 overflow-auto rounded border border-slate-700 p-2 font-mono text-[11px]">
            <li v-for="relay in debugState.merchantOutbox" :key="`o-${relay}`">{{ relay }}</li>
            <li v-if="!debugState.merchantOutbox?.length" class="text-slate-500">n/a</li>
          </ul>
        </div>

        <div>
          <p class="mb-1 text-slate-400">Merchant inbox relays:</p>
          <ul class="max-h-24 overflow-auto rounded border border-slate-700 p-2 font-mono text-[11px]">
            <li v-for="relay in debugState.merchantInbox" :key="`i-${relay}`">{{ relay }}</li>
            <li v-if="!debugState.merchantInbox?.length" class="text-slate-500">n/a</li>
          </ul>
        </div>

        <p class="text-slate-400">Details:</p>
        <pre class="max-h-40 overflow-auto rounded border border-slate-700 p-2 text-[11px]">{{ JSON.stringify(debugState.details || {}, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>
