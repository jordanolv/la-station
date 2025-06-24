<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-gray-800 rounded-lg w-full max-w-lg">
      <div class="p-6 border-b border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">
            {{ channel ? 'Modifier le channel' : 'Ajouter un channel' }}
          </h3>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-white"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <form @submit.prevent="saveChannel" class="p-6 space-y-4">
        <ChannelSelect
          v-model="channelData.channelId"
          :guild-id="guildId"
          label="Channel Discord *"
          placeholder="Sélectionnez un channel"
          help-text="Choisissez le channel où publier les suggestions"
          channel-type="text"
        />

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Nom du channel (optionnel)
          </label>
          <input
            v-model="channelData.channelName"
            type="text"
            placeholder="suggestions-générales"
            class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Formulaire à utiliser *
          </label>
          <select
            v-model="channelData.formId"
            required
            class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Sélectionnez un formulaire</option>
            <option
              v-for="form in forms"
              :key="form.id"
              :value="form.id"
            >
              {{ form.name }}
            </option>
          </select>
          <p v-if="forms.length === 0" class="text-xs text-yellow-400 mt-1">
            Aucun formulaire disponible. Créez d'abord un formulaire.
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Intervalle de republication
          </label>
          <div class="flex items-center space-x-3">
            <input
              v-model.number="channelData.republishInterval"
              type="number"
              min="1"
              max="100"
              class="w-20 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
            <span class="text-gray-400">suggestions</span>
          </div>
          <p class="text-xs text-gray-400 mt-1">
            Le bouton sera republié automatiquement après ce nombre de suggestions
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Réactions personnalisées (optionnel)
          </label>
          <input
            v-model="customReactionsText"
            type="text"
            placeholder="👍 👎 ❤️ 🔥"
            class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
          <p class="text-xs text-gray-400 mt-1">
            Emojis séparés par des espaces. Laissez vide pour utiliser les réactions par défaut.
          </p>
        </div>

        <div class="space-y-3">
          <label class="flex items-center">
            <input
              v-model="channelData.readOnly"
              type="checkbox"
              class="form-checkbox h-4 w-4 text-purple-600 rounded"
            >
            <span class="ml-2 text-sm text-gray-300">Channel en lecture seule</span>
          </label>
          <p class="text-xs text-gray-400 ml-6">
            Empêche les utilisateurs d'écrire directement dans le channel
          </p>

          <label class="flex items-center">
            <input
              v-model="channelData.pinButton"
              type="checkbox"
              class="form-checkbox h-4 w-4 text-purple-600 rounded"
            >
            <span class="ml-2 text-sm text-gray-300">Épingler le bouton</span>
          </label>
          <p class="text-xs text-gray-400 ml-6">
            Épingle automatiquement le message avec le bouton de suggestion
          </p>
        </div>

        <div class="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            :disabled="!channelData.channelId || !channelData.formId"
            class="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
          >
            {{ channel ? 'Modifier' : 'Ajouter' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ChannelSelect from '../../ui/ChannelSelect.vue'

interface SuggestionForm {
  id: string
  name: string
  description: string
  fields: any[]
  createdAt: string
  updatedAt: string
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

const props = defineProps<{
  channel?: SuggestionChannel | null
  forms: SuggestionForm[]
  guildId: string
}>()

const emit = defineEmits<{
  close: []
  save: [channelData: Omit<SuggestionChannel, 'suggestionCount'>]
}>()

const channelData = ref({
  channelId: '',
  channelName: '',
  formId: '',
  readOnly: true,
  pinButton: false,
  republishInterval: 4,
  customReactions: [] as string[]
})

const customReactionsText = ref('')

const processedChannelData = computed(() => ({
  ...channelData.value,
  customReactions: customReactionsText.value.trim() 
    ? customReactionsText.value.split(' ').filter(r => r.trim() !== '')
    : undefined
}))

function saveChannel() {
  const data = processedChannelData.value
  if (data.customReactions && data.customReactions.length === 0) {
    delete data.customReactions
  }
  
  emit('save', data)
}

onMounted(() => {
  if (props.channel) {
    channelData.value = {
      channelId: props.channel.channelId,
      channelName: props.channel.channelName || '',
      formId: props.channel.formId,
      readOnly: props.channel.readOnly,
      pinButton: props.channel.pinButton,
      republishInterval: props.channel.republishInterval,
      customReactions: props.channel.customReactions || []
    }
    
    if (props.channel.customReactions) {
      customReactionsText.value = props.channel.customReactions.join(' ')
    }
  }
})
</script>