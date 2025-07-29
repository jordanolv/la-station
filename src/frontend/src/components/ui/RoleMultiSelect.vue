<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-gray-300 mb-2">
      {{ label }}
      <span v-if="required" class="text-red-400">*</span>
    </label>
    
    <!-- Selected roles display -->
    <div v-if="selectedRoles.length > 0" class="mb-3">
      <div class="flex flex-wrap gap-2">
        <div
          v-for="role in selectedRoles"
          :key="role.id"
          class="flex items-center space-x-2 bg-gray-700 px-3 py-1 rounded-full border"
          :style="{ borderColor: role.color || '#99AAB5' }"
        >
          <div 
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: role.color || '#99AAB5' }"
          ></div>
          <span class="text-sm text-white">{{ role.name }}</span>
          <button
            @click="removeRole(role.id)"
            class="text-gray-400 hover:text-red-400 transition-colors ml-1"
            type="button"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Role selector -->
    <div class="relative">
      <select
        :value="''"
        @change="handleChange"
        :disabled="loading"
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent appearance-none disabled:opacity-50"
      >
        <option value="" disabled>{{ placeholder || 'Sélectionnez des rôles' }}</option>
        <option 
          v-for="role in availableRoles" 
          :key="role.id" 
          :value="role.id"
          class="text-white"
        >
          {{ role.name }}
        </option>
      </select>
      
      <!-- Custom dropdown arrow -->
      <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
    
    <p v-if="helpText" class="mt-1 text-sm text-gray-500">{{ helpText }}</p>
    
    <!-- Loading state -->
    <div v-if="loading" class="mt-2 flex items-center space-x-2">
      <div class="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      <span class="text-sm text-gray-400">Chargement des rôles...</span>
    </div>
    
    <!-- Error state -->
    <div v-if="error" class="mt-2 text-sm text-red-400">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '../../composables/useApi'

interface Role {
  id: string
  name: string
  color: string
  position: number
  mentionable: boolean
}

const props = defineProps<{
  modelValue: string[]
  guildId: string
  label?: string
  placeholder?: string
  helpText?: string
  required?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const { get } = useApi()

// State
const roles = ref<Role[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Computed
const selectedRoles = computed(() => {
  return roles.value.filter(role => props.modelValue.includes(role.id))
})

const availableRoles = computed(() => {
  return roles.value.filter(role => !props.modelValue.includes(role.id))
})

// Methods
async function loadRoles() {
  if (!props.guildId) return
  
  try {
    loading.value = true
    error.value = null
    
    const response = await get(`/api/guilds/${props.guildId}/roles`) as any
    
    if (response?.roles) {
      roles.value = response.roles
    }
  } catch (err) {
    console.error('Erreur lors du chargement des rôles:', err)
    error.value = 'Impossible de charger les rôles'
  } finally {
    loading.value = false
  }
}

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const roleId = target.value
  
  if (roleId && !props.modelValue.includes(roleId)) {
    const newValue = [...props.modelValue, roleId]
    emit('update:modelValue', newValue)
  }
  
  // Reset select
  target.value = ''
}

function removeRole(roleId: string) {
  const newValue = props.modelValue.filter(id => id !== roleId)
  emit('update:modelValue', newValue)
}

// Watch guildId changes
watch(() => props.guildId, loadRoles, { immediate: false })

onMounted(() => {
  loadRoles()
})
</script>