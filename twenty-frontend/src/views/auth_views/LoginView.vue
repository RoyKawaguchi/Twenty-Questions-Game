<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthCard from '../../components/AuthCard.vue'
import { handleAuth } from '../../services/authService.js'

const router = useRouter()

const identity = ref('')
const password = ref('')

async function handleLogin() {
  if (!identity.value.trim() || !password.value) {
    return
  }
  const payload = {
    identity: identity.value.trim(),
    password: password.value,
  }

  await handleAuth(payload, 'LOGIN')
}
</script>

<template>
  <AuthCard>
    <div class="login-box">
      <h2>Welcome back!</h2>

      <form @submit.prevent="handleLogin">
        <input v-model="identity" type="text" placeholder="Username or Email" required />
        <input v-model="password" type="password" placeholder="Password" required />
        <button type="submit">Login</button>
      </form>

      <div class="auth-links">
        <p>Don't have an account? <RouterLink to="/signup">Sign Up</RouterLink></p>
        <p>Play as a guest? <RouterLink to="/guest">Play as Guest</RouterLink></p>
      </div>
    </div>
  </AuthCard>
</template>
