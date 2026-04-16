import { useShopIdentity } from '~/composables/useShopIdentity'
import { useRelayLists } from '~/composables/useRelayLists'
import { useMarketplace } from '~/composables/useMarketplace'
import { useMerchantProfile } from '~/composables/useMerchantProfile'
import {
  useMerchantTheme,
  applyMerchantThemeToDocument,
  clearMerchantThemeFromDocument
} from '~/composables/useMerchantTheme'

let bootstrapPromise = null
const PRODUCT_RETRY_ATTEMPTS = 3
const PRODUCT_RETRY_DELAY_MS = 1500

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const useShopBootstrap = () => {
  const { resolveIdentity } = useShopIdentity()
  const { resolveRelayMap } = useRelayLists()
  const { fetchProducts } = useMarketplace()
  const { fetchMerchantProfile } = useMerchantProfile()
  const { fetchMerchantTheme } = useMerchantTheme()

  const state = useState('shop-bootstrap-state', () => ({
    isBootstrapping: false,
    isBootstrapped: false,
    error: '',
    statusText: 'Connecting to relays...',
    identity: null,
    relayMap: null,
    merchantProfile: null,
    products: [],
    merchantTheme: null,
    merchantThemeSource: 'none',
    merchantThemeMode: ''
  }))

  const ensureBootstrap = async ({ force = false } = {}) => {
    if (state.value.isBootstrapped && !force) {
      return state.value
    }

    if (bootstrapPromise) {
      return bootstrapPromise
    }

    state.value = {
      ...state.value,
      isBootstrapping: true,
      error: '',
      statusText: 'Connecting to relays...'
    }

    bootstrapPromise = (async () => {
      try {
        const identity = await resolveIdentity()
        state.value = {
          ...state.value,
          statusText: 'Fetching merchant relays...'
        }
        const relayMap = await resolveRelayMap({
          merchantPubkey: identity.merchantPubkey,
          discoveryRelays: identity.discoveryRelays
        })

        state.value = {
          ...state.value,
          statusText: 'Loading shop inventory...'
        }

        const loadProductsWithRetry = async () => {
          let latestProducts = []

          for (let attempt = 1; attempt <= PRODUCT_RETRY_ATTEMPTS; attempt += 1) {
            latestProducts = await fetchProducts({
              merchantPubkey: identity.merchantPubkey,
              relays: relayMap.merchantOutbox
            })

            if (latestProducts.length > 0 || attempt === PRODUCT_RETRY_ATTEMPTS) {
              return latestProducts
            }

            state.value = {
              ...state.value,
              statusText: 'Retrying, hold on.'
            }
            await wait(PRODUCT_RETRY_DELAY_MS)
          }

          return latestProducts
        }

        const [merchantProfile, products, merchantThemeResult] = await Promise.all([
          fetchMerchantProfile({
            merchantPubkey: identity.merchantPubkey,
            relays: relayMap.merchantOutbox
          }).catch(() => null),
          loadProductsWithRetry(),
          fetchMerchantTheme({
            merchantPubkey: identity.merchantPubkey,
            relays: relayMap.merchantOutbox
          }).catch(() => ({ colors: null, source: 'none' }))
        ])

        const merchantTheme = merchantThemeResult?.colors || null
        const merchantThemeSource = merchantThemeResult?.source || 'none'
        const merchantThemeMode = merchantTheme
          ? (applyMerchantThemeToDocument(merchantTheme) || '')
          : ''

        if (!merchantTheme) {
          clearMerchantThemeFromDocument()
        }

        state.value = {
          ...state.value,
          isBootstrapping: false,
          isBootstrapped: true,
          error: '',
          statusText: '',
          identity,
          relayMap,
          merchantProfile,
          products,
          merchantTheme,
          merchantThemeSource,
          merchantThemeMode
        }

        return state.value
      } catch (cause) {
        state.value = {
          ...state.value,
          isBootstrapping: false,
          isBootstrapped: false,
          error: cause.message || 'Failed to load shop data.',
          statusText: ''
        }
        throw cause
      } finally {
        bootstrapPromise = null
      }
    })()

    return bootstrapPromise
  }

  return {
    bootstrapState: state,
    ensureBootstrap
  }
}
