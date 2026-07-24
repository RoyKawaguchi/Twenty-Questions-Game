import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    username: localStorage.getItem('username') || '',
    email: localStorage.getItem('email') || '',
    token: localStorage.getItem('token') || '',
    isGuest: localStorage.getItem('isGuest') === 'true',
  }),

  actions: {
    setAuth(payload) {
      this.username = payload.username
      this.email = payload.email || ''
      this.token = payload.token
      this.isGuest = payload.is_guest

      localStorage.setItem('username', this.username)
      localStorage.setItem('email', this.email)
      localStorage.setItem('token', this.token)
      localStorage.setItem('isGuest', String(this.isGuest))
    },
    clearAuth() {
      this.username = ''
      this.email = ''
      this.token = ''
      this.isGuest = false

      localStorage.removeItem('username')
      localStorage.removeItem('email')
      localStorage.removeItem('token')
      localStorage.removeItem('isGuest')
    },
  },
})
