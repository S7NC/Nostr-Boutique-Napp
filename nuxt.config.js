import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  title: "Nostr Boutique",

  compatibilityDate: "2025-12-01",

  vite: {
    vue: {
      customElement: true
    },
    plugins: [
      tailwindcss()
    ]
  },

  app: {
    head: {
      title: "Nostr Boutique"
    }
  },

  devtools: { enabled: true },

  css: ['~/assets/tailwind.css'],

  modules: [
    "@pinia/nuxt"
  ]
})
