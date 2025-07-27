<template>
  <div class="w-full flex flex-wrap gap-8 justify-center">
    <GuildCard
      v-for="guild in guilds"
      :key="guild.id"
      :guild="guild"
      :isBotOnGuild="botGuilds.includes(guild.id)"
      :inviteLink="!botGuilds.includes(guild.id) ? getInviteLink(guild.id) : ''"
      @access="onAccess(guild)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import GuildCard from './GuildCard.vue'
import { useAuthStore } from '../../stores/auth'
import axios from 'axios'

const emit = defineEmits(['access'])
const authStore = useAuthStore()
const guilds = computed(() => authStore.guilds)
const botGuilds = ref<string[]>([])
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051';

const getInviteLink = (guildId: string) => {
  const clientId = (import.meta as any).env.VITE_DISCORD_CLIENT_ID || ''
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot&permissions=8&guild_id=${guildId}`
}

const onAccess = (guild: any) => {
  emit('access', guild)
}

onMounted(async () => {
  const res = await axios.get(`${API_BASE_URL}/api/auth/bot-guilds`)
  botGuilds.value = res.data.map((g: any) => g.id)
})
</script>

<!-- Scoped styles removed as Tailwind is used --> 