const STORAGE_KEY = 'gamma-market-theme'

const normalizeTheme = (value) => {
  return value === 'light' ? 'light' : 'dark'
}

export const useTheme = () => {
  const theme = useState('theme-mode', () => 'dark')

  const applyTheme = (nextTheme) => {
    const normalized = normalizeTheme(nextTheme)
    theme.value = normalized

    if (!process.client) return

    document.documentElement.setAttribute('data-theme', normalized)
    localStorage.setItem(STORAGE_KEY, normalized)
  }

  const initializeTheme = () => {
    if (!process.client) return

    const stored = localStorage.getItem(STORAGE_KEY)
    applyTheme(stored || 'dark')
  }

  const toggleTheme = () => {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme,
    initializeTheme,
    applyTheme,
    toggleTheme
  }
}
