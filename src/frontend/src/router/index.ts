import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue')
    },
    {
      path: '/servers',
      name: 'servers',
      component: () => import('../views/server/ServersView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/server/:id',
      name: 'server-dashboard',
      component: () => import('../views/server/ServerDashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/server/:id/feature/:feature',
      name: 'feature-management',
      component: () => import('../views/server/features/FeatureManagementView.vue'),
      meta: { requiresAuth: true }
    },
    // Redirect old routes
    {
      path: '/dashboard',
      redirect: '/servers'
    },
    {
      path: '/guild/:id',
      redirect: to => `/server/${to.params.id}`
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/')
  } else if (to.name === 'login' && authStore.isAuthenticated) {
    next('/servers')
  } else {
    next()
  }
})

export default router 