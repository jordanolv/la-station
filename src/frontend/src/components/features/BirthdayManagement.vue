<template>
  <div>
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-white mb-2">🎂 Anniversaires</h2>
      <p class="text-muted">
        Configurez les notifications d'anniversaires automatiques pour les membres de votre serveur.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      <p class="text-muted mt-2">Chargement des paramètres...</p>
    </div>

    <!-- Settings Form -->
    <div v-else class="space-y-6">
      <!-- Channel Configuration -->
      <div class="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-medium text-white">Canal d'anniversaires</h3>
            <p class="text-muted text-sm">Choisissez où envoyer les notifications d'anniversaires</p>
          </div>
        </div>
        
        <div class="space-y-6">
          <div>
            <ChannelSelect
              v-model="settings.channel"
              :guild-id="guildId"
              channel-type="text"
              label="Canal d'anniversaires"
              placeholder="Sélectionnez un canal"
              help-text="Canal où seront envoyées les notifications d'anniversaires"
            />
          </div>

          <!-- Preview -->
          <div v-if="settings.channel" class="bg-background border border-border rounded-lg p-4">
            <h4 class="text-sm font-medium text-muted mb-3 uppercase tracking-wider">Aperçu de notification</h4>
            <div class="bg-[#2B2D31] border-l-4 border-[#5865F2] p-3 rounded">
              <div class="flex items-start space-x-3">
                <div class="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-xl">🎂</div>
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium text-white">The Ridge Bot</span>
                    <span class="bg-[#5865F2] text-white text-[10px] px-1 rounded">BOT</span>
                  </div>
                  <p class="text-gray-100">Joyeux anniversaire !</p>
                  <p class="text-gray-300 text-sm mt-1">Aujourd'hui, nous célébrons l'anniversaire de <span class="bg-[#5865F2]/30 text-[#5865F2] px-1 rounded hover:bg-[#5865F2]/50 cursor-pointer transition-colors">@MemberName</span> ! 🎉</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- How it works -->
      <div class="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <h3 class="text-lg font-medium text-white mb-4">Comment ça fonctionne</h3>
        <div class="space-y-4">
          <div class="flex items-start space-x-4">
            <div class="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 border border-white/10">
              <span class="text-white font-bold">1</span>
            </div>
            <div>
              <p class="font-medium text-white">Les membres définissent leur anniversaire</p>
              <p class="text-muted text-sm mt-1">Ils utilisent la commande <code class="bg-background border border-border px-1.5 py-0.5 rounded text-xs font-mono">/birthday</code> pour enregistrer leur date</p>
            </div>
          </div>
          
          <div class="flex items-start space-x-4">
            <div class="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 border border-white/10">
              <span class="text-white font-bold">2</span>
            </div>
            <div>
              <p class="font-medium text-white">Vérification automatique</p>
              <p class="text-muted text-sm mt-1">Le bot vérifie chaque jour à minuit (heure de Paris) les anniversaires</p>
            </div>
          </div>
          
          <div class="flex items-start space-x-4">
            <div class="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 border border-white/10">
              <span class="text-white font-bold">3</span>
            </div>
            <div>
              <p class="font-medium text-white">Notification envoyée</p>
              <p class="text-muted text-sm mt-1">Un message de félicitations est envoyé dans le canal configuré</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Warning if no channel -->
      <div v-if="!settings.channel" class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
        <div class="flex items-start space-x-3">
          <svg class="w-5 h-5 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p class="text-amber-500 font-medium">Aucun canal configuré</p>
            <p class="text-amber-500/80 text-sm">
              Sans canal configuré, les notifications d'anniversaires ne seront pas envoyées.
            </p>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end items-center gap-4">
        <div v-if="showSuccessMessage" class="text-emerald-500 text-sm flex items-center gap-2 animate-fade-in">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Paramètres sauvegardés
        </div>

        <button 
          @click="saveSettings"
          :disabled="isSaving"
          class="bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 font-medium"
        >
          <svg v-if="isSaving" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{{ isSaving ? 'Sauvegarde...' : 'Sauvegarder' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../utils/axios'
import { useAuthStore } from '../../stores/auth'
import ChannelSelect from '../ui/ChannelSelect.vue'

interface Props {
  guildId: string
}

const props = defineProps<Props>()
const authStore = useAuthStore()


const isLoading = ref(true)
const isSaving = ref(false)
const showSuccessMessage = ref(false)

const settings = ref({
  channel: ''
})

const loadSettings = async () => {
  try {
    isLoading.value = true
    const response = await api.get(`/api/guilds/${props.guildId}/features/birthday/settings`)
    
    if (response.data.settings) {
      settings.value = {
        channel: response.data.settings.channel || ''
      }
    }
  } catch (error) {
    console.error('Error loading birthday settings:', error)
  } finally {
    isLoading.value = false
  }
}

const saveSettings = async () => {
  try {
    isSaving.value = true
    
    const payload = {
      channel: settings.value.channel
    }
    
    await api.put(`/api/guilds/${props.guildId}/features/birthday/settings`, payload, {
      headers: {
                'Content-Type': 'application/json'
      }
    })
    
    showSuccessMessage.value = true
    setTimeout(() => {
      showSuccessMessage.value = false
    }, 3000)
  } catch (error) {
    console.error('Error saving birthday settings:', error)
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>