<template>
  <div class="bg-neutral-800 rounded-2xl shadow-xl p-6 flex flex-col items-center w-64 border border-neutral-700 hover:scale-105 transition-transform duration-200">
    <img :src="guildIcon" class="w-20 h-20 rounded-full mb-4 border-4 border-indigo-500 shadow-lg" />
    <div class="text-center">
      <h3 class="text-xl font-bold text-white mb-2">{{ guild.name }}</h3>
      <button
        v-if="isBotOnGuild"
        @click="$emit('access', guild)"
        class="w-full py-2 mt-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow transition-colors duration-150"
      >Accéder</button>
      <a
        v-else-if="inviteLink"
        :href="inviteLink"
        target="_blank"
        class="block w-full"
      >
        <button
          class="w-full py-2 mt-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow transition-colors duration-150"
        >Inviter sur le serveur</button>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  guild: any,
  isBotOnGuild: boolean,
  inviteLink: string
}>()
const emit = defineEmits(['access'])

const guildIcon = computed(() => {
  return props.guild.icon
    ? `https://cdn.discordapp.com/icons/${props.guild.id}/${props.guild.icon}.png`
    : 'https://cdn.discordapp.com/embed/avatars/0.png'
})
</script>

<!-- Scoped styles removed as Tailwind is used --> 