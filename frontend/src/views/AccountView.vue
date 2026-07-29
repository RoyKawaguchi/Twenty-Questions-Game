<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { getUserInfo, deleteAccount, setShowOnLeaderboard } from '../services/api'
import { logout } from '../services/authService.js'
import { initializeSocketConnection } from '../services/socket'

const authStore = useAuthStore()

const showOnLeaderboard = ref(true)

function handleChangeUsername() {
  alert('Feature coming soon!')
}

function handleChangeEmail() {
  alert('Feature coming soon!')
}

function handleChangePassword() {
  alert('Feature coming soon!')
}

async function handleToggleShowOnLeaderboard() {
  try {
    const newValue = !showOnLeaderboard.value

    showOnLeaderboard.value = newValue

    await setShowOnLeaderboard(newValue)
  } catch (err) {
    console.error('Failed to update leaderboard visibility:', err)

    showOnLeaderboard.value = !showOnLeaderboard.value
  }
}
function handleDeleteAccount() {
  if (confirm('Are you sure you want to delete the account? This cannot be undone.')) {
    if (confirm('ARE YOU REALLY SURE? This will delete all of your match history.')) {
      if (confirm('FINAL WARNING. DELETING YOUR ACCOUNT.')) {
        try {
          const data = deleteAccount()
          logout()
        } catch (err) {
          console.error('Failed to delete account:', err)
        }
      }
    }
  }
}

onMounted(async () => {
  initializeSocketConnection()

  try {
    const data = await getUserInfo()
    showOnLeaderboard.value = data.showOnLeaderboard
  } catch (err) {
    console.error('Failed to load user info:', err)
  }
})
</script>

<template>
  <div class="settings-page">
    <div class="settings-card gradient-card animate-in">
      <div class="settings-header">
        <h2>Account Settings</h2>
        <p>Manage your account details, and privacy/security settings.</p>
      </div>

      <div class="settings-section">
        <div class="setting-row">
          <div>
            <h3>Username</h3>
            <p>{{ authStore.username }}</p>
          </div>

          <button class="btn-primary" @click="handleChangeUsername">Change Username</button>
        </div>

        <div class="setting-row">
          <div>
            <h3>Email</h3>
            <p>{{ authStore.email }}</p>
          </div>

          <button class="btn-primary" @click="handleChangeEmail">Change Email</button>
        </div>

        <div class="setting-row">
          <div>
            <h3>Password</h3>
            <p>••••••••••••</p>
          </div>

          <button class="btn-primary" @click="handleChangePassword">Change Password</button>
        </div>

        <div class="setting-row">
          <div>
            <h3>Public Leaderboard</h3>
            <p>
              {{
                showOnLeaderboard
                  ? 'Your profile is currently VISIBLE on the leaderboard.'
                  : 'Your profile is currently HIDDEN from the leaderboard.'
              }}
            </p>
          </div>

          <button
            class="toggle"
            :class="{ active: showOnLeaderboard }"
            @click="handleToggleShowOnLeaderboard"
            :aria-pressed="showOnLeaderboard"
          >
            <span class="toggle-knob"></span>
          </button>
        </div>
      </div>

      <div class="danger-section">
        <h3>Danger Zone</h3>

        <p>This cannot be undone. Please proceed carefully.</p>

        <div class="danger-buttons">
          <button class="btn-danger" @click="handleDeleteAccount">Delete Account</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 850px;
  margin: 40px auto;
  padding: 0 20px;
}

.settings-card {
  border-radius: 14px;
  padding: 24px;
}

.settings-header {
  margin-bottom: 30px;
}

.settings-header h2 {
  margin: 0;
  color: white;
  font-size: 2rem;
}

.settings-header p {
  margin-top: 8px;
  color: #a1a1aa;
  line-height: 1.5;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 20px;
  border-radius: 12px;

  background: #27272a;
  border: 1px solid #3f3f46;
}

.setting-row h3 {
  margin: 0;
  color: white;
  font-size: 1rem;
}

.setting-row p {
  margin-top: 6px;
  color: #a1a1aa;
}

.btn-primary {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;

  background: #2563eb;
  color: white;
  font-weight: 600;

  transition: 0.15s;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.toggle {
  width: 52px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid #3f3f46;
  background: #27272a;
  padding: 3px;
  cursor: pointer;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
}

.toggle-knob {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #a1a1aa;
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.toggle.active {
  background: rgba(37, 99, 235, 0.35);
  border-color: #60a5fa;
}

.toggle.active .toggle-knob {
  transform: translateX(24px);
  background: #60a5fa;
}

.danger-section {
  margin-top: 40px;

  padding: 22px;

  border-radius: 12px;

  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(127, 29, 29, 0.12);
}

.danger-section h3 {
  margin: 0;
  color: #f87171;
}

.danger-section p {
  margin: 8px 0 20px;
  color: #a1a1aa;
}

.danger-buttons {
  display: flex;
  gap: 12px;
}

.btn-secondary {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;

  cursor: pointer;

  background: #374151;
  color: white;
  font-weight: 600;

  transition: 0.15s;
}

.btn-secondary:hover {
  background: #4b5563;
}

.btn-danger {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;

  cursor: pointer;

  background: #dc2626;
  color: white;
  font-weight: 600;

  transition: 0.15s;
}

.btn-danger:hover {
  background: #b91c1c;
}

@media (max-width: 700px) {
  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .setting-row button {
    width: 100%;
  }

  .danger-buttons {
    flex-direction: column;
  }

  .danger-buttons button {
    width: 100%;
  }
}
</style>
