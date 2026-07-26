<script setup>
import { ref, onMounted } from 'vue'
import router from '../../router'

import { initializeSocketConnection, socketService } from '../../services/socket'
import { useAuthStore } from '../../stores/authStore.js'
import { useGameStore } from '../../stores/gameStore.js'
import { useRoomStore } from '../../stores/roomStore.js'
import { logout } from '../../services/authService.js'

// User input for joining an existing room
const roomCode = ref('')

// Optional loading state for buttons
const isLoading = ref(false)

const authStore = useAuthStore()
const gameStore = useGameStore()
const roomStore = useRoomStore()

/**
 * Called when the user wants to create a new room.
 */
async function createRoom() {
  isLoading.value = true

  try {
    await socketService.createMultiplayerRoom()

    router.push(`/multiplayer/lobby/${roomStore.roomCode}`)
  } finally {
    isLoading.value = false
  }
}

/**
 * Called when the user enters a room code.
 */
async function joinRoom() {
  const code = roomCode.value.trim().toUpperCase()

  if (!code) {
    alert('Please enter a room code.')
    return
  }

  isLoading.value = true

  try {
    console.log('Joining room:', code)

    await socketService.joinMultiplayerRoom(code)
    router.push(`/multiplayer/lobby/${roomStore.roomCode}`)
  } catch (error) {
    alert('Failed to join room:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  try {
    initializeSocketConnection()
  } catch (error) {
    alert('Session ran out. Please login again!')
    logout()
  }
})
</script>
<template>
  <div class="lobby-container">
    <div class="lobby-card gradient-card animate-in">
      <h1>Multiplayer Lobby</h1>
      <p class="subtitle">Create a room to host a game or join a friend's room using a code.</p>

      <div class="lobby-grid">
        <!-- Create Room -->
        <section class="card">
          <h2>Create Room</h2>
          <p>Create a new multiplayer room and invite your friends.</p>

          <button class="play-btn" @click="createRoom" :disabled="isLoading">
            {{ isLoading ? 'Creating...' : 'Create Room' }}
          </button>
        </section>

        <!-- Join Room -->
        <section class="card">
          <h2>Join Room</h2>
          <input
            v-model="roomCode"
            type="text"
            maxlength="4"
            placeholder="ABCD"
            @keyup.enter="joinRoom"
          />

          <button class="play-btn" @click="joinRoom" :disabled="isLoading">Join Room</button>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lobby-container {
  min-height: calc(100vh - 250px);
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
  color: var(--text-primary);
}

.lobby-card h1 {
  margin-top: 0;
  margin-bottom: 0.4rem;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-muted);
  margin-top: 1rem;
  margin-bottom: 2rem;
}

.lobby-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.card {
  border: 1px solid var(--border);
  background: var(--surface-alt);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card h2 {
  margin-top: 1.25rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.card p {
  color: var(--text-muted);
  margin-top: 0rem;
  margin-bottom: 1rem;
}

input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem;
  margin-bottom: 1rem;
  font-size: 1rem;
  text-transform: uppercase;
  background: #111111;
  border: 1px solid var(--border);
  color: var(--text-primary);
}

input::placeholder {
  color: var(--text-muted);
}

input:focus {
  outline: none;
  border-color: var(--accent-indigo);
}

.play-btn {
  width: 100%;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
