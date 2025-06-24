<template>
  <div class="settings pl-64 pt-6 min-h-screen bg-[#23272A] text-white">
    <div class="px-8 py-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Settings</h1>
        <button class="px-4 py-2 bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors">
          Save Changes
        </button>
      </div>
      
      <!-- Settings Sections -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- General Settings -->
        <div class="bg-[#2A2D31] rounded-lg shadow-lg p-6 lg:col-span-2">
          <h2 class="text-lg font-semibold mb-4">General Settings</h2>
          
          <div class="space-y-6">
            <div>
              <label class="block text-sm text-gray-400 mb-2">Bot Prefix</label>
              <input 
                type="text" 
                value="!" 
                class="w-full px-4 py-2 bg-[#1E2124] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p class="mt-1 text-xs text-gray-500">Commands will start with this prefix</p>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">Language</label>
              <div class="relative">
                <select class="w-full px-4 py-2 bg-[#1E2124] rounded-md appearance-none pr-8 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option>English</option>
                  <option>Français</option>
                  <option>Español</option>
                  <option>Deutsch</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">Timezone</label>
              <div class="relative">
                <select class="w-full px-4 py-2 bg-[#1E2124] rounded-md appearance-none pr-8 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option>UTC</option>
                  <option>Europe/Paris</option>
                  <option>America/New_York</option>
                  <option>Asia/Tokyo</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium">Delete Commands</h3>
                <p class="text-sm text-gray-400">Automatically delete command messages</p>
              </div>
              <div class="flex items-center">
                <button class="w-12 h-6 rounded-full bg-indigo-600 relative">
                  <span class="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></span>
                </button>
              </div>
            </div>
            
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium">Debug Mode</h3>
                <p class="text-sm text-gray-400">Enable detailed error messages</p>
              </div>
              <div class="flex items-center">
                <button class="w-12 h-6 rounded-full bg-gray-700 relative">
                  <span class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Logs Settings -->
        <div class="bg-[#2A2D31] rounded-lg shadow-lg p-6">
          <h2 class="text-lg font-semibold mb-4">Logs</h2>
          
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium">Enable Logs</h3>
                <p class="text-sm text-gray-400">Send bot activity to a channel</p>
              </div>
              <div class="flex items-center">
                <button class="w-12 h-6 rounded-full bg-indigo-600 relative">
                  <span class="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></span>
                </button>
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">Log Channel</label>
              <div class="relative">
                <select class="w-full px-4 py-2 bg-[#1E2124] rounded-md appearance-none pr-8 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option>Select a channel</option>
                  <option>#logs</option>
                  <option>#bot-logs</option>
                  <option>#general</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <div>
              <h3 class="text-sm text-gray-400 mb-2">Log Events</h3>
              <div class="space-y-2">
                <div class="flex items-center">
                  <input type="checkbox" checked class="h-4 w-4 rounded bg-[#1E2124] border-gray-700 text-indigo-600 focus:ring-indigo-500" />
                  <label class="ml-2 text-sm">Member Joins/Leaves</label>
                </div>
                <div class="flex items-center">
                  <input type="checkbox" checked class="h-4 w-4 rounded bg-[#1E2124] border-gray-700 text-indigo-600 focus:ring-indigo-500" />
                  <label class="ml-2 text-sm">Message Edits/Deletes</label>
                </div>
                <div class="flex items-center">
                  <input type="checkbox" checked class="h-4 w-4 rounded bg-[#1E2124] border-gray-700 text-indigo-600 focus:ring-indigo-500" />
                  <label class="ml-2 text-sm">Channel Updates</label>
                </div>
                <div class="flex items-center">
                  <input type="checkbox" class="h-4 w-4 rounded bg-[#1E2124] border-gray-700 text-indigo-600 focus:ring-indigo-500" />
                  <label class="ml-2 text-sm">Role Updates</label>
                </div>
                <div class="flex items-center">
                  <input type="checkbox" checked class="h-4 w-4 rounded bg-[#1E2124] border-gray-700 text-indigo-600 focus:ring-indigo-500" />
                  <label class="ml-2 text-sm">Level Changes</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script> 