<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthCard from '../../components/AuthCard.vue'
import { handleAuth } from '../../services/authService.js'

const router = useRouter()

const nickname = ref('')

async function handleGuest() {
  if (!nickname.value.trim()) {
    return
  }
  const payload = {
    nickname: nickname.value.trim(),
  }
  await handleAuth(payload, 'GUEST')
}
</script>

<template>
  <AuthCard>
    <div class="guest-box">
      <h2>Welcome, Guest User!</h2>
      <input v-model="nickname" type="text" placeholder="Nickname" />
      <button @click="handleGuest">Play as guest</button>

      <div class="auth-links">
        <p>
          Have an account already? <RouterLink to="/login" class="link-to-auth">Login</RouterLink>
        </p>
        <p>
          Create a new account? <RouterLink to="/signup" class="link-to-auth">Sign Up</RouterLink>
        </p>
      </div>
    </div>
  </AuthCard>
</template>
