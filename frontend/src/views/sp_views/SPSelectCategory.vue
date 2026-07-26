<script setup>
import { ref, onMounted } from 'vue'
import { initializeSocketConnection } from '../../services/socket'
import { fetchCategories, getUserInfo } from '../../services/api.js'
import { socketService } from '../../services/socket.js'
import { useGameStore } from '../../stores/gameStore.js'
import { logout } from '../../services/authService.js'
import router from '../../router'

const gameStore = useGameStore()

const pausedGame = ref(null)

const loading = ref(true)
const failed = ref(false)

const categories = ref([])
const selectedCategory = ref(null)

const selectCategory = (cat) => {
  selectedCategory.value = cat
}

function startGame() {
  if (!selectedCategory.value) return

  socketService.startSingleplayer(selectedCategory.value, (err) => {
    if (err) {
      alert(err.error)
      return
    }

    router.push('/singleplayer/play')
  })
}

function resumeGame() {
  socketService.resumeSingleplayer(pausedGame.value.gameId, (err, response) => {
    if (err) {
      alert('Error during game resuming: ' + err.error)
      return
    }
    router.push('/singleplayer/play')
  })
}

function forfeitGame() {
  if (confirm('Are you sure you want to forfeit this paused game? It will count as a loss.')) {
    socketService.resumeSingleplayer(pausedGame.value.gameId, (err, response) => {
      if (err) {
        alert('Error during game resuming: ' + err.error)
        return
      }
      router.push('/singleplayer/play')

      socketService.forfeitSingleplayer(pausedGame.value.gameId, (err, response) => {
        if (err) {
          alert('Error during forfeit: ' + err.error)
          return
        }
      })
    })
  } else {
    return
  }
}

onMounted(async () => {
  try {
    initializeSocketConnection()
  } catch (error) {
    alert('Session ran out. Please login again!')
    logout()
  }

  loading.value = true
  failed.value = false
  try {
    const userData = await getUserInfo()
    if (userData.activeGame) {
      pausedGame.value = userData.activeGame
    }
    const categoryData = await fetchCategories()
    categories.value = categoryData.categories || []
  } catch (error) {
    console.error('Failed to initialise lobby', error)
    failed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="lobby-container">
    <div v-if="loading" class="status-card loading-card">
      <div class="loading-spinner"></div>
      <h2>Loading...</h2>
      <p>Preparing your game.</p>
    </div>

    <div v-else-if="failed" class="failed-card loading-card">
      <h2>Error</h2>
      <p>Singleplayer information could not be fetched.</p>
      <p>Please try reloading the page.</p>
    </div>

    <div v-if="pausedGame" class="resume-card gradient-card animate-in">
      <h2>Resume Your Game</h2>

      <p>You have a saved singleplayer game that must be completed before starting a new one.</p>

      <div class="resume-details">
        <div>
          <strong>Category</strong>
          <span>{{ pausedGame.category.replace('_', ' ').toUpperCase() }}</span>
        </div>

        <div>
          <strong>Questions Used</strong>
          <span>{{ pausedGame.turnsUsed }} / {{ pausedGame.maxQuestions }}</span>
        </div>
      </div>

      <div class="resume-actions">
        <button class="play-btn" @click="resumeGame">Resume Game</button>
        <button class="btn-danger" @click="forfeitGame">Forfeit Game</button>
      </div>
    </div>

    <div v-else class="lobby-card gradient-card animate-in">
      <h1>Singleplayer Lobby</h1>
      <p class="subtitle">Select a category to begin your game.</p>

      <div class="category-grid">
        <button
          v-for="cat in categories"
          :key="cat"
          type="button"
          :class="['cat-btn', { 'cat-btn-chosen': selectedCategory === cat }]"
          @click="selectCategory(cat)"
        >
          {{ cat.replace('_', ' ').toUpperCase() }}
        </button>
      </div>

      <button class="play-btn" :disabled="!selectedCategory" @click="startGame">START GAME</button>
    </div>
  </div>
</template>

<style scoped>
/** SINGLEPLAYER LOBBY STYLE */
.lobby-container {
  min-height: calc(100vh - 200px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
}

.lobby-card {
  width: min(900px, 100%);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
}

.lobby-card h1 {
  margin-top: 0;
  margin-bottom: 0.4rem;
  color: #ffffff;
}

.subtitle {
  color: #a1a1aa;
  margin-bottom: 1.75rem;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.9rem;
  margin-bottom: 2rem;

  /* keeps everything on screen */
  max-height: 45vh;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.cat-btn {
  min-height: 58px;
}

/** END OF SINGLEPLAYER LOBBY STYLE */

/** RESUME PORTAL STYLE */
.resume-card {
  max-width: 550px;
  margin: 2rem auto;
  padding: 2rem;
  border-radius: 16px;
  text-align: center;
}

.resume-card h2 {
  margin-top: 0;
  color: #ffffff;
}

.resume-details {
  margin: 1.5rem 0;
  display: flex;
  justify-content: space-around;
  gap: 2rem;
}

.resume-details div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.resume-details strong {
  font-size: 0.9rem;
  color: #a1a1aa;
}

.resume-details span {
  font-size: 1.1rem;
  font-weight: 600;
  color: #f3f4f6;
}

.resume-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.resume-actions .play-btn,
.resume-actions .btn-danger {
  width: 100%;
  padding: 0.9rem 1.5rem;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 600;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.1s ease;
}

.resume-actions .btn-danger {
  background: transparent !important;
  color: #f87171;
  border: 1px solid #7f1d1d;
}

.resume-actions .btn-danger:hover {
  background: #2b1111 !important;
  border-color: #991b1b;
}

.resume-actions button:active {
  transform: scale(0.98);
}

/** END OF RESUME PORTAL STYLE */
</style>
