<template>
  <MainLayout v-if="!isStandalonePage">
    <router-view />
  </MainLayout>
  <router-view v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from './layouts/MainLayout.vue'

const route = useRoute()

// Pages that should not use MainLayout
const standalonePages = ['leaderboard']

const isStandalonePage = computed(() => {
  return standalonePages.includes(route.name as string)
})
</script>

<style>
/* Global resets or overrides if needed, but mostly handled by Tailwind and base.css */
</style>

