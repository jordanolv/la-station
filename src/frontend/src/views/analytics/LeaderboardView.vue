<template>
  <div class="leaderboard pl-64 pt-6 min-h-screen bg-[#23272A] text-white">
    <div class="px-8 py-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Leaderboard</h1>
        <div class="flex space-x-2">
          <button class="px-4 py-2 bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors">Refresh</button>
          <div class="relative">
            <select class="px-4 py-2 bg-gray-700 rounded-md appearance-none pr-8 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Tous les temps</option>
              <option>Cette semaine</option>
              <option>Ce mois</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Leaderboard Table -->
      <div class="bg-[#2A2D31] rounded-lg shadow-lg overflow-hidden">
        <table class="min-w-full">
          <thead>
            <tr class="bg-[#32353B] text-left">
              <th class="py-4 px-6 text-gray-300 font-semibold w-16 text-center">#</th>
              <th class="py-4 px-6 text-gray-300 font-semibold">Utilisateur</th>
              <th class="py-4 px-6 text-gray-300 font-semibold">Messages</th>
              <th class="py-4 px-6 text-gray-300 font-semibold">Temps vocal</th>
              <th class="py-4 px-6 text-gray-300 font-semibold">Niveau</th>
              <th class="py-4 px-6 text-gray-300 font-semibold text-right">XP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(user, index) in leaderboardUsers" :key="index" class="border-b border-gray-700 hover:bg-[#32353B] transition-colors">
              <td class="py-4 px-6 text-center">
                <div class="w-8 h-8 rounded-full flex items-center justify-center mx-auto" :class="getRankClass(index)">
                  {{ index + 1 }}
                </div>
              </td>
              <td class="py-4 px-6">
                <div class="flex items-center">
                  <div class="w-10 h-10 rounded-full bg-gray-700 mr-3"></div>
                  <div>
                    <div class="font-medium">{{ user.name }}</div>
                    <div class="text-gray-400 text-sm">{{ user.tag }}</div>
                  </div>
                </div>
              </td>
              <td class="py-4 px-6">{{ user.messages }}</td>
              <td class="py-4 px-6">{{ user.voiceTime }}</td>
              <td class="py-4 px-6">
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center mr-2">
                    {{ user.level }}
                  </div>
                  <div class="w-full max-w-[100px] bg-gray-700 rounded-full h-2">
                    <div class="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full" :style="`width: ${user.progress}%`"></div>
                  </div>
                </div>
              </td>
              <td class="py-4 px-6 text-right font-bold">{{ user.xp }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex justify-between items-center mt-6">
        <div class="text-gray-400">Showing 1-10 of 100 users</div>
        <div class="flex space-x-1">
          <button class="w-10 h-10 rounded-md flex items-center justify-center bg-gray-700 text-white hover:bg-gray-600 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <button class="w-10 h-10 rounded-md flex items-center justify-center bg-indigo-600 text-white">1</button>
          <button class="w-10 h-10 rounded-md flex items-center justify-center bg-gray-700 text-white hover:bg-gray-600 transition-colors">2</button>
          <button class="w-10 h-10 rounded-md flex items-center justify-center bg-gray-700 text-white hover:bg-gray-600 transition-colors">3</button>
          <button class="w-10 h-10 rounded-md flex items-center justify-center bg-gray-700 text-white hover:bg-gray-600 transition-colors">...</button>
          <button class="w-10 h-10 rounded-md flex items-center justify-center bg-gray-700 text-white hover:bg-gray-600 transition-colors">10</button>
          <button class="w-10 h-10 rounded-md flex items-center justify-center bg-gray-700 text-white hover:bg-gray-600 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

// Données du leaderboard (simulées)
const leaderboardUsers = [
  { name: 'MaxiKing', tag: '@maxiking', level: 42, xp: '12,450 XP', messages: '1,245', voiceTime: '32h 45m', progress: 85 },
  { name: 'SkyWalker', tag: '@skywalker', level: 36, xp: '10,872 XP', messages: '983', voiceTime: '28h 12m', progress: 70 },
  { name: 'NightOwl', tag: '@nightowl', level: 31, xp: '9,345 XP', messages: '876', voiceTime: '22h 30m', progress: 65 },
  { name: 'Tsunami', tag: '@tsunami', level: 28, xp: '8,210 XP', messages: '740', voiceTime: '18h 15m', progress: 60 },
  { name: 'Thunderbolt', tag: '@thunderbolt', level: 25, xp: '7,590 XP', messages: '695', voiceTime: '15h 40m', progress: 50 },
  { name: 'DarkKnight', tag: '@darkknight', level: 23, xp: '6,830 XP', messages: '628', voiceTime: '14h 05m', progress: 45 },
  { name: 'FireFox', tag: '@firefox', level: 21, xp: '6,250 XP', messages: '542', voiceTime: '12h 30m', progress: 40 },
  { name: 'IceQueen', tag: '@icequeen', level: 19, xp: '5,680 XP', messages: '498', voiceTime: '11h 15m', progress: 35 },
  { name: 'ShadowHunter', tag: '@shadowhunter', level: 17, xp: '5,120 XP', messages: '463', voiceTime: '9h 50m', progress: 30 },
  { name: 'StarLord', tag: '@starlord', level: 15, xp: '4,590 XP', messages: '412', voiceTime: '8h 25m', progress: 25 }
]

// Classes pour les rangs (couleurs différentes pour le top 3)
const getRankClass = (index: number) => {
  if (index === 0) return 'bg-yellow-500 text-white font-bold'
  if (index === 1) return 'bg-gray-400 text-white font-bold'
  if (index === 2) return 'bg-amber-700 text-white font-bold'
  return 'bg-gray-700 text-white'
}
</script> 