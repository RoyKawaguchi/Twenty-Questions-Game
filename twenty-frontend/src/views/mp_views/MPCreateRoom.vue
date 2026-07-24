<script setup>
import { ref, onMounted } from 'vue'
import router from '../../router'

import { initializeSocketConnection, socketService } from '../../services/socket'
import { useAuthStore } from '../../stores/authStore.js'
import { useGameStore } from '../../stores/gameStore.js'
import { useRoomStore } from '../../stores/roomStore.js'

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
  initializeSocketConnection()
})
</script>

<template>
  <div class="lobby">
    <h1>Multiplayer Portal</h1>

    <!-- Create Room Section -->
    <section class="card">
      <h2>Create Room</h2>
      <p>Create a new multiplayer room and invite your friends.</p>

      <button @click="createRoom" :disabled="isLoading">
        {{ isLoading ? 'Creating...' : 'Create Room' }}
      </button>
    </section>

    <!-- Join Room Section -->
    <section class="card">
      <h2>Join Room</h2>
      <p>Enter a room code provided by the host.</p>

      <input
        v-model="roomCode"
        type="text"
        maxlength="6"
        placeholder="ABC123"
        @keyup.enter="joinRoom"
      />

      <button @click="joinRoom" :disabled="isLoading">Join Room</button>

      <!-- Tip:
           You can automatically uppercase the input by adding
           text-transform: uppercase in CSS. The script already
           converts it before sending to the server. -->
    </section>
  </div>
</template>

<style scoped>
.lobby {
  max-width: 500px;
  margin: 3rem auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  font-family: Arial, Helvetica, sans-serif;
}

.card {
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 1.5rem;
}

h1 {
  text-align: center;
}

h2 {
  margin-top: 0;
}

input {
  width: 100%;
  padding: 0.75rem;
  margin: 1rem 0;
  font-size: 1rem;
  box-sizing: border-box;
  text-transform: uppercase;
}

button {
  width: 100%;
  padding: 0.8rem;
  font-size: 1rem;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
