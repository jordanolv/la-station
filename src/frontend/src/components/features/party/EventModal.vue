<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-semibold text-white">
          {{ event ? 'Modifier l\'événement' : 'Créer un événement' }}
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-white transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Event Name & Game -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Nom de l'événement *
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              maxlength="100"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="Soirée Among Us"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Jeu *
            </label>
            <input
              v-model="form.game"
              type="text"
              required
              maxlength="100"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="Among Us"
            />
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            v-model="form.description"
            maxlength="1000"
            rows="3"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
            placeholder="Décrivez votre événement..."
          ></textarea>
          <div class="text-xs text-gray-400 mt-1">
            {{ form.description?.length || 0 }}/1000 caractères
          </div>
        </div>

        <!-- Date & Time -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Date *
            </label>
            <input
              v-model="form.date"
              type="date"
              required
              :min="minDate"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Heure *
            </label>
            <input
              v-model="form.time"
              type="time"
              required
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
        </div>

        <!-- Max Slots & Channel -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Nombre de places *
            </label>
            <input
              v-model.number="form.maxSlots"
              type="number"
              required
              min="1"
              max="50"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <ChannelSelect
              v-model="form.channelId"
              :guild-id="guildId"
              label="Channel Discord *"
              placeholder="Sélectionner un channel"
              help-text="Le channel où l'événement sera publié (forum pour créer un post, texte pour un embed)"
              :group-by-category="true"
            />
          </div>
        </div>

        <!-- Color & Image -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Couleur
            </label>
            <div class="flex items-center space-x-3">
              <input
                v-model="form.color"
                type="color"
                class="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
              />
              <input
                v-model="form.color"
                type="text"
                pattern="^#[0-9A-Fa-f]{6}$"
                class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="#FF6B6B"
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Image
            </label>
            <input
              ref="imageInput"
              type="file"
              accept="image/*"
              @change="handleImageChange"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-700 file:cursor-pointer"
            />
          </div>
        </div>

        <!-- Image Preview -->
        <div v-if="imagePreview" class="flex items-center space-x-4">
          <img 
            :src="imagePreview" 
            alt="Aperçu"
            class="w-20 h-20 object-cover rounded-lg"
          />
          <button
            type="button"
            @click="removeImage"
            class="text-red-400 hover:text-red-300 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end space-x-3 pt-6 border-t border-gray-700">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Annuler
          </button>
          
          <button
            type="submit"
            :disabled="!isFormValid"
            class="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
          >
            {{ event ? 'Modifier' : 'Créer' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '../../../composables/useApi'
import ChannelSelect from '../../ui/ChannelSelect.vue'

interface Event {
  _id: string
  name: string
  game: string
  description?: string
  date: string
  time: string
  maxSlots: number
  currentSlots: number
  image?: string
  color: string
  channelId: string
}

const props = defineProps<{
  event?: Event | null
  guildId: string
}>()

const emit = defineEmits<{
  close: []
  save: [FormData]
}>()

const form = ref({
  name: '',
  game: '',
  description: '',
  date: '',
  time: '',
  maxSlots: 10,
  channelId: '',
  color: '#FF6B6B'
})

const imageInput = ref<HTMLInputElement>()
const imageFile = ref<File | null>(null)
const imagePreview = ref<string>('')

const minDate = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const isFormValid = computed(() => {
  return form.value.name.trim() && 
         form.value.game.trim() && 
         form.value.date && 
         form.value.time && 
         form.value.maxSlots >= 1 && 
         form.value.maxSlots <= 50 && 
         form.value.channelId &&
         /^#[0-9A-Fa-f]{6}$/.test(form.value.color)
})


function handleImageChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    imageFile.value = file
    
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

function removeImage() {
  imageFile.value = null
  imagePreview.value = ''
  if (imageInput.value) {
    imageInput.value.value = ''
  }
}

function handleSubmit() {
  if (!isFormValid.value) return

  const formData = new FormData()
  
  // Ajouter tous les champs du formulaire
  Object.entries(form.value).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, value.toString())
    }
  })
  
  // Ajouter l'image si présente
  if (imageFile.value) {
    formData.append('image', imageFile.value)
  }
  
  emit('save', formData)
}

// Initialiser le formulaire si on édite un événement
watch(() => props.event, (event) => {
  if (event) {
    form.value = {
      name: event.name,
      game: event.game,
      description: event.description || '',
      date: event.date.split('T')[0], // Format YYYY-MM-DD
      time: event.time,
      maxSlots: event.maxSlots,
      channelId: event.channelId,
      color: event.color
    }
    
    if (event.image) {
      imagePreview.value = event.image
    }
  }
}, { immediate: true })

</script>