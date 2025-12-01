<template>
  <div class="min-h-screen bg-background flex">
    <!-- Left Sidebar: Leaderboard -->
    <aside class="w-80 bg-surface border-r border-border flex flex-col h-screen sticky top-0">
      <!-- Header -->
      <div class="p-6 border-b border-border">
        <div class="flex items-center justify-between mb-2">
          <h1 class="text-2xl font-bold text-white">Leaderboard</h1>
          <div v-if="selectedUserIds.length > 0" class="flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" x2="19" y1="8" y2="14"/>
              <line x1="22" x2="16" y1="11" y2="11"/>
            </svg>
            {{ selectedUserIds.length === 2 ? 'VS Mode' : `${selectedUserIds.length} Selected` }}
          </div>
        </div>
        <p class="text-xs text-muted">{{ selectedUserIds.length === 0 ? 'Click on a user to see their stats' : selectedUserIds.length === 1 ? 'Click again to deselect, or select another for VS mode' : 'Click to deselect or change selection' }}</p>
      </div>

      <!-- Search -->
      <div class="px-4 py-3 border-b border-border">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search users..."
            class="w-full bg-background border border-border rounded-lg px-3 py-2 pl-9 text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
          />
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <div class="text-muted text-sm">Loading...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex-1 p-4">
        <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
          <p class="text-red-500 text-sm">{{ error }}</p>
        </div>
      </div>

      <!-- Leaderboard List -->
      <div v-else class="flex-1 overflow-y-auto">
        <div v-if="filteredLeaderboard.length === 0" class="p-6 text-center text-muted text-sm">
          No users found
        </div>
        <div v-else class="divide-y divide-border">
          <button
            v-for="(user, index) in filteredLeaderboard"
            :key="user.discordId"
            @click="selectUser(user.discordId)"
            class="w-full px-4 py-3 hover:bg-surface-hover transition-colors flex items-center gap-3 text-left relative"
            :class="{
              'bg-surface-hover': selectedUserIds.includes(user.discordId),
              'ring-2 ring-inset ring-accent': selectedUserIds.includes(user.discordId)
            }"
          >
            <!-- Selection Badge (if selected) -->
            <div
              v-if="selectedUserIds.includes(user.discordId)"
              class="absolute top-2 left-2 w-5 h-5 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center"
            >
              {{ selectedUserIds.indexOf(user.discordId) + 1 }}
            </div>

            <!-- Rank -->
            <div class="w-8 flex-shrink-0 text-center">
              <span v-if="index < 3" class="text-lg">
                {{ index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉' }}
              </span>
              <span v-else class="text-muted font-medium text-xs">{{ index + 1 }}</span>
            </div>

            <!-- User Info -->
            <div class="flex-1 min-w-0">
              <div class="text-white font-medium truncate text-sm">{{ user.name }}</div>
              <div class="text-xs text-muted flex items-center gap-2 mt-0.5">
                <span>Lvl {{ user.level }}</span>
                <span>•</span>
                <span>{{ user.exp }} XP</span>
              </div>
            </div>

            <!-- Value Badge -->
            <div
              :class="[
                'px-2 py-1 rounded text-xs font-semibold flex-shrink-0',
                index < 3 ? 'bg-accent/10 text-accent' : 'bg-background text-muted'
              ]"
            >
              {{ user.level }}
            </div>
          </button>
        </div>
      </div>

      <!-- Stats Summary -->
      <div v-if="stats && !loading" class="p-4 border-t border-border bg-surface/50">
        <div class="grid grid-cols-2 gap-3 text-center">
          <div>
            <div class="text-lg font-bold text-white">{{ stats.totalMembers }}</div>
            <div class="text-[10px] text-muted uppercase tracking-wider">Members</div>
          </div>
          <div>
            <div class="text-lg font-bold text-emerald-500">{{ stats.activeMembers }}</div>
            <div class="text-[10px] text-muted uppercase tracking-wider">Active</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content: Charts & Stats -->
    <main class="flex-1 overflow-y-auto">
      <!-- Header with Filters -->
      <div class="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div class="max-w-7xl mx-auto px-8 py-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-3xl font-bold text-white flex items-center gap-3">
                <template v-if="isVsMode">
                  <span>{{ selectedUsers[0].name }}</span>
                  <span class="text-accent text-2xl">VS</span>
                  <span>{{ selectedUsers[1].name }}</span>
                </template>
                <template v-else>
                  {{ selectedUser ? selectedUser.name : 'Community Stats' }}
                </template>
              </h2>
              <p class="text-muted text-sm mt-1">
                {{ isVsMode ? 'Head-to-head comparison' : selectedUser ? 'Individual performance metrics' : 'Server-wide analytics and rankings' }}
              </p>
            </div>
            <button
              v-if="selectedUserIds.length > 0"
              @click="clearUserSelection"
              class="text-sm text-muted hover:text-white transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"/>
                <path d="m6 6 12 12"/>
              </svg>
              Clear Selection
            </button>
          </div>

          <!-- Filters -->
          <div class="bg-surface border border-border rounded-xl p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Time Filter -->
              <div>
                <label class="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">Time Period</label>
                <div class="grid grid-cols-4 gap-2">
                  <button
                    v-for="option in timeOptions"
                    :key="option.value"
                    @click="setFilter('time', option.value)"
                    :class="[
                      'px-3 py-2 rounded-lg text-xs font-medium transition-all',
                      filters.time === option.value
                        ? 'bg-accent text-white'
                        : 'bg-surface-hover text-muted hover:text-white'
                    ]"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <!-- Sort By Filter -->
              <div>
                <label class="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">Sort By</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="option in sortOptions"
                    :key="option.value"
                    @click="setFilter('sortBy', option.value)"
                    :class="[
                      'px-3 py-2 rounded-lg text-xs font-medium transition-all',
                      filters.sortBy === option.value
                        ? 'bg-accent text-white'
                        : 'bg-surface-hover text-muted hover:text-white'
                    ]"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="max-w-7xl mx-auto px-8 py-8 space-y-6">
        <!-- Loading -->
        <div v-if="loading" class="text-center py-12 text-muted">
          Loading data...
        </div>

        <!-- Stats Cards -->
        <transition name="fade" mode="out-in">
          <!-- VS Mode: Direct comparison -->
          <div v-if="isVsMode" key="vs-mode" class="space-y-6">
            <!-- Players Header -->
            <div class="flex items-center justify-between bg-surface border border-border rounded-xl p-4">
              <div class="flex items-center gap-3">
                <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                <span class="text-lg font-bold text-blue-500">{{ selectedUsers[0].name }}</span>
              </div>
              <span class="text-muted font-medium">VS</span>
              <div class="flex items-center gap-3">
                <span class="text-lg font-bold text-purple-500">{{ selectedUsers[1].name }}</span>
                <div class="w-2 h-2 rounded-full bg-purple-500"></div>
              </div>
            </div>

            <!-- VS Comparison Bars -->
            <div class="bg-surface border border-border rounded-xl p-6 space-y-4">
              <h3 class="font-semibold text-white mb-4">Direct Comparison</h3>

              <!-- Level Comparison -->
              <div>
                <div class="flex justify-between text-sm text-muted mb-2">
                  <span>Level</span>
                  <span>{{ selectedUsers[0].level }} vs {{ selectedUsers[1].level }}</span>
                </div>
                <div class="relative h-8 bg-background rounded-lg overflow-hidden flex">
                  <div
                    :style="{ width: (selectedUsers[0].level / (selectedUsers[0].level + selectedUsers[1].level) * 100) + '%' }"
                    class="bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-end pr-2"
                  >
                    <span class="text-xs font-semibold text-white">{{ selectedUsers[0].level }}</span>
                  </div>
                  <div class="flex-1 bg-gradient-to-r from-purple-500 to-purple-400 flex items-center justify-start pl-2">
                    <span class="text-xs font-semibold text-white">{{ selectedUsers[1].level }}</span>
                  </div>
                </div>
              </div>

              <!-- Messages Comparison -->
              <div>
                <div class="flex justify-between text-sm text-muted mb-2">
                  <span>Messages</span>
                  <span>{{ formatNumber(selectedUsers[0].messages) }} vs {{ formatNumber(selectedUsers[1].messages) }}</span>
                </div>
                <div class="relative h-8 bg-background rounded-lg overflow-hidden flex">
                  <div
                    :style="{ width: (selectedUsers[0].messages / (selectedUsers[0].messages + selectedUsers[1].messages) * 100) + '%' }"
                    class="bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-end pr-2"
                  >
                    <span class="text-xs font-semibold text-white">{{ formatNumber(selectedUsers[0].messages) }}</span>
                  </div>
                  <div class="flex-1 bg-gradient-to-r from-purple-500 to-purple-400 flex items-center justify-start pl-2">
                    <span class="text-xs font-semibold text-white">{{ formatNumber(selectedUsers[1].messages) }}</span>
                  </div>
                </div>
              </div>

              <!-- Voice Time Comparison -->
              <div>
                <div class="flex justify-between text-sm text-muted mb-2">
                  <span>Voice Time</span>
                  <span>{{ formatTime(selectedUsers[0].voiceTime) }} vs {{ formatTime(selectedUsers[1].voiceTime) }}</span>
                </div>
                <div class="relative h-8 bg-background rounded-lg overflow-hidden flex">
                  <div
                    :style="{ width: (selectedUsers[0].voiceTime / (selectedUsers[0].voiceTime + selectedUsers[1].voiceTime) * 100) + '%' }"
                    class="bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-end pr-2"
                  >
                    <span class="text-xs font-semibold text-white">{{ formatTime(selectedUsers[0].voiceTime) }}</span>
                  </div>
                  <div class="flex-1 bg-gradient-to-r from-purple-500 to-purple-400 flex items-center justify-start pl-2">
                    <span class="text-xs font-semibold text-white">{{ formatTime(selectedUsers[1].voiceTime) }}</span>
                  </div>
                </div>
              </div>

              <!-- Arcade Comparison (if both have played) -->
              <div v-if="selectedUsers[0].arcade && selectedUsers[1].arcade && (selectedUsers[0].arcade.totalWins > 0 || selectedUsers[1].arcade.totalWins > 0)">
                <div class="flex justify-between text-sm text-muted mb-2">
                  <span>Arcade Wins</span>
                  <span>{{ selectedUsers[0].arcade.totalWins }} vs {{ selectedUsers[1].arcade.totalWins }}</span>
                </div>
                <div class="relative h-8 bg-background rounded-lg overflow-hidden flex">
                  <div
                    :style="{ width: (selectedUsers[0].arcade.totalWins / (selectedUsers[0].arcade.totalWins + selectedUsers[1].arcade.totalWins) * 100) + '%' }"
                    class="bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-end pr-2"
                  >
                    <span class="text-xs font-semibold text-white">{{ selectedUsers[0].arcade.totalWins }}</span>
                  </div>
                  <div class="flex-1 bg-gradient-to-r from-purple-500 to-purple-400 flex items-center justify-start pl-2">
                    <span class="text-xs font-semibold text-white">{{ selectedUsers[1].arcade.totalWins }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Single User Mode -->
          <div v-else-if="selectedUser" key="user-stats" class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-surface border border-border rounded-xl p-5">
            <div class="text-muted text-xs font-medium uppercase tracking-wider mb-2">Level</div>
            <div class="text-3xl font-bold text-white">{{ selectedUser.level }}</div>
            <div class="text-xs text-muted mt-1">{{ selectedUser.exp }} XP</div>
          </div>
          <div class="bg-surface border border-border rounded-xl p-5">
            <div class="text-muted text-xs font-medium uppercase tracking-wider mb-2">Messages</div>
            <div class="text-3xl font-bold text-white">{{ formatNumber(selectedUser.messages) }}</div>
          </div>
          <div class="bg-surface border border-border rounded-xl p-5">
            <div class="text-muted text-xs font-medium uppercase tracking-wider mb-2">Voice Time</div>
            <div class="text-3xl font-bold text-white">{{ formatTime(selectedUser.voiceTime) }}</div>
          </div>
          <div class="bg-surface border border-border rounded-xl p-5">
            <div class="text-muted text-xs font-medium uppercase tracking-wider mb-2">Money</div>
            <div class="text-3xl font-bold text-white">{{ formatNumber(selectedUser.money) }}💰</div>
          </div>
          </div>

          <div v-else key="global-stats" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-surface border border-border rounded-xl p-5">
            <div class="text-muted text-xs font-medium uppercase tracking-wider mb-2">Total Messages</div>
            <div class="text-3xl font-bold text-white">{{ formatNumber(stats.totalMessages) }}</div>
          </div>
          <div class="bg-surface border border-border rounded-xl p-5">
            <div class="text-muted text-xs font-medium uppercase tracking-wider mb-2">Voice Time</div>
            <div class="text-3xl font-bold text-white">{{ formatTime(stats.totalVoiceTime) }}</div>
          </div>
          <div class="bg-surface border border-border rounded-xl p-5">
            <div class="text-muted text-xs font-medium uppercase tracking-wider mb-2">Average Level</div>
            <div class="text-3xl font-bold text-white">{{ stats.avgLevel }}</div>
          </div>
          </div>
        </transition>

        <!-- Hourly Activity Chart (always shown) -->
        <div class="bg-surface border border-border rounded-xl overflow-hidden">
          <div class="px-6 py-4 border-b border-border">
            <h3 class="font-semibold text-white">Activity by Hour</h3>
            <p class="text-xs text-muted mt-1">
              <span v-if="isVsMode">
                Comparison of <span class="text-blue-400">{{ selectedUsers[0].name }}</span> vs <span class="text-purple-400">{{ selectedUsers[1].name }}</span>
              </span>
              <span v-else-if="selectedUser">{{ selectedUser.name }}'s message activity throughout the day</span>
              <span v-else>Message activity throughout the day</span>
            </p>
          </div>
          <div class="p-6">
            <!-- VS Mode: Two bars per hour -->
            <div v-if="isVsMode && selectedUsers[0].hourlyActivity && selectedUsers[1].hourlyActivity" class="flex items-end justify-between gap-2 h-48 px-2">
              <div
                v-for="hour in 24"
                :key="hour - 1"
                class="flex-1 flex flex-col items-center gap-2"
              >
                <div class="flex-1 w-full flex items-end gap-0.5">
                  <div
                    :style="{ height: getBarHeight(selectedUsers[0].hourlyActivity![hour - 1], Math.max(...selectedUsers[0].hourlyActivity!, ...selectedUsers[1].hourlyActivity!)) + '%' }"
                    class="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 rounded-tl transition-all relative group"
                    :title="`${selectedUsers[0].name}: ${selectedUsers[0].hourlyActivity![hour - 1]} messages`"
                  >
                    <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-background border border-border px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {{ selectedUsers[0].hourlyActivity![hour - 1] }}
                    </div>
                  </div>
                  <div
                    :style="{ height: getBarHeight(selectedUsers[1].hourlyActivity![hour - 1], Math.max(...selectedUsers[0].hourlyActivity!, ...selectedUsers[1].hourlyActivity!)) + '%' }"
                    class="flex-1 bg-gradient-to-t from-purple-500 to-purple-400 hover:from-purple-600 hover:to-purple-500 rounded-tr transition-all relative group"
                    :title="`${selectedUsers[1].name}: ${selectedUsers[1].hourlyActivity![hour - 1]} messages`"
                  >
                    <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-background border border-border px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {{ selectedUsers[1].hourlyActivity![hour - 1] }}
                    </div>
                  </div>
                </div>
                <div class="text-[10px] text-muted">{{ hour - 1 }}</div>
              </div>
            </div>

            <!-- Single user or global mode -->
            <div v-else class="flex items-end justify-between gap-1 h-48 px-2">
              <div
                v-for="(count, hour) in displayedHourlyActivity"
                :key="hour"
                class="flex-1 flex flex-col items-center gap-2"
              >
                <div class="flex-1 w-full flex items-end">
                  <div
                    :style="{ height: getBarHeight(count, Math.max(...displayedHourlyActivity)) + '%' }"
                    :class="[
                      'w-full rounded-t transition-all relative group',
                      selectedUser
                        ? 'bg-gradient-to-t from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500'
                        : 'bg-gradient-to-t from-accent to-accent/50 hover:from-accent/80 hover:to-accent/30'
                    ]"
                    :title="`${hour}:00 - ${count} messages`"
                  >
                    <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-background border border-border px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {{ count }}
                    </div>
                  </div>
                </div>
                <div class="text-[10px] text-muted">{{ hour }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Arcade Stats (VS Mode or Single User) -->
        <template v-if="isVsMode || selectedUser">
          <div v-if="isVsMode" class="bg-surface border border-border rounded-xl overflow-hidden">
            <div class="px-6 py-4 border-b border-border">
              <h3 class="font-semibold text-white">Arcade Games Comparison</h3>
              <p class="text-xs text-muted mt-1">
                <span class="text-blue-400">{{ selectedUsers[0].name }}</span> vs <span class="text-purple-400">{{ selectedUsers[1].name }}</span>
              </p>
            </div>
            <div class="p-6 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="gameName in ['puissance4', 'morpion']" :key="gameName" class="bg-background rounded-lg p-4">
                  <h4 class="text-sm font-medium text-white mb-3 text-center capitalize">
                    {{ gameName === 'puissance4' ? 'Connect 4' : 'Tic-Tac-Toe' }}
                  </h4>
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-blue-400">{{ selectedUsers[0].name }}</span>
                      <div class="flex gap-2">
                        <span class="text-sm font-semibold text-emerald-500">{{ ((selectedUsers[0].arcade as any)?.[gameName] as any)?.wins || 0 }}W</span>
                        <span class="text-sm font-semibold text-red-500">{{ ((selectedUsers[0].arcade as any)?.[gameName] as any)?.losses || 0 }}L</span>
                      </div>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-purple-400">{{ selectedUsers[1].name }}</span>
                      <div class="flex gap-2">
                        <span class="text-sm font-semibold text-emerald-500">{{ ((selectedUsers[1].arcade as any)?.[gameName] as any)?.wins || 0 }}W</span>
                        <span class="text-sm font-semibold text-red-500">{{ ((selectedUsers[1].arcade as any)?.[gameName] as any)?.losses || 0 }}L</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div>
                  <div class="text-xs text-muted mb-2 text-center">Total Wins</div>
                  <div class="flex items-center justify-between bg-background rounded-lg p-3">
                    <span class="text-lg font-bold text-blue-500">{{ selectedUsers[0].arcade?.totalWins || 0 }}</span>
                    <span class="text-xs text-muted">vs</span>
                    <span class="text-lg font-bold text-purple-500">{{ selectedUsers[1].arcade?.totalWins || 0 }}</span>
                  </div>
                </div>
                <div>
                  <div class="text-xs text-muted mb-2 text-center">Total Losses</div>
                  <div class="flex items-center justify-between bg-background rounded-lg p-3">
                    <span class="text-lg font-bold text-blue-500">{{ selectedUsers[0].arcade?.totalLosses || 0 }}</span>
                    <span class="text-xs text-muted">vs</span>
                    <span class="text-lg font-bold text-purple-500">{{ selectedUsers[1].arcade?.totalLosses || 0 }}</span>
                  </div>
                </div>
                <div>
                  <div class="text-xs text-muted mb-2 text-center">Win Rate</div>
                  <div class="flex items-center justify-between bg-background rounded-lg p-3">
                    <span class="text-lg font-bold text-blue-500">{{ calculateWinRate(selectedUsers[0].arcade?.totalWins || 0, selectedUsers[0].arcade?.totalLosses || 0) }}%</span>
                    <span class="text-xs text-muted">vs</span>
                    <span class="text-lg font-bold text-purple-500">{{ calculateWinRate(selectedUsers[1].arcade?.totalWins || 0, selectedUsers[1].arcade?.totalLosses || 0) }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- User-specific charts (when single user is selected) -->
        <template v-if="selectedUser && !isVsMode">
          <!-- Message Activity Over Time -->
          <div v-if="selectedUser.messageHistory && selectedUser.messageHistory.length > 0" class="bg-surface border border-border rounded-xl overflow-hidden">
            <div class="px-6 py-4 border-b border-border">
              <h3 class="font-semibold text-white">Message Activity Over Time</h3>
              <p class="text-xs text-muted mt-1">Messages per day</p>
            </div>
            <div class="p-6">
              <div class="flex items-end justify-between gap-2 h-48">
                <div
                  v-for="(entry, idx) in selectedUser.messageHistory"
                  :key="idx"
                  class="flex-1 flex flex-col items-center gap-2"
                >
                  <div class="flex-1 w-full flex items-end">
                    <div
                      :style="{ height: getBarHeight(entry.count, Math.max(...selectedUser.messageHistory.map(e => e.count))) + '%' }"
                      class="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t transition-all hover:from-purple-600 hover:to-purple-500 relative group"
                      :title="`${formatDate(entry.date)} - ${entry.count} messages`"
                    >
                      <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-background border border-border px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {{ entry.count }}
                      </div>
                    </div>
                  </div>
                  <div class="text-[9px] text-muted">{{ formatDate(entry.date) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Arcade Stats -->
          <div v-if="selectedUser.arcade && (selectedUser.arcade.totalWins > 0 || selectedUser.arcade.totalLosses > 0)" class="bg-surface border border-border rounded-xl overflow-hidden">
            <div class="px-6 py-4 border-b border-border">
              <h3 class="font-semibold text-white">Arcade Games</h3>
              <p class="text-xs text-muted mt-1">Win/Loss records</p>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div v-for="(game, key) in selectedUser.arcade" :key="key" v-show="key !== 'totalWins' && key !== 'totalLosses'" class="bg-background rounded-lg p-4 text-center">
                  <div class="text-sm font-medium text-white mb-2 capitalize">{{ key === 'puissance4' ? 'Connect 4' : key === 'morpion' ? 'Tic-Tac-Toe' : key }}</div>
                  <div class="flex items-center justify-center gap-3">
                    <div>
                      <div class="text-xl font-bold text-emerald-500">{{ (game as any).wins || 0 }}</div>
                      <div class="text-[10px] text-muted">Wins</div>
                    </div>
                    <div class="text-muted">-</div>
                    <div>
                      <div class="text-xl font-bold text-red-500">{{ (game as any).losses || 0 }}</div>
                      <div class="text-[10px] text-muted">Losses</div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="mt-4 pt-4 border-t border-border flex justify-center gap-8">
                <div class="text-center">
                  <div class="text-2xl font-bold text-emerald-500">{{ selectedUser.arcade.totalWins }}</div>
                  <div class="text-xs text-muted">Total Wins</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-red-500">{{ selectedUser.arcade.totalLosses }}</div>
                  <div class="text-xs text-muted">Total Losses</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-accent">{{ calculateWinRate(selectedUser.arcade.totalWins, selectedUser.arcade.totalLosses) }}%</div>
                  <div class="text-xs text-muted">Win Rate</div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Global Charts (when no user is selected) -->
        <template v-else>
          <!-- Level Distribution Chart -->
          <div class="bg-surface border border-border rounded-xl overflow-hidden">
            <div class="px-6 py-4 border-b border-border">
              <h3 class="font-semibold text-white">Level Distribution</h3>
              <p class="text-xs text-muted mt-1">Members by level range</p>
            </div>
            <div class="p-6">
              <div class="space-y-3">
                <div
                  v-for="(count, range) in sortedLevelDistribution"
                  :key="range"
                  class="flex items-center gap-4"
                >
                  <div class="w-20 text-sm text-muted font-medium">{{ range }}</div>
                  <div class="flex-1 h-8 bg-surface-hover rounded-lg overflow-hidden relative">
                    <div
                      :style="{ width: getBarWidth(count, maxLevelCount) + '%' }"
                      class="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                    ></div>
                    <div class="absolute inset-0 flex items-center px-3">
                      <span class="text-xs font-semibold text-white">{{ count }} members</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from '../utils/axios'

const route = useRoute()
const guildId = route.params.id as string

interface LeaderboardUser {
  discordId: string
  name: string
  level: number
  exp: number
  messages: number
  voiceTime: number
  money: number
  messageHistory?: Array<{ date: Date; count: number }>
  voiceHistory?: Array<{ date: Date; time: number }>
  hourlyActivity?: number[]
  arcade?: {
    shifumi: { wins: number; losses: number }
    puissance4: { wins: number; losses: number }
    morpion: { wins: number; losses: number }
    battle: { wins: number; losses: number }
    totalWins: number
    totalLosses: number
  }
}

interface LeaderboardStats {
  totalMembers: number
  totalMessages: number
  totalVoiceTime: number
  avgLevel: number
  activeMembers: number
}

interface LeaderboardCharts {
  hourlyActivity: number[]
  levelDistribution: Record<string, number>
}

const loading = ref(true)
const error = ref<string | null>(null)
const leaderboard = ref<LeaderboardUser[]>([])
const stats = ref<LeaderboardStats>({
  totalMembers: 0,
  totalMessages: 0,
  totalVoiceTime: 0,
  avgLevel: 0,
  activeMembers: 0
})
const charts = ref<LeaderboardCharts>({
  hourlyActivity: Array(24).fill(0),
  levelDistribution: {}
})

const searchQuery = ref('')
const selectedUserIds = ref<string[]>([])

const filters = ref({
  time: 'all',
  sortBy: 'level'
})

const timeOptions = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' }
]

const sortOptions = [
  { label: 'Level', value: 'level' },
  { label: 'Messages', value: 'messages' },
  { label: 'Voice', value: 'voiceTime' }
]

const filteredLeaderboard = computed(() => {
  if (!searchQuery.value) return leaderboard.value
  const query = searchQuery.value.toLowerCase()
  return leaderboard.value.filter(user =>
    user.name.toLowerCase().includes(query) ||
    user.discordId.includes(query)
  )
})

const selectedUser = computed(() => {
  if (selectedUserIds.value.length === 0) return null
  return leaderboard.value.find(u => u.discordId === selectedUserIds.value[0]) || null
})

const selectedUsers = computed(() => {
  return selectedUserIds.value.map(id =>
    leaderboard.value.find(u => u.discordId === id)
  ).filter(u => u !== undefined) as LeaderboardUser[]
})

const isVsMode = computed(() => selectedUserIds.value.length === 2)

const displayedHourlyActivity = computed(() => {
  // If a single user is selected, show their personal hourly activity
  if (selectedUser.value && selectedUser.value.hourlyActivity) {
    return selectedUser.value.hourlyActivity
  }
  // Otherwise show global stats
  return charts.value.hourlyActivity
})

const sortedLevelDistribution = computed(() => {
  const entries = Object.entries(charts.value.levelDistribution)
  entries.sort((a, b) => {
    const aStart = parseInt(a[0].split('-')[0])
    const bStart = parseInt(b[0].split('-')[0])
    return aStart - bStart
  })
  return Object.fromEntries(entries)
})

const maxLevelCount = computed(() => {
  return Math.max(...Object.values(charts.value.levelDistribution), 1)
})

const loadData = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await api.get(`/api/guilds/${guildId}/leaderboard`, {
      params: {
        time: filters.value.time,
        sortBy: filters.value.sortBy
      }
    })

    leaderboard.value = response.data.leaderboard
    stats.value = response.data.stats
    charts.value = response.data.charts
  } catch (err: any) {
    console.error('Error loading leaderboard:', err)
    error.value = err.response?.data?.error || 'Failed to load leaderboard'
  } finally {
    loading.value = false
  }
}

const setFilter = (key: string, value: string) => {
  filters.value[key as keyof typeof filters.value] = value
  loadData()
}

const selectUser = (userId: string) => {
  const index = selectedUserIds.value.indexOf(userId)

  if (index > -1) {
    // User already selected - deselect (toggle)
    selectedUserIds.value.splice(index, 1)
  } else {
    // Max 2 users for VS mode
    if (selectedUserIds.value.length >= 2) {
      // Replace the oldest selection
      selectedUserIds.value.shift()
    }
    selectedUserIds.value.push(userId)
  }

  // Scroll to top of main content to show user stats
  const mainContent = document.querySelector('main')
  if (mainContent) {
    mainContent.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const clearUserSelection = () => {
  selectedUserIds.value = []

  // Scroll to top when clearing selection
  const mainContent = document.querySelector('main')
  if (mainContent) {
    mainContent.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

const formatDate = (date: Date): string => {
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const getBarHeight = (value: number, max: number): number => {
  if (max === 0) return 0
  return Math.max((value / max) * 100, 2)
}

const getBarWidth = (value: number, max: number): number => {
  if (max === 0) return 0
  return Math.max((value / max) * 100, 10)
}

const calculateWinRate = (wins: number, losses: number): number => {
  const total = wins + losses
  if (total === 0) return 0
  return Math.round((wins / total) * 100)
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
:deep(*::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:deep(*::-webkit-scrollbar-track) {
  background: #1a1a1a;
  border-radius: 4px;
}

:deep(*::-webkit-scrollbar-thumb) {
  background: #333;
  border-radius: 4px;
}

:deep(*::-webkit-scrollbar-thumb:hover) {
  background: #444;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
