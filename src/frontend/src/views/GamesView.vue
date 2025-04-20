<template>
  <div class="games">
    <h1>Gestion des jeux</h1>
    
    <div class="game-form">
      <h2>Ajouter un nouveau jeu</h2>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="gamename">Nom du jeu</label>
          <input
            id="gamename"
            v-model="gameName"
            type="text"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="gamedescription">Description</label>
          <textarea
            id="gamedescription"
            v-model="gameDescription"
            required
          ></textarea>
        </div>
        
        <div class="form-group">
          <label for="gameimage">Image</label>
          <input
            id="gameimage"
            type="file"
            accept="image/*"
            @change="handleFileChange"
          >
        </div>
        
        <div class="form-group">
          <label for="gamecolor">Couleur</label>
          <input
            id="gamecolor"
            v-model="gameColor"
            type="color"
          >
        </div>
        
        <button type="submit" :disabled="loading">
          {{ loading ? 'Création...' : 'Créer le jeu' }}
        </button>
        
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
    
    <div class="games-list">
      <h2>Jeux existants</h2>
      <div v-if="games.length === 0" class="no-games">
        Aucun jeu n'a été créé pour le moment.
      </div>
      <div v-else class="games-grid">
        <div v-for="game in games" :key="game._id" class="game-card">
          <img :src="game.image" :alt="game.name">
          <h3>{{ game.name }}</h3>
          <p>{{ game.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import { IGame } from '../types/game'

const gameName = ref('')
const gameDescription = ref('')
const gameImage = ref<File | null>(null)
const gameColor = ref('#55CCFC')
const loading = ref(false)
const error = ref('')
const games = ref<IGame[]>([])

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    gameImage.value = target.files[0]
  }
}

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const formData = new FormData()
    formData.append('gamename', gameName.value)
    formData.append('gamedescription', gameDescription.value)
    if (gameImage.value) {
      formData.append('gameimage', gameImage.value)
    }
    formData.append('gamecolor', gameColor.value)
    
    await axios.post('/api/games', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    // Reset form
    gameName.value = ''
    gameDescription.value = ''
    gameImage.value = null
    gameColor.value = '#55CCFC'
    
    // Refresh games list
    await loadGames()
  } catch (err) {
    error.value = 'Une erreur est survenue lors de la création du jeu'
  } finally {
    loading.value = false
  }
}

const loadGames = async () => {
  try {
    const response = await axios.get('/api/games')
    games.value = response.data.games
  } catch (err) {
    console.error('Failed to load games:', err)
  }
}

// Load games on component mount
loadGames()
</script>

<style scoped>
.games {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.game-form {
  background-color: #f8f9fa;
  padding: 2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

input[type="text"],
textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

textarea {
  min-height: 100px;
  resize: vertical;
}

button {
  padding: 0.75rem 1.5rem;
  background-color: #2c3e50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error {
  color: #e74c3c;
  margin-top: 1rem;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.game-card {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.game-card img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.game-card h3 {
  margin: 0 0 0.5rem;
  color: #2c3e50;
}

.game-card p {
  color: #666;
  margin: 0;
}

.no-games {
  text-align: center;
  color: #666;
  padding: 2rem;
  background-color: #f8f9fa;
  border-radius: 8px;
}
</style> 