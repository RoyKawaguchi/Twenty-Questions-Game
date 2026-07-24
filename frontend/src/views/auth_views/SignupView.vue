<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthCard from '../../components/AuthCard.vue'
import { handleAuth } from '../../services/authService.js'

const router = useRouter()

const username = ref('')
const email = ref('')
const password = ref('')

async function handleSignup() {
  if (!username.value.trim() || !email.value.trim() || !password.value) {
    return
  }

  const payload = {
    username: username.value.trim(),
    email: email.value.trim(),
    password: password.value,
  }

  await handleAuth(payload, 'SIGNUP')
}
</script>

<template>
  <AuthCard>
    <div class="signup-box">
      <h2>Welcome, New User!</h2>
      <form @submit.prevent="handleSignup">
        <input v-model="username" type="text" placeholder="Username" required />
        <input v-model="email" type="email" placeholder="Email" required />
        <input v-model="password" type="password" placeholder="Password" required />

        <button type="submit">Sign up</button>
      </form>

      <div class="auth-links">
        <p>
          Have an account already? <RouterLink to="/login" class="link-to-auth">Login</RouterLink>
        </p>
        <p>
          Play as guest? <RouterLink to="/guest" class="link-to-auth">Play as Guest</RouterLink>
        </p>
      </div>
    </div>
  </AuthCard>
</template>
