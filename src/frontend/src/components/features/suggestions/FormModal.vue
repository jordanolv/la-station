<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="p-6 border-b border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">
            {{ form ? 'Modifier le formulaire' : 'Nouveau formulaire' }}
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

      <form @submit.prevent="saveForm" class="p-6 space-y-6">
        <!-- Informations de base -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Nom du formulaire *
            </label>
            <input
              v-model="formData.name"
              type="text"
              required
              placeholder="Ex: Suggestion générale"
              class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              v-model="formData.description"
              placeholder="Description du formulaire..."
              rows="2"
              class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            ></textarea>
          </div>
        </div>

        <!-- Champs du formulaire -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-md font-medium text-white">Champs du formulaire</h4>
            <button
              type="button"
              @click="addField"
              :disabled="formData.fields.length >= 5"
              class="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
            >
              + Ajouter un champ
            </button>
          </div>

          <div class="text-sm text-gray-400 mb-4">
            Maximum 5 champs (limitation Discord). Le premier champ sera utilisé comme titre.
          </div>

          <div v-if="formData.fields.length === 0" class="text-center py-8 bg-gray-700 rounded-lg">
            <div class="text-2xl mb-2">📝</div>
            <p class="text-gray-400">Aucun champ défini</p>
            <button
              type="button"
              @click="addField"
              class="mt-2 text-purple-400 hover:text-purple-300"
            >
              Ajouter le premier champ
            </button>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(field, index) in formData.fields"
              :key="field.id"
              class="bg-gray-700 rounded-lg p-4 border border-gray-600"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-medium text-gray-300">
                  Champ {{ index + 1 }}
                  <span v-if="index === 0" class="text-purple-400">(Titre)</span>
                </span>
                <button
                  type="button"
                  @click="removeField(index)"
                  class="text-red-400 hover:text-red-300"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-400 mb-1">Label *</label>
                  <input
                    v-model="field.label"
                    type="text"
                    required
                    placeholder="Ex: Titre de la suggestion"
                    class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-1 focus:ring-purple-500"
                  >
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-400 mb-1">Type</label>
                  <select
                    v-model="field.type"
                    class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="text">Texte court</option>
                    <option value="textarea">Texte long</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-400 mb-1">Placeholder</label>
                  <input
                    v-model="field.placeholder"
                    type="text"
                    placeholder="Texte d'aide..."
                    class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-1 focus:ring-purple-500"
                  >
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-400 mb-1">Valeur par défaut</label>
                  <input
                    v-model="field.defaultValue"
                    type="text"
                    placeholder="Valeur pré-remplie..."
                    class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-1 focus:ring-purple-500"
                  >
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-400 mb-1">Longueur min</label>
                  <input
                    v-model.number="field.minLength"
                    type="number"
                    min="0"
                    max="4000"
                    placeholder="0"
                    class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-1 focus:ring-purple-500"
                  >
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-400 mb-1">Longueur max</label>
                  <input
                    v-model.number="field.maxLength"
                    type="number"
                    min="1"
                    max="4000"
                    placeholder="4000"
                    class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-1 focus:ring-purple-500"
                  >
                </div>
              </div>

              <div class="mt-3">
                <label class="flex items-center">
                  <input
                    v-model="field.required"
                    type="checkbox"
                    class="form-checkbox h-4 w-4 text-purple-600 rounded"
                  >
                  <span class="ml-2 text-sm text-gray-300">Champ obligatoire</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
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
            :disabled="!formData.name || formData.fields.length === 0"
            class="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
          >
            {{ form ? 'Modifier' : 'Créer' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

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

interface SuggestionForm {
  id: string
  name: string
  description: string
  fields: FormField[]
  createdAt: string
  updatedAt: string
}

const props = defineProps<{
  form?: SuggestionForm | null
}>()

const emit = defineEmits<{
  close: []
  save: [formData: Omit<SuggestionForm, 'id' | 'createdAt' | 'updatedAt'>]
}>()

const formData = ref({
  name: '',
  description: '',
  fields: [] as FormField[]
})

function addField() {
  if (formData.value.fields.length >= 5) return
  
  formData.value.fields.push({
    id: `field_${Date.now()}`,
    label: '',
    type: 'text',
    required: true,
    placeholder: '',
    maxLength: undefined,
    minLength: undefined,
    defaultValue: ''
  })
}

function removeField(index: number) {
  formData.value.fields.splice(index, 1)
}

function saveForm() {
  emit('save', {
    name: formData.value.name,
    description: formData.value.description,
    fields: formData.value.fields.filter(f => f.label.trim() !== '')
  })
}

onMounted(() => {
  if (props.form) {
    formData.value = {
      name: props.form.name,
      description: props.form.description,
      fields: [...props.form.fields]
    }
  } else {
    // Ajouter un champ par défaut pour le titre
    addField()
    formData.value.fields[0].label = 'Titre de la suggestion'
    formData.value.fields[0].placeholder = 'Résumez votre suggestion en quelques mots...'
  }
})
</script>