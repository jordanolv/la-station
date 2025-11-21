<template>
  <div class="relative">
    <label v-if="label" class="block text-sm font-medium text-gray-300 mb-1">
      {{ label }}
    </label>
    
    <div class="relative">
      <select 
        :value="modelValue"
        @change="handleChange"
        :disabled="loading || disabled"
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-10"
      >
        <option value="">{{ placeholder || 'Sélectionnez un canal' }}</option>
        
        <!-- Group by categories if available -->
        <template v-if="groupByCategory && categories.length > 0">
          <!-- Channels without category -->
          <optgroup v-if="channelsWithoutCategory.length > 0" label="Aucune catégorie">
            <option 
              v-for="channel in channelsWithoutCategory" 
              :key="channel.id" 
              :value="channel.id"
            >
              {{ getChannelIcon(channel.type) }} {{ channel.name }}
            </option>
          </optgroup>
          
          <!-- Channels grouped by category -->
          <optgroup 
            v-for="category in categories" 
            :key="category.id" 
            :label="category.name"
          >
            <option 
              v-for="channel in getChannelsInCategory(category.id)" 
              :key="channel.id" 
              :value="channel.id"
            >
              {{ getChannelIcon(channel.type) }} {{ channel.name }}
            </option>
          </optgroup>
        </template>
        
        <!-- Simple list if not grouping by category -->
        <template v-else>
          <option 
            v-for="channel in filteredChannels" 
            :key="channel.id" 
            :value="channel.id"
          >
            {{ getChannelIcon(channel.type) }} {{ channel.name }}
          </option>
        </template>
      </select>
      
      <!-- Loading spinner -->
      <div v-if="loading" class="absolute right-3 top-1/2 transform -translate-y-1/2">
        <div class="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
      
      <!-- Dropdown arrow -->
      <div v-else class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
    
    <!-- Error state -->
    <div v-if="error" class="mt-1 text-red-400 text-sm">
      {{ error }}
    </div>
    
    <!-- Help text -->
    <div v-if="helpText" class="mt-1 text-gray-500 text-xs">
      {{ helpText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import api from '../../utils/axios'
import { useAuthStore } from '../../stores/auth'

interface Channel {
  id: string
  name: string
  type: 'text' | 'voice' | 'category' | 'forum'
  position: number
  parentId?: string
}

interface Props {
  modelValue: string
  guildId: string
  channelType?: 'text' | 'voice' | 'category' | 'thread' | 'all' | 'forum'
  groupByCategory?: boolean
  label?: string
  placeholder?: string
  helpText?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  channelType: 'all',
  groupByCategory: true,
  placeholder: 'Sélectionnez un canal'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const authStore = useAuthStore()

const loading = ref(true)
const error = ref('')
const channels = ref<Channel[]>([])
const categories = ref<Channel[]>([])

const filteredChannels = computed(() => {
  if (props.channelType === 'all') {
    return [...categories.value, ...channels.value]
  } else if (props.channelType === 'category') {
    return categories.value
  }
  return channels.value.filter(channel => channel.type === props.channelType)
})

const channelsWithoutCategory = computed(() => {
  return filteredChannels.value.filter(channel => !channel.parentId)
})

const getChannelsInCategory = (categoryId: string) => {
  return filteredChannels.value.filter(channel => channel.parentId === categoryId)
}

const getChannelIcon = (type: string) => {
  switch (type) {
    case 'text': return '#'
    case 'voice': return '🔊'
    case 'category': return '📁'
    case 'forum': return '📋'
    default: return '#'
  }
}

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}

const loadChannels = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const response = await api.get(`/api/guilds/${props.guildId}/channels`)
    
    const data = response.data
    
    // Extract channels based on the requested type
    let extractedChannels = []
    
    if (props.channelType === 'text') {
      extractedChannels = data.textChannels || []
    } else if (props.channelType === 'voice') {
      extractedChannels = data.voiceChannels || []
    } else if (props.channelType === 'forum') {
      extractedChannels = data.forumChannels || []
    } else if (props.channelType === 'category') {
      extractedChannels = data.categories || []
    } else {
      // 'all' or default - get all channels except categories
      extractedChannels = data.channels?.filter((ch: Channel) => ch.type !== 'category') || []
    }
    
    channels.value = extractedChannels
    categories.value = data.categories || []
  } catch (err) {
    console.error('Error loading channels:', err)
    error.value = 'Impossible de charger les canaux'
  } finally {
    loading.value = false
  }
}

// Watch for guildId changes
watch(() => props.guildId, (newGuildId) => {
  if (newGuildId) {
    loadChannels()
  }
}, { immediate: true })

onMounted(() => {
  if (props.guildId) {
    loadChannels()
  }
})
</script>