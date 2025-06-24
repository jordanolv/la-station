<template>
  <div :class="alertClasses">
    <div class="flex items-start space-x-3">
      <component :is="iconComponent" class="w-5 h-5 mt-0.5 flex-shrink-0" />
      <div class="flex-1">
        <p v-if="title" class="font-medium">{{ title }}</p>
        <p :class="messageClasses">
          <slot>{{ message }}</slot>
        </p>
      </div>
      <button 
        v-if="closable" 
        @click="$emit('close')"
        class="flex-shrink-0 hover:opacity-75 transition-opacity"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message?: string
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
  closable: false
})

defineEmits<{
  close: []
}>()

const alertClasses = computed(() => {
  const baseClasses = 'rounded-lg p-4 border'
  
  const variantClasses = {
    info: 'bg-blue-600 bg-opacity-20 border-blue-600 text-blue-100',
    success: 'bg-green-600 bg-opacity-20 border-green-600 text-green-100',
    warning: 'bg-yellow-600 bg-opacity-20 border-yellow-600 text-yellow-100',
    error: 'bg-red-600 bg-opacity-20 border-red-600 text-red-100'
  }
  
  return [baseClasses, variantClasses[props.variant]].join(' ')
})

const messageClasses = computed(() => {
  return props.title ? 'text-sm mt-1' : ''
})

const iconComponent = computed(() => {
  const icons = {
    info: 'InfoIcon',
    success: 'CheckIcon',
    warning: 'WarningIcon',
    error: 'ErrorIcon'
  }
  
  return icons[props.variant]
})
</script>

<script>
// Icon components as simple SVGs
const InfoIcon = {
  template: `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  `
}

const CheckIcon = {
  template: `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>
  `
}

const WarningIcon = {
  template: `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  `
}

const ErrorIcon = {
  template: `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  `
}

export { InfoIcon, CheckIcon, WarningIcon, ErrorIcon }
</script>