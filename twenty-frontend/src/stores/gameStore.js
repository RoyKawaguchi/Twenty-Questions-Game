import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'
import { useRoomStore } from './roomStore'

const initialState = () => ({
  gameId: null,
  gameMode: 'SINGLEPLAYER', // 'SINGLEPLAYER' | 'MULTIPLAYER'
  categoryInfo: {
    categoryName: null,
    categorySingular: null,
    exampleQuestion: null,
    exampleAnswer: null,
  },
  turnsUsed: 0,
  maxQuestions: 20,
  gameStage: 'NOT_PLAYING', // 'NOT_PLAYING' | 'PLAYING' | 'FINAL_GUESS' | 'GAME_OVER'
  chatHistory: [],
  activeGame: null,
  isLoading: false, // Tracks when waiting for AI response (disables inputs)
  gameOver: {
    result: null,
    winnerUsername: null,
    secretAnswer: null,
    forfeit: false,
    stats: {
      xpEarned: 0,
      xp: 0,
      rating: 0, // SINGLE only
      rank: null, // SINGLE only
      winRate: null, // SINGLE only
      turnsSubmitted: 0, // MULTI only
    },
  },
})

export const useGameStore = defineStore('game', {
  state: () => initialState(),

  getters: {
    isGameOver: (state) => state.gameStage === 'GAME_OVER',
    isFinalGuessStage: (state) => state.gameStage === 'FINAL_GUESS',
  },

  actions: {
    // --- YOUR EXISTING ACTIONS ---
    reset() {
      Object.assign(this, initialState())
    },

    addMessage(messageDict) {
      this.chatHistory.push({
        ...messageDict,
        id: crypto.randomUUID(),
      })
    },

    rewriteChatHistory(chatHistory) {
      this.chatHistory = []
      for (const entry of chatHistory) {
        this.addMessage(entry)
      }
    },

    setGameOver(gameResult, secretAnswer, winnerUsername, forfeit = false, stats = {}) {
      this.gameStage = 'GAME_OVER'
      this.isLoading = false
      this.gameOver = {
        result: gameResult,
        secretAnswer,
        winnerUsername,
        forfeit,
        stats,
      }
    },

    // --- NEW HELPER ACTIONS FOR SP & MP MATCHES ---

    // 1. Call when starting any game (Singleplayer API or MP 'match_launched')
    initGame({
      gameId = null,
      gameMode = 'SINGLEPLAYER',
      categoryInfo = {},
      maxQuestions = 20,
      instruction = {},
    }) {
      this.reset()
      this.gameId = gameId
      this.gameMode = gameMode
      this.maxQuestions = maxQuestions
      this.gameStage = 'PLAYING'

      if (categoryInfo) {
        this.categoryInfo = categoryInfo
      }

      if (instruction) {
        this.addMessage(instruction)
      }
    },

    handleTurnBroadcast(data) {
      this.isLoading = true
      this.addMessage({
        type: data.type ? data.type.toLowerCase() : 'question', // Normalizes 'QUESTION' -> 'question'
        sender: data.sender,
        text: data.text,
      })
    },

    // MP Event: 'ai_response_broadcast_received'
    // Pushes the Game Master's response, updates turn counts, and sets game over if ended
    handleAiResponse(data) {
      this.isLoading = false
      const authStore = useAuthStore()
      const roomStore = useRoomStore()

      if (data.turnsUsed !== undefined) {
        this.turnsUsed = data.turnsUsed
      }

      if (data.gameStage) {
        this.gameStage = data.gameStage
      }

      if (data.messageText) {
        this.addMessage({
          type: 'response',
          sender: 'ai',
          text: data.messageText,
        })
      }
      if (data.currentTurnHolder) {
        roomStore.currentTurnHolder = data.currentTurnHolder
      }

      if (data.gameStage === 'GAME_OVER') {
        let gameResult = 'LOSE'
        if (data.victory) {
          if (data.winnerUsername == authStore.username) {
            gameResult = 'WIN'
          }
        }
        this.setGameOver(
          gameResult,
          data.secretAnswer,
          data.winnerUsername,
          Boolean(data.forfeit),
          data.stats,
        )

        if (data.chatHistory) {
          console.log('chatHistory looks like this: ' + this.chatHistory)
          this.chatHistory = data.chatHistory
        }
      }
    },

    handleCancelMPGame() {
      this.isLoading = false
      this.addMessage({
        type: 'instruction',
        sender: 'system',
        text: 'Host has requested to cancel the game...',
      })
      this.setGameOver('LOSE', '', '', true, { xpEarned: 0 })
    },

    setLoading(status) {
      this.isLoading = status
    },
  },
})
