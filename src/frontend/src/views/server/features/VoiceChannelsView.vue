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

      <!-- Mountains Management -->
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-border flex justify-between items-center">
          <div>
            <h2 class="font-semibold text-white">Mountains System</h2>
            <p class="text-xs text-muted mt-0.5">Manage unlockable mountains for voice activity</p>
          </div>
          <button
            @click="showMountainModal = true; editingMountain = null"
            class="text-sm text-white bg-surface-hover hover:bg-surface border border-border px-3 py-1.5 rounded-md transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" x2="12" y1="5" y2="19"/>
              <line x1="5" x2="19" y1="12" y2="12"/>
            </svg>
            Add Mountain
          </button>
        </div>

        <div class="p-6">
          <!-- Notification Channel Configuration -->
          <div class="mb-6 bg-surface-hover border border-border rounded-lg p-4">
            <label class="block text-sm font-medium text-white mb-2">
              Notification Channel
            </label>
            <p class="text-xs text-muted mb-3">
              Select a text channel where mountain unlock notifications will be sent
            </p>
            <div class="flex items-center gap-3">
              <select
                v-model="selectedNotificationChannel"
                @change="updateNotificationChannel"
                class="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
              >
                <option :value="null">No notifications</option>
                <option
                  v-for="channel in textChannels"
                  :key="channel.id"
                  :value="channel.id"
                >
                  # {{ channel.name }}
                </option>
              </select>
              <div v-if="updatingNotificationChannel" class="text-muted text-xs">
                Saving...
              </div>
            </div>
          </div>
          <!-- Loading mountains -->
          <div v-if="loadingMountains" class="flex items-center justify-center py-12">
            <div class="text-muted">Loading mountains...</div>
          </div>

          <!-- Empty State -->
          <div v-else-if="mountains.length === 0" class="text-center py-8 text-muted">
            <p>No mountains configured yet.</p>
            <p class="text-sm mt-1">Click "Add Mountain" to create one.</p>
          </div>

          <!-- Mountains grid -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="mountain in mountains"
              :key="mountain.id"
              class="border border-border rounded-lg overflow-hidden hover:border-accent/50 transition-colors"
            >
              <div v-if="mountain.image" class="relative w-full h-32 bg-surface-hover flex items-center justify-center">
                <img
                  :src="mountain.image"
                  :alt="mountain.name"
                  class="absolute inset-0 w-full h-32 object-cover"
                  @error="(e) => (e.target as HTMLImageElement).style.opacity = '0'"
                />
                <span class="text-muted text-xs pointer-events-none">⛰️</span>
              </div>
              <div class="p-4">
                <h4 class="text-white font-medium mb-1">{{ mountain.name }}</h4>
                <p class="text-muted text-sm mb-2 line-clamp-2">{{ mountain.description }}</p>
                <p class="text-accent text-xs mb-3">{{ mountain.altitude }}</p>
                <div class="flex items-center justify-between">
                  <a
                    :href="mountain.wiki"
                    target="_blank"
                    class="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                  >
                    <span>Wikipedia</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" x2="21" y1="14" y2="3"/>
                    </svg>
                  </a>
                  <div class="flex gap-2">
                    <button
                      @click="editMountain(mountain)"
                      class="p-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        <path d="m15 5 4 4"/>
                      </svg>
                    </button>
                    <button
                      @click="confirmDeleteMountain(mountain)"
                      class="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
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

      <!-- Mountain Modal -->
      <div v-if="showMountainModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="closeMountainModal">
        <div class="bg-surface border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white">
                {{ editingMountain ? 'Edit Mountain' : 'Add Mountain' }}
              </h3>
              <button @click="closeMountainModal" class="text-muted hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" x2="6" y1="6" y2="18"/>
                  <line x1="6" x2="18" y1="6" y2="18"/>
                </svg>
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">ID *</label>
                <input
                  v-model="mountainForm.id"
                  :disabled="!!editingMountain"
                  type="text"
                  placeholder="e.g., mont-blanc"
                  class="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                >
              </div>

              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Name *</label>
                <input
                  v-model="mountainForm.name"
                  type="text"
                  placeholder="e.g., Mont Blanc"
                  class="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                >
              </div>

              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Description *</label>
                <textarea
                  v-model="mountainForm.description"
                  rows="3"
                  placeholder="Mountain description..."
                  class="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                ></textarea>
              </div>

              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Altitude *</label>
                <input
                  v-model="mountainForm.altitude"
                  type="text"
                  placeholder="e.g., 4,808 m"
                  class="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                >
              </div>

              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Image URL *</label>
                <input
                  v-model="mountainForm.image"
                  type="url"
                  placeholder="https://..."
                  class="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                >
              </div>

              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Wikipedia Link *</label>
                <input
                  v-model="mountainForm.wiki"
                  type="url"
                  placeholder="https://en.wikipedia.org/wiki/..."
                  class="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                >
              </div>

              <!-- Image preview -->
              <div v-if="mountainForm.image" class="mt-4">
                <label class="block text-xs font-medium text-muted mb-2">Preview</label>
                <img
                  :src="mountainForm.image"
                  alt="Preview"
                  class="w-full h-48 object-cover rounded-md border border-border"
                  @error="() => {}"
                >
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button
                @click="closeMountainModal"
                class="text-sm px-4 py-2 bg-surface-hover hover:bg-surface border border-border text-white rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                @click="saveMountain"
                :disabled="savingMountain || !isMountainFormValid"
                class="text-sm px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
              >
                {{ savingMountain ? 'Saving...' : (editingMountain ? 'Update' : 'Add') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-surface border border-border rounded-xl max-w-md w-full p-6">
          <h3 class="text-lg font-semibold text-white mb-4">Confirm Deletion</h3>
          <p class="text-muted mb-6">
            Are you sure you want to delete the mountain <strong class="text-white">{{ mountainToDelete?.name }}</strong>?
          </p>
          <div class="flex justify-end gap-3">
            <button
              @click="showDeleteConfirm = false; mountainToDelete = null"
              class="text-sm px-4 py-2 bg-surface-hover hover:bg-surface border border-border text-white rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              @click="deleteMountain"
              class="text-sm px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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

interface Mountain {
  id: string
  name: string
  description: string
  altitude: string
  image: string
  wiki: string
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

// Mountains state
const mountains = ref<Mountain[]>([])
const loadingMountains = ref(false)
const showMountainModal = ref(false)
const editingMountain = ref<Mountain | null>(null)
const savingMountain = ref(false)
const showDeleteConfirm = ref(false)
const mountainToDelete = ref<Mountain | null>(null)

// Notification channel state
const selectedNotificationChannel = ref<string | null>(null)
const updatingNotificationChannel = ref(false)
const textChannels = ref<{ id: string; name: string }[]>([])

const mountainForm = ref<Mountain>({
  id: '',
  name: '',
  description: '',
  altitude: '',
  image: '',
  wiki: ''
})

const isMountainFormValid = computed(() => {
  return mountainForm.value.id.trim() !== '' &&
    mountainForm.value.name.trim() !== '' &&
    mountainForm.value.description.trim() !== '' &&
    mountainForm.value.altitude.trim() !== '' &&
    mountainForm.value.image.trim() !== '' &&
    mountainForm.value.wiki.trim() !== ''
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

// Mountains methods
const loadMountains = async () => {
  try {
    loadingMountains.value = true
    const response = await api.get('/api/voc-manager/mountains')
    mountains.value = response.data.mountains || []
  } catch (err: any) {
    console.error('Error loading mountains:', err)
  } finally {
    loadingMountains.value = false
  }
}

const editMountain = (mountain: Mountain) => {
  editingMountain.value = mountain
  mountainForm.value = { ...mountain }
  showMountainModal.value = true
}

const closeMountainModal = () => {
  showMountainModal.value = false
  editingMountain.value = null
  mountainForm.value = {
    id: '',
    name: '',
    description: '',
    altitude: '',
    image: '',
    wiki: ''
  }
}

const saveMountain = async () => {
  try {
    savingMountain.value = true

    if (editingMountain.value) {
      // Update existing mountain
      await api.put(`/api/voc-manager/mountains/${mountainForm.value.id}`, mountainForm.value)
    } else {
      // Add new mountain
      await api.post('/api/voc-manager/mountains', mountainForm.value)
    }

    await loadMountains()
    closeMountainModal()
  } catch (err: any) {
    console.error('Error saving mountain:', err)
    error.value = err.response?.data?.error || 'Failed to save mountain'
  } finally {
    savingMountain.value = false
  }
}

const confirmDeleteMountain = (mountain: Mountain) => {
  mountainToDelete.value = mountain
  showDeleteConfirm.value = true
}

const deleteMountain = async () => {
  if (!mountainToDelete.value) return

  try {
    await api.delete(`/api/voc-manager/mountains/${mountainToDelete.value.id}`)
    await loadMountains()
  } catch (err: any) {
    console.error('Error deleting mountain:', err)
    error.value = 'Failed to delete mountain'
  } finally {
    showDeleteConfirm.value = false
    mountainToDelete.value = null
  }
}

// Load text channels for notification selection
const loadTextChannels = async () => {
  try {
    const response = await api.get('/api/voc-manager/channels')
    textChannels.value = response.data.textChannels || []
  } catch (err: any) {
    console.error('Error loading text channels:', err)
  }
}

// Load voc manager config to get current notification channel
const loadVocManagerConfig = async () => {
  try {
    const response = await api.get('/api/voc-manager/')
    selectedNotificationChannel.value = response.data.vocManager?.notificationChannelId || null
  } catch (err: any) {
    console.error('Error loading voc manager config:', err)
  }
}

// Update notification channel
const updateNotificationChannel = async () => {
  try {
    updatingNotificationChannel.value = true
    await api.put('/api/voc-manager/notification-channel', {
      channelId: selectedNotificationChannel.value
    })
  } catch (err: any) {
    console.error('Error updating notification channel:', err)
    error.value = 'Failed to update notification channel'
  } finally {
    updatingNotificationChannel.value = false
  }
}

onMounted(() => {
  loadData()
  loadMountains()
  loadTextChannels()
  loadVocManagerConfig()
})
</script>
