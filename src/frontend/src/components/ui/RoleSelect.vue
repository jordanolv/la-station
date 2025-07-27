<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-gray-300 mb-2">
      {{ label }}
      <span v-if="required" class="text-red-400">*</span>
    </label>
    
    <div class="relative">
      <select
        :value="modelValue"
        @change="handleChange"
        :required="required"
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent appearance-none"
      >
        <option value="" disabled>{{ placeholder || 'Sélectionnez un rôle' }}</option>
        <option 
          v-for="role in roles" 
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
    
    <!-- Selected role preview -->
    <div v-if="selectedRole" class="mt-2 flex items-center space-x-2">
      <div 
        class="w-3 h-3 rounded-full"
        :style="{ backgroundColor: selectedRole.color || '#99AAB5' }"
      ></div>
      <span class="text-sm text-gray-400">{{ selectedRole.name }}</span>
      <span v-if="selectedRole.mentionable" class="text-xs text-green-400">• Mentionnable</span>
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
import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '../../composables/useApi'

interface Role {
  id: string
  name: string
  color: string
  position: number
  mentionable: boolean
}

interface Props {
  modelValue: string
  guildId: string
  label?: string
  placeholder?: string
  helpText?: string
  required?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  required: false
})

const emit = defineEmits<Emits>()

const roles = ref<Role[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const { get } = useApi()

const selectedRole = computed(() => 
  roles.value.find(role => role.id === props.modelValue)
)

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}

const fetchRoles = async () => {
  if (!props.guildId) return
  
  try {
    loading.value = true
    error.value = null
    
    const response = await get(`/api/guilds/${props.guildId}/roles`)
    roles.value = response.roles || []
  } catch (err: any) {
    console.error('Error fetching roles:', err)
    error.value = 'Erreur lors du chargement des rôles'
    roles.value = []
  } finally {
    loading.value = false
  }
}

// Charger les rôles quand le composant est monté ou quand guildId change
watch(() => props.guildId, fetchRoles, { immediate: true })

onMounted(() => {
  if (props.guildId) {
    fetchRoles()
  }
})
</script>