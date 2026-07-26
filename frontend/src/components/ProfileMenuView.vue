<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '../stores/authStore.js'
import { logout } from '../services/authService.js'

const authStore = useAuthStore()
const isOpen = ref(false)
const menuRef = ref(null)

function handleLogOut() {
  if (confirm('Are you sure you want to log out?')) {
    logout()
  }
}

function handleClickOutside(event) {
  if (isOpen.value && menuRef.value && !menuRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="menuRef" class="profile-menu-container">
    <button @click="isOpen = !isOpen" class="profile-icon-btn">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-user-circle"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="10" r="3" />
        <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
      </svg>
    </button>

    <!-- Dropdown shows ONLY if isOpen is true -->
    <div v-if="isOpen" class="profile-dropdown">
      <div class="dropdown-header">
        <h3>{{ authStore.username }}</h3>
        <p>{{ authStore.email || 'Guest account' }}</p>
      </div>

      <button @click="handleLogOut" class="btn-danger">Sign Out</button>
    </div>
  </div>
</template>

<style scoped>
.profile-menu-container {
  position: relative;
}

.profile-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
}

.profile-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;

  min-width: 220px;
  padding: 1rem;

  background: var(--surface);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
}

.dropdown-header {
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.dropdown-header h3,
.dropdown-header p {
  margin: 0;
}

.dropdown-header p {
  color: var(--text-muted);
}

.btn-danger {
  width: 100%;
  border-radius: 8px;
  padding: 8px;
}
</style>
