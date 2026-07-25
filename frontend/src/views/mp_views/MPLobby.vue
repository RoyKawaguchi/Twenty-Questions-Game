<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore.js'
import { useRoomStore } from '../../stores/roomStore.js'
import { useGameStore } from '../../stores/gameStore.js'
import { socketService } from '../../services/socket.js'

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
    <div class="room-header gradient-card animate-in">
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

    <div class="lobby-footer">
      <ColorSelector
        :players="players"
        :currentUsername="authStore.username"
        @selectColor="handleColorSelect"
      />

      <div class="action-footer">
        <button class="play-btn" :disabled="!canStartGame" @click="startGame">START GAME</button>

        <p class="status-hint" :class="{ ready: canStartGame }">
          {{ startButtonHint }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lobby-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.lobby-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: stretch;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 0.75rem 2rem;
  margin-bottom: 1rem;

  border-radius: 12px;
  color: var(--text-primary);
}

.room-header h2 {
  margin: 0;
  font-size: 1.35rem;
  letter-spacing: 1px;
}

.copy-btn {
  background: var(--surface-alt);
  color: var(--text-primary);
  border: 1px solid var(--border);
  padding: 0.5rem 1rem;
  margin-left: 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: #323238;
  border-color: var(--border-strong);
}

.status-hint {
  margin-top: 0.5rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 500;
}

.status-hint.ready {
  color: #4ade80;
}

.lobby-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
  align-items: stretch;
}

.action-footer {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.action-footer .play-btn {
  width: 100%;
  max-width: 320px;
}
</style>
