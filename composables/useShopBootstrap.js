import { useShopIdentity } from '~/composables/useShopIdentity'
import { useRelayLists } from '~/composables/useRelayLists'
import { useMarketplace } from '~/composables/useMarketplace'
import { useMerchantProfile } from '~/composables/useMerchantProfile'

let bootstrapPromise = null

export const useShopBootstrap = () => {
  const { resolveIdentity } = useShopIdentity()
  const { resolveRelayMap } = useRelayLists()
  const { fetchProducts } = useMarketplace()
  const { fetchMerchantProfile } = useMerchantProfile()

  const state = useState('shop-bootstrap-state', () => ({
    isBootstrapping: false,
    isBootstrapped: false,
    error: '',
    identity: null,
    relayMap: null,
    merchantProfile: null,
    products: []
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
      error: ''
    }

    bootstrapPromise = (async () => {
      try {
        const identity = await resolveIdentity()
        const relayMap = await resolveRelayMap({
          merchantPubkey: identity.merchantPubkey,
          discoveryRelays: identity.discoveryRelays
        })

        const [merchantProfile, products] = await Promise.all([
          fetchMerchantProfile({
            merchantPubkey: identity.merchantPubkey,
            relays: relayMap.merchantOutbox
          }).catch(() => null),
          fetchProducts({
            merchantPubkey: identity.merchantPubkey,
            relays: relayMap.merchantOutbox
          })
        ])

        state.value = {
          ...state.value,
          isBootstrapping: false,
          isBootstrapped: true,
          error: '',
          identity,
          relayMap,
          merchantProfile,
          products
        }

        return state.value
      } catch (cause) {
        state.value = {
          ...state.value,
          isBootstrapping: false,
          isBootstrapped: false,
          error: cause.message || 'Failed to load shop data.'
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
