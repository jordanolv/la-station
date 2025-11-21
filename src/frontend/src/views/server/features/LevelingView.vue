<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight mb-1">Leveling System</h1>
        <p class="text-muted text-sm">Manage experience rates, notifications, and view the leaderboard.</p>
      </div>
      <div class="flex items-center gap-3">
        <span
          v-if="settings"
          class="text-xs font-medium px-2 py-1 rounded"
          :class="settings.enabled ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' : 'text-muted bg-surface-hover border border-border'"
        >
          {{ settings.enabled ? 'System Active' : 'System Inactive' }}
        </span>
        <button
          @click="toggleSystem"
          :disabled="isSaving"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
          :class="settings?.enabled ? 'bg-emerald-500 focus:ring-emerald-500' : 'bg-surface-hover border border-border focus:ring-white/20'"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full transition-transform"
            :class="settings?.enabled ? 'translate-x-6 bg-white' : 'translate-x-1 bg-muted'"
          />
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-2 border-border border-t-white rounded-full animate-spin"></div>
    </div>

    <!-- Content -->
    <template v-else-if="settings && stats">
      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Total XP Awarded</div>
          <div class="text-2xl font-bold text-white">{{ formatNumber(stats.totalXp) }}</div>
          <div class="text-xs text-muted mt-1">Across {{ stats.totalMembers }} members</div>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Active Members</div>
          <div class="text-2xl font-bold text-white">{{ stats.activeMembers }}</div>
          <div class="text-xs text-muted mt-1">Have earned XP</div>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Estimated Level Ups</div>
          <div class="text-2xl font-bold text-white">{{ stats.levelUpsToday }}</div>
          <div class="text-xs text-muted mt-1">Recent activity</div>
        </div>
      </div>

      <!-- Configuration Sections -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- XP Settings -->
        <div class="bg-surface border border-border rounded-xl overflow-hidden">
          <div class="px-6 py-4 border-b border-border flex justify-between items-center">
            <h2 class="font-semibold text-white">XP Configuration</h2>
          </div>
          <div class="p-6 space-y-6">
            <!-- XP Rate -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <label class="text-sm font-medium text-gray-300">XP Multiplier</label>
                <span class="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">{{ settings.taux }}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                v-model.number="settings.taux"
                @change="saveSettings"
                class="w-full h-2 bg-surface-hover rounded-full appearance-none cursor-pointer accent-emerald-500"
              />
              <p class="text-xs text-muted mt-2">Base XP: 10-20 per message. Final: {{ Math.floor(10 * settings.taux) }}-{{ Math.floor(20 * settings.taux) }} XP</p>
            </div>

            <!-- Info -->
            <div class="bg-surface-hover border border-border rounded-md p-3">
              <p class="text-xs text-muted">
                <strong class="text-white">Info:</strong> Users earn XP by sending messages. Higher multiplier = faster progression.
              </p>
            </div>
          </div>
        </div>

        <!-- Announcement Settings -->
        <div class="bg-surface border border-border rounded-xl overflow-hidden">
          <div class="px-6 py-4 border-b border-border">
            <h2 class="font-semibold text-white">Level Up Notifications</h2>
          </div>
          <div class="p-6 space-y-4">
            <!-- Enable Notifications -->
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-300">Enable Notifications</label>
              <button
                @click="toggleNotifications"
                :disabled="isSaving"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                :class="settings.notifLevelUp ? 'bg-emerald-500' : 'bg-surface-hover border border-border'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full transition-transform"
                  :class="settings.notifLevelUp ? 'translate-x-6 bg-white' : 'translate-x-1 bg-muted'"
                />
              </button>
            </div>

            <!-- Channel Select -->
            <div v-if="settings.notifLevelUp">
              <label class="block text-sm font-medium text-gray-300 mb-2">Notification Channel</label>
              <ChannelSelect
                :guild-id="guildId"
                v-model="settings.channelNotif"
                @update:modelValue="saveSettings"
                placeholder="Current Channel (Contextual)"
                :allow-null="true"
              />
              <p class="text-xs text-muted mt-2">Leave empty to send notifications in the same channel where users level up</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Leaderboard -->
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-border">
          <h2 class="font-semibold text-white">Top Members</h2>
        </div>

        <!-- Leaderboard Table -->
        <div class="overflow-x-auto" v-if="leaderboard.length > 0">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-border text-muted">
                <th class="px-6 py-3 font-medium">Rank</th>
                <th class="px-6 py-3 font-medium">Member</th>
                <th class="px-6 py-3 font-medium">Level</th>
                <th class="px-6 py-3 font-medium">Experience</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="(member, index) in leaderboard"
                :key="member.discordId"
                class="group hover:bg-surface-hover/50 transition-colors"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <span
                      v-if="index < 3"
                      class="text-lg"
                    >
                      {{ index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉' }}
                    </span>
                    <span class="text-muted font-mono">#{{ index + 1 }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="font-medium text-white">{{ member.name }}</div>
                  <div class="text-xs text-muted font-mono">{{ member.discordId }}</div>
                </td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Level {{ member.level }}
                  </span>
                </td>
                <td class="px-6 py-4 font-mono text-emerald-400">
                  {{ formatNumber(member.exp) }} XP
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-else class="p-12 text-center">
          <div class="text-4xl mb-2">📊</div>
          <p class="text-muted">No members have earned XP yet</p>
        </div>
      </div>
    </template>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
      <p class="text-red-400">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../../utils/axios'
import ChannelSelect from '../../../components/ui/ChannelSelect.vue'

const route = useRoute()
const guildId = route.params.id as string

const isLoading = ref(true)
const isSaving = ref(false)
const error = ref<string | null>(null)

const settings = ref<{
  enabled: boolean
  taux: number
  notifLevelUp: boolean
  channelNotif: string | null
} | null>(null)

const stats = ref<{
  totalXp: number
  activeMembers: number
  levelUpsToday: number
  totalMembers: number
} | null>(null)

const leaderboard = ref<Array<{
  discordId: string
  name: string
  level: number
  exp: number
}>>([])

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num)
}

const loadData = async () => {
  try {
    isLoading.value = true
    error.value = null

    // Charger les settings et stats en parallèle
    const [settingsRes, statsRes] = await Promise.all([
      api.get(`/api/guilds/${guildId}/features/leveling/settings`),
      api.get(`/api/guilds/${guildId}/features/leveling/stats`)
    ])

    settings.value = settingsRes.data.settings
    stats.value = statsRes.data.stats
    leaderboard.value = statsRes.data.leaderboard || []
  } catch (err: any) {
    console.error('Error loading leveling data:', err)
    error.value = err.response?.data?.error || 'Failed to load leveling data'
  } finally {
    isLoading.value = false
  }
}

const saveSettings = async () => {
  if (!settings.value) return

  try {
    isSaving.value = true
    await api.put(`/api/guilds/${guildId}/features/leveling/settings`, settings.value)
  } catch (err: any) {
    console.error('Error saving settings:', err)
    error.value = err.response?.data?.error || 'Failed to save settings'
  } finally {
    isSaving.value = false
  }
}

const toggleSystem = async () => {
  if (!settings.value) return

  settings.value.enabled = !settings.value.enabled
  await saveSettings()
}

const toggleNotifications = async () => {
  if (!settings.value) return

  settings.value.notifLevelUp = !settings.value.notifLevelUp
  await saveSettings()
}

onMounted(() => {
  loadData()
})
</script>
