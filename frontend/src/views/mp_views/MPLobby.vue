<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore.js'
import { useRoomStore } from '../../stores/roomStore.js'
import { useGameStore } from '../../stores/gameStore.js'
import { socketService } from '../../services/socket.js'
import { PLAYER_COLORS, PLAYER_COLOR_ORDER } from '../../constants/playerColors.js'

import PlayerList from '../../components/lobby/PlayerList.vue'
import CategorySelector from '../../components/lobby/CategorySelector.vue'
import ColorSelector from '../../components/lobby/ColorSelector.vue'

const router = useRouter()
const authStore = useAuthStore()
const roomStore = useRoomStore()
const gameStore = useGameStore()

const copySuccess = ref(false)

// Computed helpers
const roomCode = computed(() => roomStore.roomCode)
const isHost = computed(() => roomStore.isHost)
const selectedCategory = computed(() => roomStore.selectedCategory) // assuming selectedCategory is in roomStore
const players = computed(() => roomStore.players)
const hostUsername = computed(() => roomStore.host)

const myPlayer = computed(() => {
  return players.value.find((player) => player.username === authStore.username)
})
const myColor = computed(() => myPlayer.value?.color)
const takenColors = computed(() => {
  return new Set(players.value.map((player) => player.color))
})

const canStartGame = computed(() => {
  return isHost.value && selectedCategory.value && players.value.length >= 2
})

const startButtonHint = computed(() => {
  if (!isHost.value) return 'Waiting for host to start...'
  if (players.value.length < 2) return 'Need at least 2 players to start.'
  if (!selectedCategory.value) return 'Select a category to start.'
  return 'All set! Ready to launch.'
})

const copyRoomCode = async () => {
  try {
    await navigator.clipboard.writeText(roomCode.value)
    copySuccess.value = true
    setTimeout(() => (copySuccess.value = false), 2000)
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}

const handleCategorySelect = (cat) => {
  if (isHost.value) {
    socketService.updateRoomSettings(roomCode.value, cat)
  }
}

const handleColorSelect = (colorId) => {
  if (colorId === myColor.value) return

  if (takenColors.value.has(colorId)) return

  socketService.changePlayerColor(roomCode.value, colorId)
}

const startGame = () => {
  if (canStartGame.value) {
    socketService.launchMultiplayerMatch(roomCode.value, selectedCategory.value)
  }
}

watch(
  () => gameStore.gameId,
  (newGameId) => {
    if (newGameId && gameStore.gameMode === 'MULTIPLAYER') {
      router.push(`/multiplayer/play/${roomCode.value}`)
    }
  },
)

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)

  if (!players.value.some((player) => player.username === authStore.username)) {
    alert('Redirecting to Multiplayer Portal...')
    roomStore.reset()
    router.push('/multiplayer/create')
  } else {
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

function handleBeforeUnload(event) {
  event.preventDefault()
  event.returnValue = ''
}
</script>

<template>
  <div class="lobby-container">
    <!-- Prominent Room Code Header -->
    <div class="room-header">
      <h2>
        Room Code: <strong>{{ roomCode }}</strong>
      </h2>
      <button class="copy-btn" @click="copyRoomCode">
        {{ copySuccess ? '✅ Copied!' : '📋 Copy Code' }}
      </button>
    </div>

    <div class="lobby-main">
      <PlayerList :players="players" :hostUsername="hostUsername" />

      <CategorySelector
        :selectedCategory="selectedCategory"
        :isHost="isHost"
        @selectCategory="handleCategorySelect"
      />
    </div>

    <div class="action-footer">
      <button class="play-btn" :disabled="!canStartGame" @click="startGame">START GAME</button>

      <p class="status-hint" :class="{ ready: canStartGame }">
        {{ startButtonHint }}
      </p>
    </div>

    <ColorSelector
      :players="players"
      :currentUsername="authStore.username"
      @selectColor="handleColorSelect"
    />
  </div>
</template>

<style scoped>
.lobby-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.lobby-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: stretch;
  margin: 2rem 0;
}

.lobby-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.room-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f0fdf4; /* Light green tint to feel like a successful lobby */
  border: 2px dashed #4ade80;
  border-radius: 16px;
}

.room-header h2 {
  margin: 0;
  font-size: 2rem;
  letter-spacing: 2px;
}

.copy-btn {
  background: white;
  border: 1px solid #ccc;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: #f3f4f6;
}

.action-footer {
  margin-top: 3rem;
  text-align: center;
}

.action-footer {
  margin: 1.5rem 0;
  text-align: center;
}

/* Inherits your global .play-btn */

.status-hint {
  margin-top: 1rem;
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
}

.status-hint.ready {
  color: #16a34a; /* Green text when ready */
}
</style>
