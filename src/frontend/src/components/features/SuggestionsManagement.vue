<template>
  <div class="space-y-6">
    <!-- Header with toggle -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-white mb-2">Système de Suggestions</h2>
        <p class="text-gray-400">Configurez les formulaires et channels pour les suggestions</p>
      </div>
      <div class="flex items-center space-x-3">
        <span class="text-sm text-gray-400">{{ config?.enabled ? 'Activé' : 'Désactivé' }}</span>
        <button
          @click="toggleFeature"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            config?.enabled ? 'bg-purple-600' : 'bg-gray-600'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              config?.enabled ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>
    </div>

    <!-- Configuration Tabs -->
    <div class="border-b border-gray-700">
      <nav class="-mb-px flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'border-b-2 py-2 px-1 text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
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
            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            + Nouveau formulaire
          </button>
        </div>

        <div v-if="config.forms.length === 0" class="text-center py-12 bg-gray-800 rounded-lg">
          <div class="text-4xl mb-4">📝</div>
          <h3 class="text-lg font-medium text-white mb-2">Aucun formulaire</h3>
          <p class="text-gray-400 mb-4">Créez votre premier formulaire de suggestions</p>
          <button
            @click="showCreateFormModal = true"
            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Créer un formulaire
          </button>
        </div>

        <div v-else class="grid gap-4">
          <div
            v-for="form in config.forms"
            :key="form.id"
            class="bg-gray-800 rounded-lg p-4 border border-gray-700"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium text-white">{{ form.name }}</h4>
                <p class="text-sm text-gray-400 mt-1">{{ form.description }}</p>
                <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>{{ form.fields.length }} champs</span>
                  <span>Créé le {{ new Date(form.createdAt).toLocaleDateString('fr-FR') }}</span>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <button
                  @click="editForm(form)"
                  class="text-gray-400 hover:text-white p-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="deleteForm(form.id)"
                  class="text-red-400 hover:text-red-300 p-2"
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
            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            + Ajouter un channel
          </button>
        </div>

        <div v-if="config.channels.length === 0" class="text-center py-12 bg-gray-800 rounded-lg">
          <div class="text-4xl mb-4">#️⃣</div>
          <h3 class="text-lg font-medium text-white mb-2">Aucun channel configuré</h3>
          <p class="text-gray-400 mb-4">Ajoutez des channels pour permettre les suggestions</p>
          <button
            @click="showAddChannelModal = true"
            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Ajouter un channel
          </button>
        </div>

        <div v-else class="grid gap-4">
          <div
            v-for="channel in config.channels"
            :key="channel.channelId"
            class="bg-gray-800 rounded-lg p-4 border border-gray-700"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium text-white"># {{ channel.channelName || channel.channelId }}</h4>
                <div class="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                  <span>{{ channel.suggestionCount }} suggestions</span>
                  <span>Republication: {{ channel.republishInterval }}</span>
                  <span v-if="channel.readOnly" class="text-yellow-400">Lecture seule</span>
                  <span v-if="channel.pinButton" class="text-blue-400">Bouton épinglé</span>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <button
                  @click="publishButton(channel.channelId)"
                  class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  title="Publier le bouton dans ce channel"
                >
                  Publier bouton
                </button>
                <button
                  @click="editChannel(channel)"
                  class="text-gray-400 hover:text-white p-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="removeChannel(channel.channelId)"
                  class="text-red-400 hover:text-red-300 p-2"
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
              class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-1 text-sm"
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
              class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-1 text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvées</option>
              <option value="rejected">Rejetées</option>
              <option value="implemented">Implémentées</option>
            </select>
          </div>
        </div>

        <div v-if="suggestions.length === 0" class="text-center py-12 bg-gray-800 rounded-lg">
          <div class="text-4xl mb-4">💡</div>
          <h3 class="text-lg font-medium text-white mb-2">Aucune suggestion</h3>
          <p class="text-gray-400">Les suggestions apparaîtront ici une fois soumises</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="suggestion in filteredSuggestions"
            :key="suggestion._id"
            class="bg-gray-800 rounded-lg p-4 border border-gray-700"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-3 mb-2">
                  <img
                    :src="suggestion.authorAvatar"
                    :alt="suggestion.authorUsername"
                    class="w-6 h-6 rounded-full"
                  >
                  <span class="font-medium text-white">{{ suggestion.authorUsername }}</span>
                  <span class="text-xs text-gray-500">
                    {{ new Date(suggestion.createdAt).toLocaleDateString('fr-FR') }}
                  </span>
                  <span class="text-xs text-blue-400 bg-blue-900 px-2 py-1 rounded">
                    # {{ getChannelName(suggestion.channelId) }}
                  </span>
                  <span
                    :class="[
                      'px-2 py-1 rounded-full text-xs',
                      getStatusColor(suggestion.status)
                    ]"
                  >
                    {{ getStatusLabel(suggestion.status) }}
                  </span>
                </div>
                
                <h4 class="font-medium text-white mb-2">
                  {{ suggestion.fields[0]?.value || 'Sans titre' }}
                </h4>
                
                <div v-if="suggestion.fields.length > 1" class="space-y-1 mb-3">
                  <div
                    v-for="field in suggestion.fields.slice(1)"
                    :key="field.fieldId"
                    class="text-sm"
                  >
                    <span class="text-gray-400">{{ field.label }}:</span>
                    <span class="text-gray-300 ml-2">
                      {{ field.value.length > 100 ? field.value.substring(0, 100) + '...' : field.value }}
                    </span>
                  </div>
                </div>

                <div v-if="suggestion.reactions.length > 0" class="flex items-center space-x-4 text-sm text-gray-400">
                  <div
                    v-for="reaction in suggestion.reactions"
                    :key="reaction.emoji"
                    class="flex items-center space-x-1"
                  >
                    <span>{{ reaction.emoji }}</span>
                    <span>{{ reaction.count }}</span>
                  </div>
                  <div class="ml-4">
                    <span class="font-medium">Score: {{ suggestion.score }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center space-x-2 ml-4">
                <select
                  :value="suggestion.status"
                  @change="updateSuggestionStatus(suggestion._id, ($event.target as HTMLSelectElement).value)"
                  class="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                >
                  <option value="pending">En attente</option>
                  <option value="approved">Approuvée</option>
                  <option value="rejected">Rejetée</option>
                  <option value="implemented">Implémentée</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Disabled State -->
    <div v-else class="text-center py-12 bg-gray-800 rounded-lg">
      <div class="text-4xl mb-4">💡</div>
      <h3 class="text-lg font-medium text-white mb-2">Système de suggestions désactivé</h3>
      <p class="text-gray-400 mb-4">Activez le système pour commencer à configurer les suggestions</p>
      <button
        @click="toggleFeature"
        class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
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
}

const props = defineProps<{
  guildId: string
}>()

const config = ref<SuggestionsConfig | null>(null)
const suggestions = ref<Suggestion[]>([])
const loading = ref(true)
const discordChannels = ref<Record<string, string>>({})
const activeTab = ref('forms')
const suggestionFilter = ref('all')
const suggestionChannelFilter = ref('all')

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
    const response = await fetch(`/api/guilds/${props.guildId}/features/suggestions/settings`)
    if (response.ok) {
      const data = await response.json()
      config.value = data.settings
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la configuration:', error)
  }
}

async function loadSuggestions() {
  try {
    const response = await fetch(`/api/guilds/${props.guildId}/suggestions`)
    if (response.ok) {
      suggestions.value = await response.json()
    }
  } catch (error) {
    console.error('Erreur lors du chargement des suggestions:', error)
  }
}

async function loadDiscordChannels() {
  try {
    const response = await fetch(`/api/guilds/${props.guildId}/channels`)
    if (response.ok) {
      const data = await response.json()
      const channelMap: Record<string, string> = {}
      
      // Create a map of channel ID to channel name
      if (data.textChannels) {
        data.textChannels.forEach((channel: any) => {
          channelMap[channel.id] = channel.name
        })
      }
      
      discordChannels.value = channelMap
    }
  } catch (error) {
    console.error('Erreur lors du chargement des channels Discord:', error)
  }
}

async function toggleFeature() {
  try {
    const newState = !config.value?.enabled
    const response = await fetch(`/api/guilds/${props.guildId}/features/suggestions/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newState })
    })
    
    if (response.ok) {
      // Reload config after toggle
      await loadConfig()
    }
  } catch (error) {
    console.error('Erreur lors du toggle:', error)
  }
}

async function saveForm(formData: Omit<SuggestionForm, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const url = editingForm.value
      ? `/api/guilds/${props.guildId}/suggestions/forms/${editingForm.value.id}`
      : `/api/guilds/${props.guildId}/suggestions/forms`
    
    const method = editingForm.value ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    
    if (response.ok) {
      await loadConfig()
      showCreateFormModal.value = false
      editingForm.value = null
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du formulaire:', error)
  }
}

async function saveChannel(channelData: Omit<SuggestionChannel, 'suggestionCount'>) {
  try {
    const response = await fetch(`/api/guilds/${props.guildId}/suggestions/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(channelData)
    })
    
    if (response.ok) {
      await loadConfig()
      showAddChannelModal.value = false
      editingChannel.value = null
    }
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
    const response = await fetch(`/api/guilds/${props.guildId}/suggestions/forms/${formId}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      await loadConfig()
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du formulaire:', error)
  }
}

async function removeChannel(channelId: string) {
  if (!confirm('Êtes-vous sûr de vouloir retirer ce channel ?')) return
  
  try {
    const response = await fetch(`/api/guilds/${props.guildId}/suggestions/channels/${channelId}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      await loadConfig()
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du channel:', error)
  }
}

async function updateSuggestionStatus(suggestionId: string, status: string) {
  try {
    const response = await fetch(`/api/guilds/${props.guildId}/suggestions/${suggestionId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    
    if (response.ok) {
      await loadSuggestions()
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error)
  }
}

async function publishButton(channelId: string) {
  try {
    const response = await fetch(`/api/guilds/${props.guildId}/suggestions/channels/${channelId}/publish-button`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (response.ok) {
      const data = await response.json()
      alert(`✅ ${data.message}`)
      await loadConfig() // Reload to get updated button message ID
    } else {
      const error = await response.json()
      alert(`❌ Erreur: ${error.error}`)
    }
  } catch (error) {
    console.error('Erreur lors de la publication du bouton:', error)
    alert('❌ Erreur lors de la publication du bouton')
  }
}

function getStatusColor(status: string): string {
  const colors = {
    pending: 'bg-blue-500 text-white',
    approved: 'bg-green-500 text-white',
    rejected: 'bg-red-500 text-white',
    implemented: 'bg-purple-500 text-white'
  }
  return colors[status as keyof typeof colors] || 'bg-gray-500 text-white'
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