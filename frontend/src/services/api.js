const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

const GAME_BASE_URL = `${BACKEND_URL}/api/game`
const AUTH_BASE_URL = `${BACKEND_URL}/api/auth`

/**
 * Shared internal helper to attach authentication bearer headers to outgoing requests.
 * @param {Object} customHeaders - Existing route headers
 * @returns {Object} Maintained header object combined with secure token string
 */
function getAuthenticatedHeaders(customHeaders = {}) {
  const baseHeaders = {
    'Content-Type': 'application/json',
    ...customHeaders,
  }
  if (localStorage.token) {
    baseHeaders['Authorization'] = `Bearer ${localStorage.token}`
  }
  return baseHeaders
}

// =====================================================================
// AUTHENTICATION BLUEPRINT API CALLS
// =====================================================================

export async function registerUser(username, email, password) {
  const response = await fetch(`${AUTH_BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Failed to sign up.')
  }
  return data
}

export async function loginUser(identity, password) {
  const response = await fetch(`${AUTH_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, password }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Invalid credentials.')
  }
  return data
}

export async function initializeGuestSession(nickname) {
  const response = await fetch(`${AUTH_BASE_URL}/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Failed to join as guest.')
  }
  return data
}

// =====================================================================
// STATIC REFERENCE DATA
// =====================================================================

export async function fetchCategories() {
  const response = await fetch(`${GAME_BASE_URL}/categories`, {
    method: 'GET',
    headers: getAuthenticatedHeaders(),
  })
  if (!response.ok) throw new Error('Failed to load categories.')

  return await response.json() // Returns { categories: [...] }
}

export async function fetchAllAnswers() {
  const response = await fetch(`${GAME_BASE_URL}/all_answers`, {
    method: 'GET',
    headers: getAuthenticatedHeaders(),
  })
  if (!response.ok) throw new Error('Failed to load answers.')

  return await response.json() // Returns { categories: { CategoryName: { items: [] } } }
}

export async function getUserInfo() {
  const response = await fetch(`${AUTH_BASE_URL}/user_info`, {
    method: 'GET',
    headers: getAuthenticatedHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to retrieve user info from pipeline.')
  }

  return await response.json()
}

export async function getLeaderboard() {
  const response = await fetch(`${AUTH_BASE_URL}/leaderboard`, {
    method: 'GET',
    headers: getAuthenticatedHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to retrieve user info from pipeline.')
  }

  return await response.json()
}
