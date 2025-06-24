import { ref, onMounted } from 'vue'
import { useApi } from './useApi'

export function useFeatureSettings<T extends Record<string, any>>(
  guildId: string,
  featureId: string,
  initialSettings: T
) {
  const { get, put, loading, error } = useApi()
  
  const settings = ref<T>({ ...initialSettings })
  const isSaving = ref(false)
  const showSuccessMessage = ref(false)

  const loadSettings = async () => {
    try {
      const response = await get<{ settings: T }>(
        `/api/guilds/${guildId}/features/${featureId}/settings`
      )
      
      if (response.settings) {
        settings.value = { ...initialSettings, ...response.settings }
      }
    } catch (err) {
      console.error(`Error loading ${featureId} settings:`, err)
    }
  }

  const saveSettings = async (customSettings?: Partial<T>) => {
    try {
      isSaving.value = true
      
      const payload = customSettings || settings.value
      
      await put(
        `/api/guilds/${guildId}/features/${featureId}/settings`,
        payload
      )
      
      showSuccessMessage.value = true
      setTimeout(() => {
        showSuccessMessage.value = false
      }, 3000)
      
      return true
    } catch (err) {
      console.error(`Error saving ${featureId} settings:`, err)
      return false
    } finally {
      isSaving.value = false
    }
  }

  const resetToDefaults = () => {
    settings.value = { ...initialSettings }
  }

  onMounted(() => {
    loadSettings()
  })

  return {
    settings,
    loading,
    error,
    isSaving,
    showSuccessMessage,
    loadSettings,
    saveSettings,
    resetToDefaults
  }
}