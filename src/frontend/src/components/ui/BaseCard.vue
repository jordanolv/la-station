<template>
  <div :class="cardClasses">
    <div v-if="$slots.header" class="px-6 py-4 border-b border-gray-600">
      <slot name="header" />
    </div>
    
    <div :class="contentClasses">
      <slot />
    </div>
    
    <div v-if="$slots.footer" class="px-6 py-4 border-t border-gray-600">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'default' | 'elevated' | 'outlined'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md',
  hover: false
})

const cardClasses = computed(() => {
  const baseClasses = 'bg-gray-800 rounded-lg overflow-hidden'
  
  const variantClasses = {
    default: '',
    elevated: 'shadow-lg',
    outlined: 'border border-gray-600'
  }
  
  const hoverClass = props.hover ? 'hover:bg-gray-700 transition-colors cursor-pointer' : ''
  
  return [baseClasses, variantClasses[props.variant], hoverClass].filter(Boolean).join(' ')
})

const contentClasses = computed(() => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
  
  return paddingClasses[props.padding]
})
</script>