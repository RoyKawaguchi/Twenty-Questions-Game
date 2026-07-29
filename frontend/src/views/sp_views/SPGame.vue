<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { useAuthStore } from '../../stores/authStore.js'
import router from '../../router'
import { socketService } from '../../services/socket.js'

import ChatWindow from '../../components/ChatWindow.vue'
import GameOverPanel from '../../components/GameOverPanel.vue'

const authStore = useAuthStore()
const gameStore = useGameStore()

const gameCategory = computed(() => gameStore.categoryInfo.categoryName)
const turnsUsed = computed(() => gameStore.turnsUsed)
const maxQuestions = computed(() => gameStore.maxQuestions)
const chatMessages = computed(() => gameStore.chatHistory)

const isLoadingQuestion = ref(false)
const isLoadingGuess = ref(false)

const showAnalysis = ref(false)

const questionInput = ref('')
const guessInput = ref('')

const questionInputRef = ref(null)

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)

  if (
    gameStore.gameMode !== 'SINGLEPLAYER' ||
    gameStore.gameStage !== 'PLAYING' ||
    !gameStore.categoryInfo.categoryName
  ) {
    alert('Redirecting to Singleplayer Lobby...')
    gameStore.reset()
    router.push('/singleplayer')
  } else {
    focusQuestionInput()
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

watch(
  () => isLoadingQuestion.value || isLoadingGuess.value,
  (loading) => {
    if (!loading && gameStore.gameStage === 'PLAYING') {
      focusQuestionInput()
    }
  },
)

watch(
  () => gameStore.gameStage,
  (stage) => {
    if (stage === 'GAME_OVER') {
      nextTick(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth',
        })
      })
    }
  },
)

function sendQuestion() {
  const question = questionInput.value.trim()

  if (!question || isLoadingQuestion.value) return

  isLoadingQuestion.value = true

  gameStore.addMessage({
    type: 'question',
    sender: authStore.username,
    text: question,
  })

  questionInput.value = ''

  socketService.submitSingleplayerTurn('QUESTION', question, (err, response) => {
    if (err) {
      gameStore.addMessage({ type: 'instruction', sender: 'ai', text: `Error: ${err.error}` })
      isLoadingQuestion.value = false
      return
    }
    isLoadingQuestion.value = false
  })
}

function sendGuess() {
  const guess = guessInput.value.trim()

  if (!guess || isLoadingGuess.value) return

  isLoadingGuess.value = true

  gameStore.addMessage({
    type: 'guess',
    sender: authStore.username,
    text: guess,
  })
  guessInput.value = ''

  socketService.submitSingleplayerTurn('GUESS', guess, (err, response) => {
    if (err) {
      gameStore.addMessage({ type: 'instruction', sender: 'ai', text: `Error: ${err.error}` })
      isLoadingQuestion.value = false
      return
    }
    isLoadingGuess.value = false
  })
}

function pauseAndSaveGame() {
  if (confirm('Pause and save this game for later? You can come back to finish it later.')) {
    socketService.pauseSingleplayer((err, response) => {
      if (err) {
        alert('Error during pausing game: ' + err.error)
        return
      }

      router.push('/singleplayer')
    })
  } else {
    return
  }
}

function forfeitGame() {
  if (confirm('Are you sure you want to forfeit this game? It will count as a loss.')) {
    socketService.forfeitSingleplayer(gameStore.gameId, (err, response) => {
      if (err) {
        alert('Error during forfeit: ' + err.error)
        return
      }
    })
  } else {
    return
  }
}

function toggleAnalysis() {
  if (gameStore.gameStage === 'GAME_OVER') {
    const analysisLoaded = gameStore.chatHistory.some((m) => m.type === 'response' && m.analysis)

    if (!showAnalysis.value && !analysisLoaded) {
      socketService.getSingleplayerAnalysis((err, response) => {
        if (err) {
          alert('Error fetching analysis: ' + err.error)
          return
        }

        showAnalysis.value = true
      })
    } else {
      // Just toggle existing data
      showAnalysis.value = !showAnalysis.value
    }
  }
}

function returnToHome() {
  if (confirm('Return to lobby?')) {
    gameStore.reset()
    router.push('/singleplayer')
  } else {
    return
  }
}

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
    <div class="game-header">
      <h2>{{ gameCategory }}</h2>
      <p>Ask yes/no questions, then make your final guess.</p>

      <p class="turn-counter"><strong>Turns Used:</strong> {{ turnsUsed }} / {{ maxQuestions }}</p>
    </div>

    <ChatWindow
      :messages="chatMessages"
      :show-analysis="showAnalysis"
      :isLoading="isLoadingGuess || isLoadingQuestion"
    />

    <div
      class="chat-inputs"
      v-if="gameStore.gameStage === 'PLAYING' || gameStore.gameStage === 'FINAL_GUESS'"
    >
      <div class="input-row" v-if="gameStore.gameStage === 'PLAYING'">
        <input
          ref="questionInputRef"
          v-model="questionInput"
          :disabled="isLoadingQuestion"
          :placeholder="`Yes/No question (e.g. ${gameStore.categoryInfo.exampleQuestion})`"
          @keyup.enter="sendQuestion"
        />

        <button @click="sendQuestion">{{ isLoadingQuestion ? 'Thinking...' : 'Ask' }}</button>
      </div>

      <div class="input-row">
        <input
          v-model="guessInput"
          :disabled="isLoadingGuess"
          :placeholder="
            gameStore.gameStage === 'FINAL_GUESS'
              ? 'Enter your final guess'
              : `or make a guess (e.g. ${gameStore.categoryInfo.exampleAnswer})`
          "
          @keyup.enter="sendGuess"
        />

        <button @click="sendGuess">{{ isLoadingGuess ? 'Thinking...' : 'Guess' }}</button>
      </div>
    </div>
    <div v-if="gameStore.gameStage !== 'GAME_OVER'" class="game-actions">
      <button @click="pauseAndSaveGame">Pause & Save</button>
      <button class="danger-btn" @click="forfeitGame">Forfeit</button>
    </div>

    <GameOverPanel
      v-if="gameStore.gameStage === 'GAME_OVER'"
      mode="SINGLEPLAYER"
      :game-over-data="gameStore.gameOver"
      :turns-used="turnsUsed"
      :max-questions="maxQuestions"
      :show-analysis="showAnalysis"
      @toggle-analysis="toggleAnalysis"
      @leave-game="returnToHome"
    />
  </div>
</template>

<style scoped>
@import '../../assets/game-layout.css';
</style>
