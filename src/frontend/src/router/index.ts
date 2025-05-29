import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue')
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      component: () => import('../views/LeaderboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/leveling',
      name: 'leveling',
      component: () => import('../views/LevelingView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/voice-channels',
      name: 'voice-channels',
      component: () => import('../views/VoiceChannelsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/games',
      name: 'games',
      component: () => import('../views/GamesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/guild/:id',
      name: 'guild-features',
      component: () => import('../views/GuildFeaturesView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router 