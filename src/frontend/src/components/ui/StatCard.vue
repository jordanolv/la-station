<template>
  <div class="bg-neutral-800 p-6 rounded-xl shadow-lg h-full flex flex-col">
    <h3 class="text-lg font-semibold text-neutral-300 mb-1">{{ title }}</h3>
    <div class="mt-auto">
      <p v-if="value !== undefined && value !== null" class="text-3xl font-bold text-white">{{ value }}</p>
      <p v-if="description" class="text-sm text-neutral-400 mt-1">{{ description }}</p>
      <slot></slot> <!-- For more complex content -->
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  value?: string | number;
  description?: string;
}>();
</script>

<style scoped>
/* Add any specific styles for StatCard if needed */
</style> 