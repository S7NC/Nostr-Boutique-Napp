const SATS_PER_BTC = 100000000

const normalizeCurrency = (currency) => {
  return String(currency || '').trim().toUpperCase()
}

export const useFiatToSats = () => {
  const rates = ref({})
  const loading = ref(false)
  const error = ref('')

  const setRate = (currency, satsPerUnit) => {
    rates.value = {
      ...rates.value,
      [normalizeCurrency(currency)]: satsPerUnit
    }
  }

  const convert = (amount, currency) => {
    const normalized = normalizeCurrency(currency)
    const numericAmount = Number(amount || 0)

    if (!Number.isFinite(numericAmount)) return null
    if (normalized === 'SAT' || normalized === 'SATS') return numericAmount
    if (normalized === 'BTC') return numericAmount * SATS_PER_BTC

    const rate = rates.value[normalized]
    if (!rate) return null

    return numericAmount * rate
  }

  const fetchRates = async (currencies) => {
    const fiatCurrencies = Array.from(new Set(
      currencies
        .map(normalizeCurrency)
        .filter((currency) => currency && currency !== 'SAT' && currency !== 'SATS' && currency !== 'BTC')
    ))

    if (fiatCurrencies.length === 0) {
      error.value = ''
      return
    }

    loading.value = true
    error.value = ''

    try {
      const vs = fiatCurrencies.map((currency) => currency.toLowerCase()).join(',')
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${encodeURIComponent(vs)}`
      const response = await fetch(url, { cache: 'no-store' })

      if (!response.ok) {
        throw new Error(`Failed to fetch fiat rates (${response.status})`)
      }

      const data = await response.json()
      const btcPrices = data?.bitcoin || {}

      for (const currency of fiatCurrencies) {
        const fiatPerBtc = Number(btcPrices[currency.toLowerCase()])
        if (!Number.isFinite(fiatPerBtc) || fiatPerBtc <= 0) continue
        const satsPerUnit = SATS_PER_BTC / fiatPerBtc
        setRate(currency, satsPerUnit)
      }

      const missing = fiatCurrencies.filter((currency) => !rates.value[currency])
      if (missing.length > 0) {
        error.value = `Could not resolve BTC conversion rate for: ${missing.join(', ')}`
      }
    } catch (cause) {
      error.value = cause.message || 'Unable to convert fiat prices to sats right now.'
    } finally {
      loading.value = false
    }
  }

  return {
    rates,
    loading,
    error,
    convert,
    fetchRates
  }
}
