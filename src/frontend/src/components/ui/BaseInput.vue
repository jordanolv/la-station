<template>
  <div class="space-y-1">
    <label v-if="label" :for="inputId" class="block text-sm font-medium text-gray-300">
      {{ label }}
      <span v-if="required" class="text-red-400">*</span>
    </label>
    
    <div class="relative">
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :class="inputClasses"
        @input="handleInput"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />
      
      <div v-if="$slots.icon" class="absolute right-3 top-1/2 transform -translate-y-1/2">
        <slot name="icon" />
      </div>
    </div>
    
    <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>
    <p v-else-if="helpText" class="text-gray-500 text-sm">{{ helpText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel'
  label?: string
  placeholder?: string
  helpText?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const inputId = computed(() => Math.random().toString(36).substr(2, 9))

const inputClasses = computed(() => {
  const baseClasses = 'w-full bg-gray-700 border rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const borderClass = props.error 
    ? 'border-red-500 focus:border-red-500' 
    : 'border-gray-600 focus:border-purple-500'
  
  return [baseClasses, borderClass].join(' ')
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
}
</script>