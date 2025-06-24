<template>
  <div class="leveling pl-64 pt-6 min-h-screen bg-[#23272A] text-white">
    <div class="px-8 py-6">
      <!-- Header Section -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold">Levels</h1>
          <p class="text-gray-400 mt-1">Give your members XP and Levels when they send messages and rank them by activity in a leaderboard</p>
        </div>
        <div class="flex items-center">
          <span class="mr-3 text-sm">Active</span>
          <button class="w-12 h-6 rounded-full bg-indigo-600 relative">
            <span class="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></span>
          </button>
        </div>
      </div>

      <!-- Leveling Up Section -->
      <div class="bg-[#2A2D31] rounded-lg shadow-lg p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">Leveling Up</h2>
          <button class="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <p class="text-gray-400 mb-4">Whenever the user gains a level, La Station can send a personalized message.</p>
        
        <div class="mb-6">
          <h3 class="text-sm text-gray-400 mb-2">Level up announcement</h3>
          <div class="relative">
            <select class="w-full px-4 py-2 bg-[#1E2124] rounded-md appearance-none pr-8 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Current Channel</option>
              <option>DM User</option>
              <option>Specific Channel</option>
              <option>Disabled</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>
        
        <div>
          <h3 class="text-sm text-gray-400 mb-2">Level Up Announcement Message</h3>
          <div class="bg-[#1E2124] p-4 rounded-lg">
            <div class="flex items-center space-x-2">
              <span class="font-medium">GG</span>
              <div class="bg-[#2A2D31] text-sm px-2 py-1 rounded">
                [player]
              </div>
              <span>you just advanced to level</span>
              <div class="bg-[#2A2D31] text-sm px-2 py-1 rounded">
                [level]
              </div>
              <span>!</span>
            </div>
            <div class="mt-4 text-right text-xs text-gray-400">
              48 / 2000
            </div>
          </div>
        </div>
      </div>

      <!-- Role Rewards Section -->
      <div class="bg-[#2A2D31] rounded-lg shadow-lg p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center">
            <h2 class="text-lg font-semibold">Role rewards configuration</h2>
            <div class="ml-2 text-yellow-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          <button class="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        <!-- Empty state for role rewards -->
        <div class="py-12 flex flex-col items-center justify-center">
          <div class="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p class="text-gray-400 text-center">You haven't created any role rewards yet</p>
          <button class="mt-4 px-4 py-2 bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors">
            Add Role Reward
          </button>
        </div>
      </div>

      <!-- XP Settings Section -->
      <div class="bg-[#2A2D31] rounded-lg shadow-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">XP Settings</h2>
          <button class="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        <div class="space-y-6">
          <!-- XP per message -->
          <div>
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-sm text-gray-400">XP per message</h3>
              <span class="text-white">15-25 XP</span>
            </div>
            <div class="h-2 bg-[#1E2124] rounded-full">
              <div class="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 w-2/3"></div>
            </div>
          </div>
          
          <!-- Cooldown -->
          <div>
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-sm text-gray-400">Cooldown</h3>
              <span class="text-white">60 seconds</span>
            </div>
            <div class="h-2 bg-[#1E2124] rounded-full">
              <div class="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 w-1/2"></div>
            </div>
          </div>
          
          <!-- Excluded channels -->
          <div>
            <h3 class="text-sm text-gray-400 mb-2">Excluded channels</h3>
            <div class="relative">
              <div class="w-full px-4 py-2 bg-[#1E2124] rounded-md text-white flex items-center justify-between">
                <span class="text-gray-400">None</span>
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>
          
          <!-- Excluded roles -->
          <div>
            <h3 class="text-sm text-gray-400 mb-2">Excluded roles</h3>
            <div class="relative">
              <div class="w-full px-4 py-2 bg-[#1E2124] rounded-md text-white flex items-center justify-between">
                <span class="text-gray-400">None</span>
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
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