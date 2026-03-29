<script setup>
const props = defineProps({
  product: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['add'])

const productPath = computed(() => {
  return `/product/${encodeURIComponent(props.product.d)}`
})

const outOfStock = computed(() => {
  return props.product.stock !== null && props.product.stock <= 0
})
</script>

<template>
  <article class="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
    <NuxtLink :to="productPath" class="aspect-[4/3] overflow-hidden bg-stone-100">
      <img
        v-if="product.image"
        :src="product.image"
        :alt="product.title"
        class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
      >
      <div v-else class="flex h-full items-center justify-center text-sm text-[var(--muted)]">
        No image
      </div>
    </NuxtLink>

    <div class="flex flex-1 flex-col gap-3 p-4">
      <div>
        <NuxtLink :to="productPath" class="line-clamp-2 text-lg font-semibold leading-tight">
          {{ product.title }}
        </NuxtLink>
        <p class="mt-1 text-sm text-[var(--muted)] line-clamp-2">
          {{ product.summary || 'No summary provided.' }}
        </p>
      </div>

      <div class="mt-auto flex items-center justify-between gap-2">
        <p class="text-base font-semibold">{{ product.price.display }}</p>
        <button
          class="rounded-lg px-3 py-2 text-sm font-semibold text-white transition"
          :class="outOfStock ? 'cursor-not-allowed bg-stone-400' : 'bg-[var(--brand)] hover:bg-[var(--brand-strong)]'"
          :disabled="outOfStock"
          @click="emit('add', product)"
        >
          {{ outOfStock ? 'Out of stock' : 'Add to cart' }}
        </button>
      </div>
    </div>
  </article>
</template>
