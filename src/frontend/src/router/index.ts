import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.store.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: true }
    },
    {
<<<<<<< Updated upstream
=======
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/servers',
      name: 'servers',
      component: () => import('../views/server/index.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/servers/:serverId',
      name: 'serverConfig', 
      component: () => import('../views/server/[id].vue'),
      meta: { requiresAuth: true }
    },
    {
>>>>>>> Stashed changes
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
  const isAuthenticated = authStore.isAuthenticated
  
<<<<<<< Updated upstream
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/')
  } else {
    next()
=======
  // Si une route nécessite l'authentification et que l'utilisateur n'est pas connecté
  if (to.meta.requiresAuth && !isAuthenticated) {
    // Rediriger vers la page de connexion
    return next('/login')
>>>>>>> Stashed changes
  }
  
  // Si la route est réservée aux invités et que l'utilisateur est connecté
  if (to.meta.guestOnly && isAuthenticated) {
    // Rediriger vers la liste des serveurs
    return next('/servers')
  }
  
  // Si l'utilisateur est connecté et va sur la home page, rediriger vers serveurs
  if (to.path === '/' && isAuthenticated) {
    return next('/servers')
  }
  
  // Dans tous les autres cas, permettre la navigation
  next()
})

export default router 