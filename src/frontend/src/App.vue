<template>
<<<<<<< Updated upstream
  <div class="app min-h-screen bg-gradient-to-br from-[#181a20] via-[#23272f] to-[#181a20]">
    <AppHeader />
    <main class="flex flex-col items-center justify-start flex-1 pt-24">
      <router-view />
=======
  <div id="app-container">
    <header v-if="authStore.isAuthenticated" class="app-header frosted-glass">
      <div class="user-info">
        <img v-if="authStore.user?.avatar" 
             :src="`https://cdn.discordapp.com/avatars/${authStore.user.id}/${authStore.user.avatar}.png?size=64`" 
             alt="User Avatar" 
             class="user-avatar" />
        <span v-if="authStore.user?.username" class="user-name">
          {{ authStore.user.username }}
        </span>
      </div>
      <button @click="handleLogout" class="logout-button action-button">
        Déconnexion
      </button>
    </header>
    <main class="main-content">
      <RouterView />
>>>>>>> Stashed changes
    </main>
  </div>
</template>

<script setup lang="ts">
<<<<<<< Updated upstream
import AppHeader from './components/AppHeader.vue'
import { useAuthStore } from './stores/auth'
import { computed } from 'vue'
=======
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth.store' // Assurez-vous que le chemin est correct
import { onMounted } from 'vue'
>>>>>>> Stashed changes

const authStore = useAuthStore()
const router = useRouter()

const handleLogout = () => {
  authStore.logout()
  router.push({ name: 'Login' }); // Rediriger vers la page de connexion après la déconnexion
}

// Charger les données utilisateur si un token est présent au montage initial
onMounted(() => {
  if (authStore.token && !authStore.user) {
    authStore.fetchUserData();
  }

  console.log('authStore.user', authStore.user);
});

</script>

<style scoped>
#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-text-primary);
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--padding-small) var(--padding-large);
  /*position: fixed; /* Optionnel: si vous voulez un header fixe */
  /*top: 0;*/
  /*left: 0;*/
  /*right: 0;*/
  /*z-index: 1000;*/
  /* Appliquer l'effet frosted-glass déjà défini dans main.css */
  margin: var(--padding-small); /* Ajoute un peu d'espace autour si non fixe */
  border-radius: var(--border-radius-base);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--padding-small);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%; /* Cercle pour l'avatar */
  object-fit: cover;
  border: 2px solid var(--color-surface-secondary);
}

<<<<<<< Updated upstream
main {
  flex: 1;
=======
.user-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.logout-button {
  /* Utilise .action-button de main.css, mais on peut surcharger/ajuster ici */
  background-color: var(--color-surface-secondary); /* Un peu différent pour se démarquer */
  color: var(--color-text-secondary);
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  width: auto; /* Permet au bouton de s'ajuster à son contenu */
}

.logout-button:hover {
  background-color: color-mix(in srgb, var(--color-surface-secondary), #000 20%);
  color: var(--color-text-primary);
}

.main-content {
  flex-grow: 1;
  padding-top: 0; /* Ajuster si le header est fixe et prend de la hauteur */
  /* Si le header est fixe et a une marge, ce padding peut être retiré ou ajusté */
>>>>>>> Stashed changes
}
</style>
