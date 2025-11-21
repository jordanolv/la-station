<template>
  <div class="bg-surface border border-border p-6 rounded-xl shadow-sm hover:border-border-hover transition-colors h-full flex flex-col">
    <h3 class="text-sm font-medium text-muted uppercase tracking-wider mb-2">{{ title }}</h3>
    <div class="mt-auto">
      <p v-if="value !== undefined && value !== null" class="text-3xl font-bold text-white tracking-tight">{{ value }}</p>
      <p v-if="description" class="text-sm text-muted mt-1">{{ description }}</p>
      <slot></slot>
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