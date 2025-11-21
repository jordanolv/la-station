import { defineStore } from 'pinia'
import api from '../utils/axios'

export interface GuildFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export const useGuildStore = defineStore('guild', {
  state: () => ({
    currentGuildId: null as string | null,
    features: [] as GuildFeature[],
    loading: false,
    error: null as string | null
  }),

  getters: {
    getFeatureById: (state) => (id: string) => state.features.find(f => f.id === id),
    isEnabled: (state) => (id: string) => state.features.find(f => f.id === id)?.enabled || false
  },

  actions: {
    async fetchFeatures(guildId: string) {
      if (this.currentGuildId === guildId && this.features.length > 0) return;
      
      this.currentGuildId = guildId;
      this.loading = true;
      this.error = null;
      
      try {
        const response = await api.get(`/api/guilds/${guildId}/features`);
        this.features = response.data.features;
      } catch (error) {
        console.error('Failed to fetch guild features:', error);
        this.error = 'Failed to load features';
        this.features = [];
      } finally {
        this.loading = false;
      }
    },

    async toggleFeature(guildId: string, featureId: string, enabled: boolean) {
      // Optimistic update
      const featureIndex = this.features.findIndex(f => f.id === featureId);
      if (featureIndex !== -1) {
        this.features[featureIndex].enabled = enabled;
      }

      try {
        await api.post(`/api/guilds/${guildId}/features/${featureId}/toggle`, {
          enabled
        });
      } catch (error) {
        console.error('Failed to toggle feature:', error);
        // Revert on error
        if (featureIndex !== -1) {
          this.features[featureIndex].enabled = !enabled;
        }
        throw error;
      }
    },

    clearCurrentGuild() {
      this.currentGuildId = null;
      this.features = [];
    }
  }
})
