<template>
  <div class="bg-neutral-800 rounded-2xl shadow-xl p-8 max-w-xl mx-auto mt-8 border border-neutral-700">
    <h2 class="text-3xl font-semibold text-white mb-6">Features pour {{ guild.name }}</h2>
    <p class="text-neutral-300 mb-8">À compléter : affichage dynamique des features du serveur.</p>
    <!-- Placeholder for actual features content -->
    <div class="space-y-4 mb-8">
      <div class="bg-neutral-750 p-4 rounded-lg shadow">
        <h3 class="text-xl text-white font-medium">Feature 1</h3>
        <p class="text-neutral-400 text-sm">Description de la feature 1.</p>
      </div>
      <div class="bg-neutral-750 p-4 rounded-lg shadow">
        <h3 class="text-xl text-white font-medium">Feature 2</h3>
        <p class="text-neutral-400 text-sm">Description de la feature 2.</p>
      </div>
    </div>
    <button
      @click="$emit('close')"
      class="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow transition-colors duration-150"
    >Fermer</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ guild: any }>()
const emit = defineEmits(['close'])
</script>

<style>
/* If using a very specific shade like neutral-750, ensure it's defined in your tailwind.config.js if not standard */
/* For example:
  theme: {
    extend: {
      colors: {
        'neutral-750': '#303030', // Adjust hex code as needed
      }
    }
  }
*/
</style>