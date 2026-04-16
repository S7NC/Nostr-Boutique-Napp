<script setup>
import * as nip19 from 'nostr-tools/nip19'
import { useShopDebug } from '~/composables/useShopDebug'
import { buildRootCloneManifestTemplate, useNsiteClone } from '~/composables/useNsiteClone'

const isOpen = ref(false)
const currentUrl = ref('')
const cloneMode = ref('choice')
const newcomerName = ref('')
const newcomerIdentity = ref(null)
const newcomerConfirmed = ref(false)
const newcomerBusy = ref(false)
const newcomerError = ref('')
const newcomerSuccessUrl = ref('')
const newcomerPublishRelays = ref([])
const existingBusy = ref(false)
const existingError = ref('')
const existingSuccessUrl = ref('')

const { debugState, setShopDebug } = useShopDebug()
const {
  uniq,
  generateIdentity,
  resolveSourceNpub,
  fetchSourceManifest,
  publishProfile,
  publishClonedManifest
} = useNsiteClone()

const NOSTR_OSTRICH_ANIM_URL = '/nostr-assets/nostr-ostrich-running.gif'

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false
  }
})

const resetFlowState = () => {
  cloneMode.value = 'choice'
  newcomerName.value = ''
  newcomerIdentity.value = null
  newcomerConfirmed.value = false
  newcomerBusy.value = false
  newcomerError.value = ''
  newcomerSuccessUrl.value = ''
  newcomerPublishRelays.value = []
  existingBusy.value = false
  existingError.value = ''
  existingSuccessUrl.value = ''
}

const closeModal = () => {
  isOpen.value = false
  resetFlowState()
}

const getCandidateRelays = () => {
  return uniq([
    ...(debugState.value.merchantOutbox || []),
    ...(debugState.value.merchantInbox || []),
    ...(debugState.value.orderPublishRelays || []),
    ...(debugState.value.paymentListenRelays || []),
    'wss://relay.ditto.pub',
    'wss://relay.damus.io',
    'wss://relay.primal.net',
    'wss://nos.lol'
  ])
}

const copyText = async (value) => {
  if (!process.client || !value) return
  await navigator.clipboard.writeText(value)
}

const startExistingFlow = async () => {
  cloneMode.value = 'existing'
  existingError.value = ''
}

const startNewFlow = () => {
  cloneMode.value = 'new'
  newcomerError.value = ''
}

const generateNewcomerKeys = () => {
  newcomerIdentity.value = generateIdentity()
  newcomerConfirmed.value = false
  newcomerError.value = ''

  console.log('[nsite-clone] newcomer keys generated', {
    npub: newcomerIdentity.value.npub,
    pubkey: newcomerIdentity.value.pubkey
  })

  setShopDebug({
    details: {
      cloneNewcomerGenerated: true,
      cloneNewcomerNpub: newcomerIdentity.value.npub
    }
  })
}

const publishAndCloneForNewcomer = async () => {
  newcomerError.value = ''

  if (!newcomerName.value.trim()) {
    newcomerError.value = 'Please enter a display name.'
    return
  }

  if (!newcomerIdentity.value) {
    newcomerError.value = 'Please generate your keys first.'
    return
  }

  if (!newcomerConfirmed.value) {
    newcomerError.value = 'Please confirm that you safely backed up your keys.'
    return
  }

  try {
    newcomerBusy.value = true

    const candidateRelays = getCandidateRelays()
    const sourceNpub = resolveSourceNpub({
      hostname: process.client ? window.location.hostname : '',
      fallbackNpub: debugState.value.merchantNpub
    })

    if (!sourceNpub) {
      throw new Error('Could not resolve source nsite npub for cloning.')
    }

    const source = await fetchSourceManifest({
      sourceNpub,
      relays: candidateRelays
    })

    const publishRelays = source.manifestRelays.length > 0
      ? source.manifestRelays
      : candidateRelays

    newcomerPublishRelays.value = publishRelays

    const profileEvent = await publishProfile({
      identity: newcomerIdentity.value,
      name: newcomerName.value.trim(),
      relays: publishRelays
    })

    const cloneEvent = await publishClonedManifest({
      identity: newcomerIdentity.value,
      sourceManifest: source.manifest,
      sourcePubkey: source.sourcePubkey,
      relays: publishRelays
    })

    const siteUrl = `https://${newcomerIdentity.value.npub}.nsite.lol/`
    newcomerSuccessUrl.value = siteUrl

    console.log('[nsite-clone] newcomer clone published', {
      sourceNpub,
      publishRelays,
      profileEventId: profileEvent.id,
      cloneEventId: cloneEvent.id,
      siteUrl
    })

    setShopDebug({
      details: {
        cloneNewcomerPublished: true,
        cloneNewcomerProfileEventId: profileEvent.id,
        cloneNewcomerManifestEventId: cloneEvent.id,
        cloneNewcomerSiteUrl: siteUrl
      }
    })

    if (process.client) {
      const opened = window.open(siteUrl, '_blank', 'noopener,noreferrer')
      if (!opened) {
        newcomerError.value = 'Clone published, but your browser blocked opening the new site tab. Use the link below.'
      }
    }

    cloneMode.value = 'new-success'
  } catch (error) {
    newcomerError.value = error.message || 'Failed to publish profile and clone this nsite.'
    console.error('[nsite-clone] newcomer clone failed', error)

    setShopDebug({
      details: {
        cloneNewcomerPublished: false,
        cloneNewcomerError: newcomerError.value
      }
    })
  } finally {
    newcomerBusy.value = false
  }
}

const publishAndCloneForExistingUser = async () => {
  existingError.value = ''

  if (!process.client || !window.nostr?.getPublicKey || !window.nostr?.signEvent) {
    existingError.value = 'No Nostr browser signer found. Please install a NIP-07 extension first.'
    return
  }

  try {
    existingBusy.value = true

    const candidateRelays = getCandidateRelays()
    const sourceNpub = resolveSourceNpub({
      hostname: window.location.hostname,
      fallbackNpub: debugState.value.merchantNpub
    })

    if (!sourceNpub) {
      throw new Error('Could not resolve source nsite npub for cloning.')
    }

    const source = await fetchSourceManifest({
      sourceNpub,
      relays: candidateRelays
    })

    const publishRelays = source.manifestRelays.length > 0
      ? source.manifestRelays
      : candidateRelays

    const pubkey = await window.nostr.getPublicKey()
    const cloneTemplate = buildRootCloneManifestTemplate({
      sourceManifest: source.manifest,
      sourcePubkey: source.sourcePubkey,
      relays: publishRelays
    })
    const signedClone = await window.nostr.signEvent(cloneTemplate)

    const { SimplePool } = await import('nostr-tools/pool')
    const pool = new SimplePool()
    const pubs = pool.publish(publishRelays, signedClone)
    await Promise.any(pubs)
    pool.close(publishRelays)

    const npub = nip19.npubEncode(pubkey)
    const siteUrl = `https://${npub}.nsite.lol/`
    existingSuccessUrl.value = siteUrl

    setShopDebug({
      details: {
        cloneExistingPublished: true,
        cloneExistingManifestEventId: signedClone.id,
        cloneExistingSiteUrl: siteUrl
      }
    })

    const opened = window.open(siteUrl, '_blank', 'noopener,noreferrer')
    if (!opened) {
      existingError.value = 'Clone published, but your browser blocked opening the new site tab. Use the link below.'
    }
  } catch (error) {
    existingError.value = error.message || 'Failed to clone this nsite with your existing signer.'
    console.error('[nsite-clone] existing-user clone failed', error)
    setShopDebug({
      details: {
        cloneExistingPublished: false,
        cloneExistingError: existingError.value
      }
    })
  } finally {
    existingBusy.value = false
  }
}

onMounted(() => {
  currentUrl.value = process.client ? window.location.href : ''
  console.log('[nsite-clone] current deployment URL', currentUrl.value)

  setShopDebug({
    details: {
      deploymentSource: currentUrl.value
    }
  })
})
</script>

<template>
  <button
    class="inline-flex items-center justify-center border border-violet-300 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-purple-700 text-white shadow-[0_12px_30px_rgba(168,85,247,0.45)] transition hover:scale-[1.02] hover:shadow-[0_16px_34px_rgba(168,85,247,0.6)]"
    :class="props.embedded
      ? 'h-9 gap-1.5 rounded-full px-3 py-2 text-xs font-semibold'
      : 'fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full'"
    @click="isOpen = true"
  >
    <span class="sr-only">Open Nostr clone dialog</span>
    <img :src="NOSTR_OSTRICH_ANIM_URL" alt="" :class="props.embedded ? 'h-5 w-5 object-contain' : 'h-10 w-10 object-contain'" aria-hidden="true">
    <span v-if="props.embedded">Clone This Nsite</span>
  </button>

  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4" @click.self="closeModal">
    <div class="w-full max-w-xl rounded-2xl border border-violet-300/50 bg-[var(--surface)] p-6 shadow-2xl">
      <a href="https://nostr.boutique" target="_blank" rel="noopener noreferrer" class="mb-4 block w-fit mx-auto">
        <img
          src="/Logo.png"
          alt="Nostr Boutique logo"
          class="h-14 w-auto dark:invert"
          style="filter: none;"
        >
      </a>
      <h2 class="text-2xl font-bold">Congratulations you found something cool!</h2>
      <p class="mt-3 text-sm text-[var(--muted)]">
        Did you know you can have your own sovereign shop like this?
      </p>

      <ul class="mt-3 space-y-1 text-sm text-[var(--muted)]">
        <li>- No credit card or monthly fees!</li>
        <li>- No email address or account!</li>
        <li>- As close to one-click deploy as possible (no joke).</li>
        <li>- No technical skills required, but they are always handy.</li>
      </ul>

      <p class="mt-3 text-sm text-[var(--muted)]">
        If you knew this, congratulations, you're quite the nerd 🤓. If you didn’t, there is a short write-up on how this works at
        <a href="https://nostr.boutique/explain" target="_blank" rel="noopener noreferrer" class="underline">https://nostr.boutique/explain</a>.
      </p>
      <p class="mt-2 text-sm text-[var(--muted)]">
        If you already have a key, you can clone by clicking I'm already on Nostr. If you are new, follow the I'm new here path and have your own store in under 15 seconds.
      </p>

      <div v-if="cloneMode === 'choice'" class="mt-5 grid gap-2">
        <button class="rounded-lg border border-violet-300 bg-violet-600 px-4 py-2 text-sm font-semibold text-white" @click="startNewFlow">
          I’m new here
        </button>
        <button class="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold" @click="startExistingFlow">
          I’m already on Nostr
        </button>
      </div>

      <div v-else-if="cloneMode === 'new'" class="mt-5 rounded-xl border border-violet-300/40 bg-violet-500/10 p-4">
        <label class="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Your display name</label>
        <input
          v-model="newcomerName"
          type="text"
          placeholder="Sovereign Shop Owner"
          class="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/95 px-3 py-2 text-sm text-black"
        >

        <button
          class="mt-3 rounded-lg border border-violet-300 bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
          @click="generateNewcomerKeys"
        >
          Generate my keys
        </button>

        <div v-if="newcomerIdentity" class="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p class="font-semibold">Important: We do not store these keys.</p>
          <p class="mt-1">If you lose them, you can’t access this site anymore. You can always create a new one.</p>
          <p class="mt-3 text-xs"><span class="font-semibold">npub:</span> <span class="font-mono break-all">{{ newcomerIdentity.npub }}</span></p>
          <p class="mt-1 text-xs"><span class="font-semibold">nsec:</span> <span class="font-mono break-all">{{ newcomerIdentity.nsec }}</span></p>

          <div class="mt-2 flex gap-2">
            <button class="rounded border border-amber-300 bg-white px-2 py-1 text-xs" @click="copyText(newcomerIdentity.npub)">Copy npub</button>
            <button class="rounded border border-amber-300 bg-white px-2 py-1 text-xs" @click="copyText(newcomerIdentity.nsec)">Copy nsec</button>
          </div>

          <label class="mt-3 flex items-center gap-2 text-xs">
            <input v-model="newcomerConfirmed" type="checkbox">
            <span>I saved these keys securely.</span>
          </label>

          <button
            class="mt-3 rounded-lg border border-violet-300 bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="newcomerBusy"
            @click="publishAndCloneForNewcomer"
          >
            {{ newcomerBusy ? 'Publishing and cloning...' : 'Publish profile and clone now' }}
          </button>

          <div v-if="newcomerBusy" class="mt-3 inline-flex items-center gap-2 rounded-full border border-violet-300/50 bg-violet-500/20 px-3 py-1 text-xs text-violet-100">
            <img :src="NOSTR_OSTRICH_ANIM_URL" alt="" class="h-5 w-5 object-contain" aria-hidden="true">
            <span>Deploying and running on Nostr...</span>
          </div>
        </div>
      </div>

      <div v-else-if="cloneMode === 'new-success'" class="mt-5 rounded-xl border border-emerald-300/50 bg-emerald-500/10 p-4">
        <p class="font-semibold text-emerald-200">Your sovereign shop clone is live.</p>
        <p class="mt-2 text-xs text-[var(--muted)]">New npub: <span class="font-mono break-all">{{ newcomerIdentity?.npub }}</span></p>
        <p class="mt-1 text-xs text-[var(--muted)]">Published relays: {{ newcomerPublishRelays.join(', ') }}</p>
        <a
          :href="newcomerSuccessUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-3 inline-flex rounded-lg border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Open my new Nsite
        </a>
      </div>

      <div v-else class="mt-5 rounded-xl border border-violet-300/40 bg-violet-500/10 p-4">
        <button
          class="rounded-lg border border-violet-300 bg-violet-500 px-4 py-2 text-sm font-semibold text-white"
          :disabled="existingBusy"
          @click="publishAndCloneForExistingUser"
        >
          {{ existingBusy ? 'Cloning with your signer...' : 'Clone this Nsite to my own Npub !' }}
        </button>

        <p class="mt-2 text-xs text-[var(--muted)]">
          This uses your Nostr browser signer and always publishes the clone as your root site with the template `muse` tag.
        </p>

        <a
          v-if="existingSuccessUrl"
          :href="existingSuccessUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-3 inline-flex rounded-lg border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Open my cloned Nsite
        </a>

        <p v-if="existingError" class="mt-2 text-xs text-red-500">
          {{ existingError }}
        </p>
      </div>

      <p v-if="newcomerError" class="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        {{ newcomerError }}
      </p>

      <div class="mt-5 flex justify-end gap-2">
        <button
          v-if="cloneMode !== 'choice'"
          class="rounded-lg border border-[var(--line)] px-4 py-2 text-sm"
          @click="cloneMode = 'choice'"
        >
          Back
        </button>
        <button class="rounded-lg border border-[var(--line)] px-4 py-2 text-sm" @click="closeModal">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
