import { defineStore } from 'pinia'
import { useAuthStore } from './authStore.js'

const initialState = () => ({
  socketStatus: 'DISCONNECTED', // 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'
  roomCode: null,
  selectedCategory: null,
  host: null, // Host username
  players: [], // Array of { user_id, username, color, is_guest, isHost }
  currentTurnHolder: null, // Username of active turn player
})

export const useRoomStore = defineStore('room', {
  state: () => initialState(),

  getters: {
    // Check if current authenticated user is the room host
    isHost: (state) => {
      const auth = useAuthStore()
      return Boolean(state.host && auth.username === state.host)
    },

    // Check if it is currently my turn to ask/guess
    isMyTurn: (state) => {
      const auth = useAuthStore()
      return Boolean(state.currentTurnHolder && auth.user?.username === state.currentTurnHolder)
    },

    // Convenience getter for connection state
    isConnected: (state) => state.socketStatus === 'CONNECTED',

    // Get current turn player's display name
    activePlayerName: (state) => state.currentTurnHolder || 'Waiting...',

    // Get opponent player object (useful for 2-player matches)
    opponent: (state) => {
      const auth = useAuthStore()
      return state.players.find((p) => p.username !== auth.user?.username) || null
    },
  },

  actions: {
    // Full store reset (e.g. when exiting back to main menu)
    reset() {
      const currentSocketStatus = this.socketStatus // Preserve connection status
      Object.assign(this, initialState())
      this.socketStatus = currentSocketStatus
    },

    // Sync room data from socket events ('room_state_updated', 'returned_to_lobby', etc.)
    setRoomData(payload = {}) {
      if (payload.roomCode) this.roomCode = payload.roomCode
      if (payload.selectedCategory !== undefined) this.selectedCategory = payload.selectedCategory
      if (payload.players) this.players = payload.players
      if (payload.hostUsername !== undefined) this.host = payload.hostUsername
      if (payload.currentTurnHolder !== undefined)
        this.currentTurnHolder = payload.currentTurnHolder
    },

    // Granular turn updater
    setTurn(turnHolderUsername) {
      this.currentTurnHolder = turnHolderUsername
    },

    // Category settings updater
    setSelectedCategory(category) {
      this.selectedCategory = category
    },

    // Socket lifecycle state updater
    updateSocketStatus(status) {
      this.socketStatus = status
    },
  },
})
