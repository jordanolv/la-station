import { ref, computed } from 'vue'
import { useApi } from './useApi'

export interface Channel {
  id: string
  name: string
  type: 'text' | 'voice' | 'category' | 'forum'
  position: number
  parentId?: string
}

export function useChannels(guildId: string) {
  const { get, loading, error } = useApi()
  
  const channels = ref<Channel[]>([])
  const categories = ref<Channel[]>([])

  const textChannels = computed(() => 
    channels.value.filter(ch => ch.type === 'text')
  )
  
  const voiceChannels = computed(() => 
    channels.value.filter(ch => ch.type === 'voice')
  )

  const forumChannels = computed(() => 
    channels.value.filter(ch => ch.type === 'forum')
  )

  const getChannelsInCategory = (categoryId: string) => {
    return channels.value.filter(ch => ch.parentId === categoryId)
  }

  const getChannelById = (channelId: string) => {
    return [...channels.value, ...categories.value].find(ch => ch.id === channelId)
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

  const loadChannels = async () => {
    try {
      const response = await get<{
        channels: Channel[]
        categories: Channel[]
        textChannels: Channel[]
        voiceChannels: Channel[]
        forumChannels: Channel[]
      }>(`/api/guilds/${guildId}/channels`)
      
      channels.value = response.channels?.filter(ch => ch.type !== 'category') || []
      categories.value = response.categories || []
    } catch (err) {
      console.error('Error loading channels:', err)
    }
  }

  return {
    channels,
    categories,
    textChannels,
    voiceChannels,
    forumChannels,
    loading,
    error,
    loadChannels,
    getChannelsInCategory,
    getChannelById,
    getChannelIcon
  }
}