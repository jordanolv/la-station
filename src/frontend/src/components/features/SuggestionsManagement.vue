<template>
  <div class="space-y-6">
    <!-- Header with toggle -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-white mb-2">Système de Suggestions</h2>
        <p class="text-muted">Configurez les formulaires et channels pour les suggestions</p>
      </div>
      <div class="flex items-center space-x-3">
        <span class="text-sm text-muted">{{ config?.enabled ? 'Activé' : 'Désactivé' }}</span>
        <button
          @click="toggleFeature"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            config?.enabled ? 'bg-white' : 'bg-surface border border-border'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full transition-transform',
              config?.enabled ? 'translate-x-6 bg-black' : 'translate-x-1 bg-muted'
            ]"
          />
        </button>
      </div>
    </div>

    <!-- Configuration Tabs -->
    <div class="border-b border-border">
      <nav class="-mb-px flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'border-b-2 py-2 px-1 text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'border-white text-white'
              : 'border-transparent text-muted hover:text-white'
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div v-if="config?.enabled">
      <!-- Formulaires Tab -->
      <div v-if="activeTab === 'forms'" class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-white">Formulaires de suggestions</h3>
          <button
            @click="showCreateFormModal = true"
            class="bg-surface hover:bg-surface-hover border border-border text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Nouveau formulaire</span>
          </button>
        </div>

        <div v-if="config.forms.length === 0" class="text-center py-12 bg-surface border border-border rounded-xl">
          <div class="text-4xl mb-4">📝</div>
          <h3 class="text-lg font-medium text-white mb-2">Aucun formulaire</h3>
          <p class="text-muted mb-4">Créez votre premier formulaire de suggestions</p>
          <button
            @click="showCreateFormModal = true"
            class="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Créer un formulaire
          </button>
        </div>

        <div v-else class="grid gap-4">
          <div
            v-for="form in config.forms"
            :key="form.id"
            class="bg-surface border border-border rounded-xl p-4 hover:border-white/20 transition-colors group"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium text-white">{{ form.name }}</h4>
                <p class="text-sm text-muted mt-1">{{ form.description }}</p>
                <div class="flex items-center space-x-4 mt-2 text-xs text-muted/70">
                  <span>{{ form.fields.length }} champs</span>
                  <span>Créé le {{ new Date(form.createdAt).toLocaleDateString('fr-FR') }}</span>
                </div>
              </div>
              <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  @click="editForm(form)"
                  class="text-muted hover:text-white p-2 transition-colors"
                  title="Modifier"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="deleteForm(form.id)"
                  class="text-muted hover:text-red-400 p-2 transition-colors"
                  title="Supprimer"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Channels Tab -->
      <div v-if="activeTab === 'channels'" class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-white">Channels de suggestions</h3>
          <button
            @click="showAddChannelModal = true"
            class="bg-surface hover:bg-surface-hover border border-border text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Ajouter un channel</span>
          </button>
        </div>

        <div v-if="config.channels.length === 0" class="text-center py-12 bg-surface border border-border rounded-xl">
          <div class="text-4xl mb-4">#️⃣</div>
          <h3 class="text-lg font-medium text-white mb-2">Aucun channel configuré</h3>
          <p class="text-muted mb-4">Ajoutez des channels pour permettre les suggestions</p>
          <button
            @click="showAddChannelModal = true"
            class="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Ajouter un channel
          </button>
        </div>

        <div v-else class="grid gap-4">
          <div
            v-for="channel in config.channels"
            :key="channel.channelId"
            class="bg-surface border border-border rounded-xl p-4 hover:border-white/20 transition-colors group"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium text-white flex items-center gap-2">
                  <span class="text-muted">#</span> {{ channel.channelName || channel.channelId }}
                </h4>
                <div class="flex items-center space-x-4 mt-2 text-sm text-muted">
                  <span>{{ channel.suggestionCount }} suggestions</span>
                  <span>Republication: {{ channel.republishInterval }}</span>
                  <span v-if="channel.readOnly" class="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded text-xs">Lecture seule</span>
                  <span v-if="channel.pinButton" class="text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded text-xs">Bouton épinglé</span>
                </div>
              </div>
              <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  @click="publishButton(channel.channelId)"
                  class="bg-surface hover:bg-surface-hover border border-border text-white px-3 py-1 rounded text-sm transition-colors"
                  title="Publier le bouton dans ce channel"
                >
                  Publier bouton
                </button>
                <button
                  @click="editChannel(channel)"
                  class="text-muted hover:text-white p-2 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="removeChannel(channel.channelId)"
                  class="text-muted hover:text-red-400 p-2 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Suggestions Tab -->
      <div v-if="activeTab === 'suggestions'" class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-white">Suggestions soumises</h3>
          <div class="flex items-center space-x-2">
            <select
              v-model="suggestionChannelFilter"
              class="bg-surface border border-border text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              <option value="all">Tous les channels</option>
              <option
                v-for="channel in config?.channels || []"
                :key="channel.channelId"
                :value="channel.channelId"
              >
                # {{ getChannelName(channel.channelId) }}
              </option>
            </select>
            <select
              v-model="suggestionFilter"
              class="bg-surface border border-border text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvées</option>
              <option value="rejected">Rejetées</option>
              <option value="implemented">Implémentées</option>
            </select>
          </div>
        </div>

        <div v-if="suggestions.length === 0" class="text-center py-12 bg-surface border border-border rounded-xl">
          <div class="text-4xl mb-4">💡</div>
          <h3 class="text-lg font-medium text-white mb-2">Aucune suggestion</h3>
          <p class="text-muted">Les suggestions apparaîtront ici une fois soumises</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="suggestion in filteredSuggestions"
            :key="suggestion._id"
            class="bg-surface border border-border rounded-xl p-4 hover:border-white/20 transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-3 mb-3">
                  <img
                    :src="suggestion.authorAvatar"
                    :alt="suggestion.authorUsername"
                    class="w-6 h-6 rounded-full border border-border"
                  >
                  <span class="font-medium text-white text-sm">{{ suggestion.authorUsername }}</span>
                  <span class="text-xs text-muted">
                    {{ new Date(suggestion.createdAt).toLocaleDateString('fr-FR') }}
                  </span>
                  <span class="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">
                    # {{ getChannelName(suggestion.channelId) }}
                  </span>
                  <span
                    :class="[
                      'px-2 py-0.5 rounded text-xs border',
                      getStatusColor(suggestion.status)
                    ]"
                  >
                    {{ getStatusLabel(suggestion.status) }}
                  </span>
                </div>
                
                <h4 class="font-medium text-white mb-2 text-base">
                  {{ suggestion.fields[0]?.value || 'Sans titre' }}
                </h4>
                
                <div v-if="suggestion.fields.length > 1" class="space-y-2 mb-4 bg-background/50 p-3 rounded-lg border border-border/50">
                  <div
                    v-for="field in suggestion.fields.slice(1)"
                    :key="field.fieldId"
                    class="text-sm"
                  >
                    <span class="text-muted block text-xs uppercase tracking-wider mb-0.5">{{ field.label }}</span>
                    <span class="text-gray-200">
                      {{ field.value.length > 100 ? field.value.substring(0, 100) + '...' : field.value }}
                    </span>
                  </div>
                </div>

                <div v-if="suggestion.reactions.length > 0" class="flex items-center space-x-4 text-sm text-muted">
                  <div
                    v-for="reaction in suggestion.reactions"
                    :key="reaction.emoji"
                    class="flex items-center space-x-1 bg-background px-2 py-1 rounded border border-border"
                  >
                    <span>{{ reaction.emoji }}</span>
                    <span class="font-mono">{{ reaction.count }}</span>
                  </div>
                  <div class="ml-4">
                    <span class="font-medium text-white">Score: {{ suggestion.score }}</span>
                  </div>
                </div>
              </div>

              <div class="flex flex-col space-y-2 ml-4 min-w-[200px]">
                <select
                  :value="suggestion.status"
                  @change="updateSuggestionStatus(suggestion._id, ($event.target as HTMLSelectElement).value)"
                  class="bg-background border border-border text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                >
                  <option value="pending">En attente</option>
                  <option value="approved">Approuvée</option>
                  <option value="rejected">Rejetée</option>
                  <option value="implemented">Implémentée</option>
                </select>
                <div class="flex items-center space-x-2">
                  <input
                    v-model="moderationNotes[suggestion._id]"
                    type="text"
                    placeholder="Note de modération..."
                    class="bg-background border border-border text-white rounded-lg px-3 py-1.5 text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-white/20"
                    @keyup.enter="addModerationNote(suggestion._id)"
                  >
                  <button
                    @click="addModerationNote(suggestion._id)"
                    :disabled="!moderationNotes[suggestion._id]?.trim()"
                    class="bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1.5 rounded-lg text-xs transition-colors font-bold"
                    title="Ajouter la note"
                  >
                    ✓
                  </button>
                </div>
                <div v-if="suggestion.moderatorNote" class="text-xs text-muted bg-background p-2 rounded-lg border border-border">
                  <strong class="text-white block mb-0.5">Note:</strong> {{ suggestion.moderatorNote }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Disabled State -->
    <div v-else class="text-center py-12 bg-surface border border-border rounded-xl">
      <div class="text-4xl mb-4">💡</div>
      <h3 class="text-lg font-medium text-white mb-2">Système de suggestions désactivé</h3>
      <p class="text-muted mb-4">Activez le système pour commencer à configurer les suggestions</p>
      <button
        @click="toggleFeature"
        class="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors font-medium"
      >
        Activer les suggestions
      </button>
    </div>

    <!-- Modals -->
    <FormModal
      v-if="showCreateFormModal"
      :form="editingForm"
      @close="showCreateFormModal = false; editingForm = null"
      @save="saveForm"
    />

    <ChannelModal
      v-if="showAddChannelModal"
      :channel="editingChannel"
      :forms="config?.forms || []"
      :guild-id="guildId"
      @close="showAddChannelModal = false; editingChannel = null"
      @save="saveChannel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import FormModal from './suggestions/FormModal.vue'
import ChannelModal from './suggestions/ChannelModal.vue'
import { useApi } from '../../composables/useApi'

interface SuggestionForm {
  id: string
  name: string
  description: string
  fields: FormField[]
  createdAt: string
  updatedAt: string
}

interface FormField {
  id: string
  label: string
  type: 'text' | 'textarea'
  required: boolean
  placeholder?: string
  maxLength?: number
  minLength?: number
  defaultValue?: string
}

interface SuggestionChannel {
  channelId: string
  channelName?: string
  formId: string
  readOnly: boolean
  pinButton: boolean
  republishInterval: number
  suggestionCount: number
  customReactions?: string[]
  buttonMessageId?: string
}

interface SuggestionsConfig {
  guildId: string
  enabled: boolean
  channels: SuggestionChannel[]
  forms: SuggestionForm[]
  defaultReactions: string[]
}

interface Suggestion {
  _id: string
  guildId: string
  channelId: string
  formId: string
  authorId: string
  authorUsername: string
  authorAvatar?: string
  fields: Array<{
    fieldId: string
    label: string
    value: string
    type: string
  }>
  status: string
  reactions: Array<{
    emoji: string
    count: number
    users: string[]
  }>
  score: number
  createdAt: string
  messageId?: string
  moderatorNote?: string
  moderatorId?: string
  moderatedAt?: string
}

const props = defineProps<{
  guildId: string
}>()

const { get, post, put, delete: del } = useApi()
const config = ref<SuggestionsConfig | null>(null)
const suggestions = ref<Suggestion[]>([])
const loading = ref(true)
const discordChannels = ref<Record<string, string>>({})
const activeTab = ref('forms')
const suggestionFilter = ref('all')
const suggestionChannelFilter = ref('all')
const moderationNotes = ref<Record<string, string>>({})

const showCreateFormModal = ref(false)
const showAddChannelModal = ref(false)
const editingForm = ref<SuggestionForm | null>(null)
const editingChannel = ref<SuggestionChannel | null>(null)

const tabs = [
  { id: 'forms', name: 'Formulaires' },
  { id: 'channels', name: 'Channels' },
  { id: 'suggestions', name: 'Suggestions' }
]

const filteredSuggestions = computed(() => {
  let filtered = suggestions.value
  
  // Filter by channel
  if (suggestionChannelFilter.value !== 'all') {
    filtered = filtered.filter(s => s.channelId === suggestionChannelFilter.value)
  }
  
  // Filter by status
  if (suggestionFilter.value !== 'all') {
    filtered = filtered.filter(s => s.status === suggestionFilter.value)
  }
  
  return filtered
})

async function loadConfig() {
  try {
    const data = await get<{ settings: SuggestionsConfig }>(`/api/guilds/${props.guildId}/features/suggestions/settings`)
    config.value = data.settings
  } catch (error) {
    console.error('Erreur lors du chargement de la configuration:', error)
  }
}

async function loadSuggestions() {
  try {
    suggestions.value = await get<Suggestion[]>(`/api/guilds/${props.guildId}/suggestions`)
  } catch (error) {
    console.error('Erreur lors du chargement des suggestions:', error)
  }
}

async function loadDiscordChannels() {
  try {
    const data = await get<{ textChannels?: Array<{ id: string, name: string }> }>(`/api/guilds/${props.guildId}/channels`)
    const channelMap: Record<string, string> = {}
    
    // Create a map of channel ID to channel name
    if (data.textChannels) {
      data.textChannels.forEach((channel: any) => {
        channelMap[channel.id] = channel.name
      })
    }
    
    discordChannels.value = channelMap
  } catch (error) {
    console.error('Erreur lors du chargement des channels Discord:', error)
  }
}

async function toggleFeature() {
  try {
    const newState = !config.value?.enabled
    await post(`/api/guilds/${props.guildId}/features/suggestions/toggle`, { enabled: newState })
    
    // Reload config after toggle
    await loadConfig()
  } catch (error) {
    console.error('Erreur lors du toggle:', error)
  }
}

async function saveForm(formData: Omit<SuggestionForm, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    if (editingForm.value) {
      await put(`/api/guilds/${props.guildId}/suggestions/forms/${editingForm.value.id}`, formData)
    } else {
      await post(`/api/guilds/${props.guildId}/suggestions/forms`, formData)
    }
    
    await loadConfig()
    showCreateFormModal.value = false
    editingForm.value = null
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du formulaire:', error)
  }
}

async function saveChannel(channelData: Omit<SuggestionChannel, 'suggestionCount'>) {
  try {
    await post(`/api/guilds/${props.guildId}/suggestions/channels`, channelData)
    
    await loadConfig()
    showAddChannelModal.value = false
    editingChannel.value = null
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du channel:', error)
  }
}

function editForm(form: SuggestionForm) {
  editingForm.value = form
  showCreateFormModal.value = true
}

function editChannel(channel: SuggestionChannel) {
  editingChannel.value = channel
  showAddChannelModal.value = true
}

async function deleteForm(formId: string) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce formulaire ?')) return
  
  try {
    await del(`/api/guilds/${props.guildId}/suggestions/forms/${formId}`)
    await loadConfig()
  } catch (error) {
    console.error('Erreur lors de la suppression du formulaire:', error)
  }
}

async function removeChannel(channelId: string) {
  if (!confirm('Êtes-vous sûr de vouloir retirer ce channel ?')) return
  
  try {
    await del(`/api/guilds/${props.guildId}/suggestions/channels/${channelId}`)
    await loadConfig()
  } catch (error) {
    console.error('Erreur lors de la suppression du channel:', error)
  }
}

async function updateSuggestionStatus(suggestionId: string, status: string) {
  try {
    await put(`/api/guilds/${props.guildId}/suggestions/${suggestionId}/status`, { status })
    await loadSuggestions()
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error)
  }
}

async function addModerationNote(suggestionId: string) {
  const note = moderationNotes.value[suggestionId]?.trim()
  if (!note) return

  try {
    const suggestion = suggestions.value.find(s => s._id === suggestionId)
    if (!suggestion) return

    await put(`/api/guilds/${props.guildId}/suggestions/${suggestionId}/status`, { 
      status: suggestion.status, // Keep current status
      note: note 
    })
    
    // Clear the note input
    moderationNotes.value[suggestionId] = ''
    await loadSuggestions()
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la note:', error)
  }
}

async function publishButton(channelId: string) {
  try {
    const data = await post<{ message: string }>(`/api/guilds/${props.guildId}/suggestions/channels/${channelId}/publish-button`)
    alert(`✅ ${data.message}`)
    await loadConfig() // Reload to get updated button message ID
  } catch (error: any) {
    console.error('Erreur lors de la publication du bouton:', error)
    const errorMessage = error.response?.data?.error || 'Erreur lors de la publication du bouton'
    alert(`❌ Erreur: ${errorMessage}`)
  }
}

function getStatusColor(status: string): string {
  const colors = {
    pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    implemented: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  }
  return colors[status as keyof typeof colors] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
}

function getStatusLabel(status: string): string {
  const labels = {
    pending: 'En attente',
    approved: 'Approuvée',
    rejected: 'Rejetée',
    implemented: 'Implémentée'
  }
  return labels[status as keyof typeof labels] || status
}

function getChannelName(channelId: string): string {
  // First try to get from config (stored channel names)
  const channel = config.value?.channels.find(c => c.channelId === channelId)
  if (channel?.channelName) {
    return channel.channelName
  }
  
  // Fallback to Discord channels data
  if (discordChannels.value[channelId]) {
    return discordChannels.value[channelId]
  }
  
  // Last fallback
  return `Channel ${channelId.slice(-4)}`
}

onMounted(async () => {
  await Promise.all([loadConfig(), loadSuggestions(), loadDiscordChannels()])
  loading.value = false
})
</script>