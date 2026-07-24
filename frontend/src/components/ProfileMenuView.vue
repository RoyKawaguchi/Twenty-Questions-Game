<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore.js'
import { logout } from '../services/authService.js'

const authStore = useAuthStore()
const isOpen = ref(false) // Manages visibility of the dropdown

function handleLogOut() {
  if (confirm('Are you sure you want to log out?')) {
    logout()
  }
}
</script>

<template>
  <div class="profile-menu-container">
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

<style>
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

  background: #2b2b2b;
  color: #f5f5f5;
  border: 1px solid #444;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.dropdown-header {
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #444;
}

.dropdown-header h3,
.dropdown-header p {
  margin: 0;
}

.dropdown-header p {
  color: #bdbdbd;
}

.btn-danger {
  width: 100%;
}
</style>
