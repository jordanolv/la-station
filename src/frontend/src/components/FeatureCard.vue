<template>
  <div class="feature-card frosted-glass">
    <div class="feature-card-header">
      <h3 class="feature-name">{{ feature.name }}</h3>
      <span :class="['feature-status-badge', feature.enabled ? 'enabled' : 'disabled']">
        {{ feature.enabled ? 'Activé' : 'Désactivé' }}
      </span>
    </div>
    <p v-if="feature.description" class="feature-description">{{ feature.description }}</p>
    
    <!-- Temporarily removed config display to isolate linter error -->
    <!-- 
    <div v-if="feature.config && Object.keys(feature.config).length > 1" class="feature-config-details">
      <h4>Configuration:</h4>
      <ul>
        <li v-for="(value, key) in getConfigEntries(feature.config)" :key="key">
          <span class="config-key">{{ formatConfigKey(key) }}:</span> 
          <span class="config-value">{{ String(value) }}</span>
        </li>
      </ul>
    </div>
    -->
  </div>
</template>

<script setup lang="ts">
import { Feature } from '../types/server.types';

// import { computed } from 'vue'; // No longer needed if getConfigEntries is removed



const props = defineProps<{ feature: Feature }>();

// Temporarily removed unused helper functions
// const getConfigEntries = (config: FeatureConfigValue | undefined) => {
//   if (!config) return [];
//   return Object.entries(config).filter(([key]) => key !== 'enabled');
// };

// const formatConfigKey = (key: string) => {
//   const result = key.replace(/([A-Z])/g, ' $1');
//   return result.charAt(0).toUpperCase() + result.slice(1);
// };
</script>

<style scoped>
.feature-card {
  padding: var(--padding-base);
  display: flex;
  flex-direction: column;
  gap: var(--padding-small);
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-strong);
}

.feature-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--padding-small);
}

.feature-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.feature-status-badge {
  padding: 0.25em 0.6em;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.feature-status-badge.enabled {
  background-color: rgba(76, 175, 80, 0.2); /* Greenish with alpha */
  color: #4CAF50; /* Green */
}

.feature-status-badge.disabled {
  background-color: rgba(244, 67, 54, 0.2); /* Reddish with alpha */
  color: #f44336; /* Red */
}

.feature-description {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--padding-small);
  line-height: 1.5;
}

.feature-config-details {
  margin-top: var(--padding-small);
  font-size: 0.85rem;
}

.feature-config-details h4 {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.feature-config-details ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.feature-config-details li {
  display: flex;
  justify-content: space-between;
}

.config-key {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.config-value {
  color: var(--color-text-primary);
  max-width: 60%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/*
.feature-toggle-button {
  margin-top: auto; 
  padding: var(--padding-small) var(--padding-base);
  background-color: var(--color-accent);
  color: var(--color-text-primary);
  border: none;
  border-radius: var(--border-radius-base);
  cursor: pointer;
  font-weight: 500;
  text-align: center;
  transition: background-color 0.2s ease;
}

.feature-toggle-button:hover {
  background-color: color-mix(in srgb, var(--color-accent), #000 10%);
}
*/
</style> 