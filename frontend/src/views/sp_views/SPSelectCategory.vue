<script setup>
import { ref, onMounted } from 'vue'
import { initializeSocketConnection } from '../../services/socket'
import { fetchCategories, getUserInfo } from '../../services/api.js'
import { socketService } from '../../services/socket.js'
import { useGameStore } from '../../stores/gameStore.js'
import router from '../../router'

const gameStore = useGameStore()

const pausedGame = ref(null)

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

    const data = await getUserInfo()
    if (data.activeGame) {
      console.log('active game found!')
      pausedGame.value = data.activeGame
    }
  } catch (error) {
    console.error('Failed to load user info', error)
  }

  try {
    const data = await fetchCategories()
    categories.value = data.categories || []
  } catch (error) {
    console.error('Failed to load categories', error)
  }
})
</script>

<template>
  <div class="lobby-container">
    <div v-if="pausedGame" class="resume-card">
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

      <button class="play-btn" @click="resumeGame">Resume Game</button>
      <button class="btn-danger" @click="forfeitGame">Forfeit Game</button>
    </div>

    <div v-else class="lobby-card">
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
  background: #fafafa;
  border: 1px solid #ddd;
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
}

.lobby-card h1 {
  margin-top: 0;
  margin-bottom: 0.4rem;
}

.subtitle {
  color: #666;
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

.play-btn {
  width: 100%;
  max-width: 320px;
}

/** END OF SINGLEPLAYER LOBBY STYLE */
/** RESUME PORTAL STYLE */
.resume-card {
  max-width: 550px;
  margin: 2rem auto;
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid #ddd;
  background: #fafafa;
  text-align: center;
}

.resume-card h2 {
  margin-top: 0;
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
  color: #666;
}

.resume-details span {
  font-size: 1.1rem;
  font-weight: 600;
}

/** END OF RESUME PORTAL STYLE */
</style>
