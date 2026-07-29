import { io } from 'socket.io-client'

import { useAuthStore } from '../stores/authStore.js'
import { useGameStore } from '../stores/gameStore.js'
import { useRoomStore } from '../stores/roomStore.js'
import { logout } from '../services/authService.js'
function getStores() {
  return {
    authStore: useAuthStore(),
    gameStore: useGameStore(),
    roomStore: useRoomStore(),
  }
}

export let socket = null

/**
 * Initializes the global Socket instance and sets up inbound broadcast channels.
 */
export function initializeSocketConnection() {
  const { authStore, roomStore } = getStores()

  // Already healthy
  if (socket?.connected && roomStore.socketStatus === 'connected') {
    return
  }

  // Prevent duplicate connection attempts
  if (roomStore.socketStatus === 'connecting') {
    return
  }

  // Clean up stale socket if one exists but is not usable
  if (socket) {
    socket.disconnect()
    socket = null
  }

  roomStore.updateSocketStatus('connecting')

  const targetUrl = import.meta.env.VITE_BACKEND_URL

  socket = io(targetUrl, {
    auth: { token: authStore.token },
    transports: ['websocket', 'polling'],
  })

  // ==========================================
  // 1. LIFECYCLE & SYSTEM EVENTS
  // ==========================================

  socket.on('connect', () => {
    roomStore.updateSocketStatus('connected')

    if (import.meta.env.DEV) {
      console.log(`📡 Socket connected. Session ID: ${socket.id}`)
    }
  })

  socket.on('connect_error', (err) => {
    console.warn('⚠️ Socket connection rejected:', err.message)

    roomStore.updateSocketStatus('disconnected')

    // Kill bad socket so future attempts can recreate it
    socket.disconnect()
    socket = null

    alert('Session expired. Please log in again.')
    logout()
  })

  socket.on('disconnect', (reason) => {
    roomStore.updateSocketStatus('disconnected')

    if (import.meta.env.DEV) {
      console.warn(`⚠️ Socket disconnected: ${reason}`)
    }
  })

  socket.on('socket_error', (data) => {
    console.error('❌ Socket error:', data.message)

    roomStore.updateSocketStatus('disconnected')

    alert(`❌ Matching Exception: ${data.message}`)
  })

  // ==========================================
  // 2. MULTIPLAYER ASYNC BROADCAST CHANNELS
  // ==========================================
  socket.on('room_state_updated', (roomData) => {
    console.log('📥 Room state update received:', roomData)
    roomStore.setRoomData(roomData)
  })

  socket.on('match_launched', (data) => {
    console.log('🎬 Match launch broadcast received!', data)

    gameStore.initGame({
      gameId: data.gameId,
      gameMode: 'MULTIPLAYER',
      categoryInfo: data.categoryInfo,
      maxQuestions: data.maxQuestions || 20,
      instruction: data.instruction,
    })
    roomStore.setTurn(data.currentTurnHolder)

    console.log(`Game started with the category: ${gameStore.categoryInfo.categoryName}`)
  })

  socket.on('turn_broadcast_received', (data) => {
    gameStore.handleTurnBroadcast(data)
    console.log(`New message by ${data.sender} of type ${data.type}: ${data.text}`)
  })

  socket.on('ai_response_broadcast_received', (data) => {
    console.log('📥 AI processed packet received:', data)
    gameStore.handleAiResponse(data)

    console.log(`AI says: ${data.messageText}`)
  })

  socket.on('game_cancelled', () => {
    gameStore.handleCancelMPGame()
  })

  socket.on('room_terminated', (data) => {
    alert(data.reason || 'The match room has been closed by the host or system server.')
    window.location.reload()
  })

  socket.on('returned_to_lobby', (data) => {
    console.log('Received returned to lobby')
    roomStore.setRoomData({
      roomCode: data.roomCode,
      players: data.players,
      hostUsername: data.hostUsername,
    })

    gameStore.reset()
  })
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// ==========================================
// 3. OUTBOUND GATEWAY SERVICE LAYER
// ==========================================
export const socketService = {
  // --- SINGLEPLAYER REQUEST-RESPONSE WRAPPERS ---
  startSingleplayer(category, callback) {
    const gameStore = useGameStore()
    socket.emit('sp_start_game', { category }, (response) => {
      if (!response || response.error)
        return callback({ error: response?.error || 'Unknown Error' })

      if (response.instruction) {
        gameStore.addMessage(response.instruction)
      }

      gameStore.gameMode = 'SINGLEPLAYER'
      gameStore.gameId = response.gameId
      gameStore.categoryInfo = response.categoryInfo
      gameStore.maxQuestions = response.maxQuestions
      gameStore.gameStage = response.gameStage
      gameStore.turnsUsed = 0

      callback(null, response)
    })
  },

  resumeSingleplayer(gameId, callback) {
    const gameStore = useGameStore()
    socket.emit('sp_resume_game', { game_id: gameId }, (response) => {
      if (!response || response.error)
        return callback({ error: response?.error || 'Unknown Error' })

      gameStore.gameMode = 'SINGLEPLAYER'
      gameStore.gameId = response.gameId
      gameStore.categoryInfo = response.categoryInfo
      gameStore.turnsUsed = response.turnsUsed
      gameStore.maxQuestions = response.maxQuestions
      gameStore.gameStage = response.gameStage

      gameStore.rewriteChatHistory(response.chatHistory)

      callback(null, response)
    })
  },

  submitSingleplayerTurn(type, text, callback) {
    const gameStore = useGameStore()
    const authStore = useAuthStore()
    socket.emit('sp_submit_turn', { game_id: gameStore.gameId, type, text }, (response) => {
      if (!response || response.error)
        return callback({ error: response?.error || 'Unknown Error' })

      gameStore.turnsUsed = response.turnsUsed
      gameStore.gameStage = response.gameStage

      if (response.instruction) {
        gameStore.addMessage(response.instruction)
      }

      if (response.response) {
        gameStore.addMessage(response.response)
      }

      if (gameStore.gameStage == 'GAME_OVER') {
        gameStore.setGameOver(
          response.gameResult,
          response.secretAnswer || '',
          authStore.username,
          false,
          response.stats,
        )
      }

      console.log(
        'New turn count = ' + gameStore.turnsUsed + ', new game stage = ' + gameStore.gameStage,
      )

      callback(null, response)
    })
  },

  pauseSingleplayer(callback) {
    const gameStore = useGameStore()
    socket.emit('sp_pause_game', { game_id: gameStore.gameId }, (response) => {
      if (!response || response.error)
        return callback({ error: response?.error || 'Unknown Error' })

      gameStore.activeGame = {
        game_id: gameStore.gameId,
        category: gameStore.category,
        turns_used: gameStore.turnsUsed,
        max_questions: gameStore.maxQuestions,
        chat_history: null,
      }

      gameStore.reset()

      callback(null, response)
    })
  },

  forfeitSingleplayer(gameId, callback) {
    const gameStore = useGameStore()
    const authStore = useAuthStore()
    socket.emit('sp_quit_game', { game_id: gameId }, (response) => {
      if (!response || response.error)
        return callback({ error: response?.error || 'Unknown Error' })

      gameStore.gameStage = response.gameStage

      if (response.instruction) {
        gameStore.addMessage(response.instruction)
      }

      gameStore.setGameOver(
        response.gameResult,
        response.secretAnswer || '',
        authStore.username,
        true,
        response.stats,
      )
      callback(null, response)
    })
  },

  getSingleplayerAnalysis(callback) {
    const gameStore = useGameStore()
    socket.emit('sp_get_analysis', { game_id: gameStore.gameId }, (response) => {
      if (!response || response.error)
        return callback({ error: response?.error || 'Unknown Error' })

      gameStore.chatHistory = response.chatHistory
      callback(null, response.chatHistory)
    })
  },

  // --- MULTIPLAYER ROOM TRIGGERS ---
  createMultiplayerRoom() {
    return emitAsync('create_room', {}, 'room_state_updated')
  },

  joinMultiplayerRoom(roomCode) {
    return emitAsync('join_room', { roomCode }, 'room_state_updated')
  },

  updateRoomSettings(roomCode, category) {
    if (socket) socket.emit('update_room_settings', { roomCode, category })
  },

  changePlayerColor(roomCode, colorId) {
    if (socket) socket.emit('change_player_color', { roomCode, colorId })
  },

  launchMultiplayerMatch(roomCode, category) {
    if (socket) socket.emit('launch_match', { roomCode, category })
  },

  submitMultiplayerTurn(roomCode, type, text) {
    if (socket) socket.emit('submit_multiplayer_turn', { roomCode, type, text })
  },

  cancelMultiplayerMatch(roomCode) {
    if (socket) socket.emit('cancel_mp_game', { roomCode })
  },

  leaveMultiplayerMatch(roomCode) {
    if (socket) socket.emit('leave_mp_room', { roomCode })
  },

  returnToLobby(roomCode) {
    if (socket) return emitAsync('return_to_lobby', { roomCode }, 'returned_to_lobby')
  },
}

// Helper to wrap socket emits into clean Promises with timeouts
function emitAsync(eventName, payload = {}, successEvent = 'room_state_updated', timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    if (!socket) {
      return reject(new Error('Socket is not connected.'))
    }

    let timer

    // Cleanup listeners and timer once resolved or rejected
    const cleanup = () => {
      clearTimeout(timer)
      socket.off(successEvent, handleSuccess)
      socket.off('socket_error', handleError)
      socket.off('connect_error', handleError)
    }

    const handleSuccess = (data) => {
      cleanup()
      resolve(data)
    }

    const handleError = (errorPayload) => {
      cleanup()
      const message = typeof errorPayload === 'string' ? errorPayload : errorPayload?.message
      reject(new Error(message || 'An error occurred on the socket.'))
    }

    // 1. Timeout safeguard
    timer = setTimeout(() => {
      cleanup()
      reject(new Error('Request timed out. Please check your connection and try again.'))
    }, timeoutMs)

    // 2. Register listeners
    socket.once(successEvent, handleSuccess)
    socket.once('socket_error', handleError)
    socket.once('connect_error', handleError)

    // 3. Send event
    socket.emit(eventName, payload)
  })
}
