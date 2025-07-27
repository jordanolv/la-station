<template>
  <div class="dashboard pl-64 pt-6 min-h-screen bg-[#23272A] text-white">
    <div class="px-8 py-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <div class="flex space-x-2">
          <button class="px-4 py-2 bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors">Refresh</button>
          <button class="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">Export</button>
        </div>
      </div>

      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div v-for="(stat, index) in stats" :key="index" class="bg-[#2A2D31] p-4 rounded-lg shadow-lg">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-gray-400 text-sm">{{ stat.title }}</p>
              <p class="text-2xl font-bold mt-1">{{ stat.value }}</p>
            </div>
            <div :class="`w-10 h-10 rounded-md flex items-center justify-center ${stat.iconBg}`">
              <component :is="stat.icon" class="w-6 h-6 text-white" />
            </div>
          </div>
          <div class="mt-4 flex items-center">
            <span :class="`text-sm font-medium ${stat.trend > 0 ? 'text-green-500' : 'text-red-500'}`">
              {{ stat.trend > 0 ? '+' : '' }}{{ stat.trend }}% 
            </span>
            <span class="text-gray-400 text-sm ml-2">depuis la semaine dernière</span>
          </div>
        </div>
      </div>

      <!-- Activity and Leveling -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- Activity Chart -->
        <div class="bg-[#2A2D31] p-4 rounded-lg shadow-lg lg:col-span-2">
          <h2 class="text-lg font-semibold mb-4">Activité du serveur</h2>
          <div class="h-64 flex items-center justify-center">
            <div class="w-full h-full relative">
              <!-- Placeholder for a chart - in a real app, you'd use a chart library -->
              <div class="absolute inset-0 flex items-end justify-between px-2">
                <div v-for="(day, i) in ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']" :key="i" class="w-1/7 flex flex-col items-center">
                  <div 
                    :style="`height: ${Math.random() * 70 + 10}%`" 
                    class="w-full max-w-[30px] bg-gradient-to-t from-indigo-600 to-purple-600 rounded-t-md"
                  ></div>
                  <span class="text-xs text-gray-400 mt-2">{{ day }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Users -->
        <div class="bg-[#2A2D31] p-4 rounded-lg shadow-lg">
          <h2 class="text-lg font-semibold mb-4">Top Utilisateurs</h2>
          <div class="space-y-4">
            <div v-for="(user, index) in topUsers" :key="index" class="flex items-center">
              <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold mr-3">
                {{ index + 1 }}
              </div>
              <div class="flex-1">
                <p class="font-medium">{{ user.name }}</p>
                <div class="w-full bg-gray-700 rounded-full h-2">
                  <div class="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full" :style="`width: ${user.progress}%`"></div>
                </div>
              </div>
              <div class="ml-3">
                <p class="font-bold">Lvl {{ user.level }}</p>
                <p class="text-xs text-gray-400 text-right">{{ user.xp }} XP</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-[#2A2D31] p-4 rounded-lg shadow-lg">
        <h2 class="text-lg font-semibold mb-4">Activité récente</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-gray-700">
                <th class="py-3 px-4 text-left text-sm font-medium text-gray-400">Utilisateur</th>
                <th class="py-3 px-4 text-left text-sm font-medium text-gray-400">Action</th>
                <th class="py-3 px-4 text-left text-sm font-medium text-gray-400">Canal</th>
                <th class="py-3 px-4 text-left text-sm font-medium text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(activity, index) in recentActivity" :key="index" class="border-b border-gray-700">
                <td class="py-3 px-4">
                  <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full bg-gray-700 mr-3"></div>
                    <span>{{ activity.user }}</span>
                  </div>
                </td>
                <td class="py-3 px-4">{{ activity.action }}</td>
                <td class="py-3 px-4"># {{ activity.channel }}</td>
                <td class="py-3 px-4 text-gray-400">{{ activity.date }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

// Stats cards data
const stats = [
  {
    title: 'Total des membres',
    value: '1,482',
    trend: 12.5,
    icon: 'svg-users',
    iconBg: 'bg-blue-600'
  },
  {
    title: 'Messages aujourd\'hui',
    value: '642',
    trend: -2.3,
    icon: 'svg-messages',
    iconBg: 'bg-green-600'
  },
  {
    title: 'Temps vocal (h)',
    value: '28.5',
    trend: 8.1,
    icon: 'svg-voice',
    iconBg: 'bg-purple-600'
  },
  {
    title: 'Nouveaux membres',
    value: '24',
    trend: 14.6,
    icon: 'svg-new-users',
    iconBg: 'bg-orange-600'
  }
]

// Top users
const topUsers = [
  { name: 'MaxiKing', level: 42, xp: '12,450', progress: 85 },
  { name: 'SkyWalker', level: 36, xp: '10,872', progress: 70 },
  { name: 'NightOwl', level: 31, xp: '9,345', progress: 65 },
  { name: 'Tsunami', level: 28, xp: '8,210', progress: 60 },
  { name: 'Thunderbolt', level: 25, xp: '7,590', progress: 50 }
]

// Recent activity
const recentActivity = [
  { user: 'MaxiKing', action: 'a envoyé un message', channel: 'général', date: 'Il y a 5 minutes' },
  { user: 'SkyWalker', action: 'a rejoint le vocal', channel: 'Musique', date: 'Il y a 12 minutes' },
  { user: 'NightOwl', action: 'a ajouté une réaction', channel: 'memes', date: 'Il y a 34 minutes' },
  { user: 'Tsunami', action: 'a répondu à un fil', channel: 'help', date: 'Il y a 1 heure' },
  { user: 'Thunderbolt', action: 'a créé un événement', channel: 'événements', date: 'Il y a 3 heures' }
]

</script> 