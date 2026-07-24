import router from '../router'
import * as api from '../services/api.js'
import { useAuthStore } from '../stores/authStore.js'

export async function handleAuth(payload, actionType) {
  try {
    let data

    switch (actionType) {
      case 'LOGIN':
        data = await api.loginUser(payload.identity, payload.password)
        break

      case 'SIGNUP':
        data = await api.registerUser(payload.username, payload.email, payload.password)
        break

      case 'GUEST':
        data = await api.initializeGuestSession(payload.nickname)
        break

      default:
        throw new Error(`Unknown auth action: ${actionType}`)
    }

    handleAuthSuccess(data)
  } catch (err) {
    console.error(`${actionType} failed:`, err)
    alert(err.message || `${actionType} failed.`)
  }
}

function handleAuthSuccess(data) {
  const authStore = useAuthStore()
  authStore.setAuth(data)
  router.push('/')
}

export function logout() {
  const authStore = useAuthStore()
  authStore.clearAuth()
  router.push('/login')
}
