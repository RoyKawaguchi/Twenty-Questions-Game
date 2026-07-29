<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../../stores/gameStore.js'
import { useRoomStore } from '../../stores/roomStore.js'
import { useAuthStore } from '../../stores/authStore.js'
import ChatWindow from '../../components/ChatWindow.vue'
import GameOverPanel from '../../components/GameOverPanel.vue'
import { socketService } from '@/services/socket.js'
import { PLAYER_COLORS } from '../../constants/playerColors.js'

const router = useRouter()
const gameStore = useGameStore()
const roomStore = useRoomStore()
const authStore = useAuthStore()

// Local UI state
const questionInput = ref('')
const questionInputRef = ref(null)
const guessInput = ref('')
const showAnalysis = ref(false)

// --- COMPUTED DATA FROM STORES ---
const currentUsername = computed(() => authStore.username || 'You')

// Room & Turn State
const roomCode = computed(() => roomStore.roomCode || '----')
const isHost = computed(() => roomStore.host === currentUsername.value)
const isMyTurn = computed(() => roomStore.currentTurnHolder === currentUsername.value)
const activePlayerName = computed(() => roomStore.currentTurnHolder || 'Player')

// Game Info & Chat
const gameCategory = computed(
  () => gameStore.categoryInfo?.categoryName || roomStore.category || 'Multiplayer Game',
)
const turnsUsed = computed(() => gameStore.turnsUsed || 0)
const maxQuestions = computed(() => gameStore.maxQuestions || 20)
const chatMessages = computed(() => gameStore.chatHistory || [])
const roomMembers = computed(() => roomStore.players || []) // Array of { id, username, color, isHost }

// Loading state
const isLoading = computed(() => gameStore.isLoading)

function sendQuestion() {
  if (!questionInput.value.trim() || !isMyTurn.value || isLoading.value) return

  socketService.submitMultiplayerTurn(roomCode.value, 'QUESTION', questionInput.value)

  questionInput.value = ''
}

function sendGuess() {
  if (!guessInput.value.trim() || !isMyTurn.value || isLoading.value) return

  socketService.submitMultiplayerTurn(roomCode.value, 'GUESS', guessInput.value)

  guessInput.value = ''
}

function handleLeaveOrCancel() {
  if (isHost.value) {
    if (confirm('Are you sure you want to cancel the game for everyone?')) {
      socketService.cancelMultiplayerMatch(roomCode.value)
    }
  } else {
    if (confirm('Are you sure you want to leave?')) {
      socketService.leaveMultiplayerMatch(roomCode.value)
      returnToLobby()
    }
  }
}

function returnToLobby() {
  socketService.returnToLobby(roomCode.value)
  router.push(`/multiplayer/lobby/${roomCode.value}`)
}

function toggleAnalysis() {
  showAnalysis.value = !showAnalysis.value
}

// --- LIFECYCLE / SOCKET LISTENERS ---
onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)

  if (
    gameStore.gameMode !== 'MULTIPLAYER' ||
    gameStore.gameStage !== 'PLAYING' ||
    !gameStore.categoryInfo.categoryName
  ) {
    alert('Redirecting to Multiplayer Portal...')
    gameStore.reset()
    router.push('/multiplayer/create')
  } else {
    focusQuestionInput()
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

watch(
  () => gameStore.gameId,
  (gameId) => {
    if (gameId === null) {
      router.push(`/multiplayer/lobby/${roomCode.value}`)
    }
  },
)

watch(
  () => isLoading.value,
  (loading) => {
    if (!loading && gameStore.gameStage === 'PLAYING') {
      focusQuestionInput()
    }
  },
)

function handleBeforeUnload(event) {
  if (gameStore.gameStage === 'GAME_OVER') return

  event.preventDefault()
  event.returnValue = ''
}

async function focusQuestionInput() {
  await nextTick()
  questionInputRef.value?.focus()
}
</script>

<template>
  <div class="game-container">
    <!-- Header -->
    <div class="game-header">
      <div class="header-top-row">
        <h2>{{ gameCategory }}</h2>
        <span class="room-code-badge">ROOM: {{ roomCode }}</span>
      </div>
      <p>Work together or compete to guess the secret answer!</p>

      <div class="turn-counter">
        <strong>Turns Used:</strong> {{ turnsUsed }} / {{ maxQuestions }}
      </div>
    </div>

    <!-- Horizontal Active Player Bar -->
    <div class="player-bar">
      <div
        v-for="member in roomMembers"
        :key="member.username"
        class="player-chip"
        :class="{ 'is-turn': member.username === activePlayerName }"
      >
        <span
          class="player-color-dot"
          :style="{ backgroundColor: PLAYER_COLORS[member.color] || '#007aff' }"
        ></span>
        <span class="player-name">
          {{ member.username }}
          <template v-if="member.username === currentUsername">(You)</template>
        </span>
        <span v-if="member.isHost" class="host-crown" title="Host">👑</span>
      </div>
    </div>

    <!-- Chat Output -->
    <ChatWindow :messages="chatMessages" :show-analysis="showAnalysis" :is-loading="isLoading" />

    <!-- Turn-based Inputs -->
    <div
      v-if="gameStore.gameStage === 'PLAYING' || gameStore.gameStage === 'FINAL_GUESS'"
      class="chat-inputs"
    >
      <!-- Ask Question Row -->
      <div class="input-row" v-if="gameStore.gameStage === 'PLAYING'">
        <input
          ref="questionInputRef"
          v-model="questionInput"
          :disabled="!isMyTurn || isLoading"
          :placeholder="
            isMyTurn
              ? `Yes/No question (e.g. ${gameStore.categoryInfo.exampleQuestion})`
              : `Waiting for @${activePlayerName} to ask...`
          "
          @keyup.enter="sendQuestion"
        />
        <button :disabled="!isMyTurn || isLoading" @click="sendQuestion">
          {{ isLoading ? 'Thinking...' : 'Ask' }}
        </button>
      </div>

      <!-- Make Guess Row -->
      <div class="input-row">
        <input
          v-model="guessInput"
          :disabled="!isMyTurn || isLoading"
          :placeholder="
            gameStore.gameStage === 'FINAL_GUESS'
              ? isMyTurn
                ? 'Enter your final guess'
                : `Waiting for @${activePlayerName} to make the final guess...`
              : isMyTurn
                ? `Or make a guess (e.g. ${gameStore.categoryInfo.exampleAnswer})`
                : `Waiting for @${activePlayerName} to guess...`
          "
          @keyup.enter="sendGuess"
        />
        <button :disabled="!isMyTurn || isLoading" @click="sendGuess">
          {{ isLoading ? 'Thinking...' : 'Guess' }}
        </button>
      </div>
    </div>

    <!-- Gameplay Actions -->
    <div v-if="gameStore.gameStage !== 'GAME_OVER'" class="game-actions">
      <button class="danger-btn" @click="handleLeaveOrCancel">
        {{ isHost ? 'Cancel Game' : 'Leave Room' }}
      </button>
    </div>

    <!-- Shared Game Over Panel -->
    <GameOverPanel
      v-if="gameStore.gameStage === 'GAME_OVER'"
      mode="MULTIPLAYER"
      :game-over-data="gameStore.gameOver"
      :turns-used="turnsUsed"
      :max-questions="maxQuestions"
      :show-analysis="showAnalysis"
      @toggle-analysis="toggleAnalysis"
      @leave-game="returnToLobby"
    />
  </div>
</template>

<style scoped>
@import '../../assets/game-layout.css';

.header-top-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.room-code-badge {
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--surface-alt);
  color: var(--text-muted);
  padding: 3px 8px;
  border-radius: 6px;
  letter-spacing: 0.05em;
  border: 1px solid var(--border);
}

.player-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: #111111;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: thin;
}

.player-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  font-size: 0.825rem;
  font-weight: 500;
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.player-chip.is-turn {
  background: linear-gradient(135deg, #34d399, #22c55e);
  color: white;
  border-color: transparent;
  box-shadow: 0 6px 18px rgba(34, 197, 94, 0.25);
}

.player-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.host-crown {
  font-size: 0.75rem;
}
</style>
