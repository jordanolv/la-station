<template>
  <div :class="containerClasses">
    <div :class="spinnerClasses"></div>
    <p v-if="text" :class="textClasses">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  center?: boolean
  fullScreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  center: false,
  fullScreen: false
})

const containerClasses = computed(() => {
  const baseClasses = 'flex flex-col items-center'
  
  if (props.fullScreen) {
    return [baseClasses, 'fixed inset-0 bg-gray-900 bg-opacity-75 z-50 justify-center'].join(' ')
  }
  
  if (props.center) {
    return [baseClasses, 'py-8 justify-center'].join(' ')
  }
  
  return baseClasses
})

const spinnerClasses = computed(() => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-4'
  }
  
  return [
    'border-purple-500 border-t-transparent rounded-full animate-spin',
    sizeClasses[props.size]
  ].join(' ')
})

const textClasses = computed(() => {
  const sizeClasses = {
    sm: 'text-sm mt-1',
    md: 'text-sm mt-2',
    lg: 'text-base mt-2',
    xl: 'text-lg mt-3'
  }
  
  return ['text-gray-400', sizeClasses[props.size]].join(' ')
})
</script>