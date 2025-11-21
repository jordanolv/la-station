<template>
  <div class="space-y-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-muted">Loading voice settings...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
      <p class="text-red-500">{{ error }}</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight mb-1">Voice Systems</h1>
          <p class="text-muted text-sm">Configure dynamic voice channels and activity tracking.</p>
        </div>
        <div class="flex items-center gap-3">
          <span
            :class="[
              'text-xs font-medium px-2 py-1 rounded',
              settings.enabled
                ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20'
                : 'text-gray-500 bg-gray-500/10 border border-gray-500/20'
            ]"
          >
            {{ settings.enabled ? 'System Active' : 'System Inactive' }}
          </span>
          <button
            @click="toggleSystem"
            :class="[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
              settings.enabled ? 'bg-emerald-500 focus:ring-emerald-500' : 'bg-gray-600 focus:ring-gray-500'
            ]"
          >
            <span
              :class="[
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              ]"
            />
          </button>
        </div>
      </div>

      <!-- Active Sessions Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Active Voice Users</div>
          <div class="text-2xl font-bold text-white">{{ stats.currentActiveUsers || 0 }}</div>
          <div class="text-xs text-muted mt-1">{{ stats.activeVoiceUsers || 0 }} total tracked users</div>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Total Voice Time</div>
          <div class="text-2xl font-bold text-white">{{ stats.totalVoiceTime || 0 }}h</div>
          <div class="text-xs text-emerald-500 mt-1">+{{ stats.voiceTimeToday || 0 }}h today</div>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Active Channels</div>
          <div class="text-2xl font-bold text-white">{{ stats.activeChannels || 0 }}</div>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="text-muted text-xs font-medium uppercase tracking-wider mb-1">Peak Activity</div>
          <div class="text-2xl font-bold text-white">{{ stats.peakActivity || 'N/A' }}</div>
        </div>
      </div>

      <!-- Generator Settings -->
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 class="font-semibold text-white">Dynamic Voice Generator</h2>
          <button
            @click="showAddGenerator = true"
            class="text-sm text-white bg-surface-hover hover:bg-surface border border-border px-3 py-1.5 rounded-md transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" x2="12" y1="5" y2="19"/>
              <line x1="5" x2="19" y1="12" y2="12"/>
            </svg>
            Create Generator
          </button>
        </div>

        <div class="p-6">
          <!-- Empty State -->
          <div v-if="settings.joinChannels.length === 0" class="text-center py-8 text-muted">
            <p>No voice generators configured yet.</p>
            <p class="text-sm mt-1">Click "Create Generator" to add one.</p>
          </div>

          <!-- Join Channels List -->
          <div v-else class="space-y-4">
            <div
              v-for="(joinChannel, index) in settings.joinChannels"
              :key="index"
              class="border border-border rounded-lg overflow-hidden"
            >
              <div class="bg-surface-hover/50 px-4 py-3 border-b border-border flex items-center gap-3">
                <div class="p-1.5 bg-emerald-500/10 text-emerald-500 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 6v12"/>
                    <path d="M6 12h12"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-sm font-medium text-white">Join to Create #{{ index + 1 }}</h3>
                  <p class="text-xs text-muted">Channel ID: {{ joinChannel.channelId }}</p>
                </div>
                <div class="ml-auto flex items-center gap-2">
                  <button
                    @click="removeGenerator(index)"
                    class="p-2 text-red-500 hover:text-red-400 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="p-4 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-muted mb-1.5">Channel Name Template</label>
                    <input
                      v-model="joinChannel.nameTemplate"
                      type="text"
                      class="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                      placeholder="{user}'s Channel"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-muted mb-1.5">Category ID</label>
                    <input
                      v-model="joinChannel.category"
                      type="text"
                      class="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                      placeholder="Category ID"
                    />
                  </div>
                </div>
                <div class="flex justify-end">
                  <button
                    @click="saveSettings"
                    class="text-sm bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Generator Modal -->
      <div
        v-if="showAddGenerator"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showAddGenerator = false"
      >
        <div class="bg-surface border border-border rounded-xl p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold text-white mb-4">Create Voice Generator</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-muted mb-1.5">Voice Channel ID</label>
              <input
                v-model="newGenerator.channelId"
                type="text"
                class="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                placeholder="Enter channel ID"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-muted mb-1.5">Category ID</label>
              <input
                v-model="newGenerator.category"
                type="text"
                class="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                placeholder="Enter category ID"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-muted mb-1.5">Name Template</label>
              <input
                v-model="newGenerator.nameTemplate"
                type="text"
                class="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                placeholder="{user}'s Channel"
              />
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <button
              @click="showAddGenerator = false"
              class="text-sm text-muted hover:text-white px-4 py-2 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              @click="addGenerator"
              class="text-sm bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-md transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../../utils/axios'

const route = useRoute()
const guildId = route.params.id as string

interface JoinChannel {
  channelId: string
  category: string
  nameTemplate: string
}

interface VoiceSettings {
  enabled: boolean
  joinChannels: JoinChannel[]
  createdChannels: string[]
  channelCount: number
}

interface VoiceStats {
  currentActiveUsers: number
  totalVoiceTime: number
  voiceTimeToday: number
  activeChannels: number
  peakActivity: string
  totalMembers: number
  activeVoiceUsers: number
}

const loading = ref(true)
const error = ref<string | null>(null)
const settings = ref<VoiceSettings>({
  enabled: false,
  joinChannels: [],
  createdChannels: [],
  channelCount: 0
})
const stats = ref<VoiceStats>({
  currentActiveUsers: 0,
  totalVoiceTime: 0,
  voiceTimeToday: 0,
  activeChannels: 0,
  peakActivity: 'N/A',
  totalMembers: 0,
  activeVoiceUsers: 0
})

const showAddGenerator = ref(false)
const newGenerator = ref<JoinChannel>({
  channelId: '',
  category: '',
  nameTemplate: "{user}'s Channel"
})

const loadData = async () => {
  loading.value = true
  error.value = null

  try {
    const [settingsRes, statsRes] = await Promise.all([
      api.get(`/api/guilds/${guildId}/features/voice-channels/settings`),
      api.get(`/api/guilds/${guildId}/features/voice-channels/stats`)
    ])

    settings.value = settingsRes.data.settings
    stats.value = statsRes.data.stats
  } catch (err: any) {
    console.error('Error loading voice data:', err)
    error.value = err.response?.data?.error || 'Failed to load voice settings'
  } finally {
    loading.value = false
  }
}

const toggleSystem = async () => {
  try {
    settings.value.enabled = !settings.value.enabled
    await api.put(`/api/guilds/${guildId}/features/voice-channels/settings`, {
      enabled: settings.value.enabled
    })
  } catch (err: any) {
    console.error('Error toggling system:', err)
    // Revert on error
    settings.value.enabled = !settings.value.enabled
    error.value = 'Failed to toggle system'
  }
}

const saveSettings = async () => {
  try {
    await api.put(`/api/guilds/${guildId}/features/voice-channels/settings`, {
      joinChannels: settings.value.joinChannels
    })
  } catch (err: any) {
    console.error('Error saving settings:', err)
    error.value = 'Failed to save settings'
  }
}

const addGenerator = async () => {
  if (!newGenerator.value.channelId || !newGenerator.value.category) {
    return
  }

  settings.value.joinChannels.push({ ...newGenerator.value })
  await saveSettings()

  // Reset form
  newGenerator.value = {
    channelId: '',
    category: '',
    nameTemplate: "{user}'s Channel"
  }
  showAddGenerator.value = false
}

const removeGenerator = async (index: number) => {
  settings.value.joinChannels.splice(index, 1)
  await saveSettings()
}

onMounted(() => {
  loadData()
})
</script>
