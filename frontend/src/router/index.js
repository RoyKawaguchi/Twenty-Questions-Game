import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import LoginView from '../views/auth_views/LoginView.vue'
import SignupView from '../views/auth_views/SignupView.vue'
import GuestView from '../views/auth_views/GuestView.vue'

import AboutView from '../views/AboutView.vue'
import HomeView from '../views/HomeView.vue'
import FeedbackFormView from '../views/FeedbackFormView.vue'
import ProfileView from '../views/ProfileView.vue'
import LeaderboardView from '../views/LeaderboardView.vue'
import GuideView from '../views/GuideView.vue'
import NotFoundView from '../views/NotFoundView.vue'

import SPGameView from '../views/sp_views/SPGame.vue'
import SPSelectCategoryView from '../views/sp_views/SPSelectCategory.vue'
import MPCreateRoomView from '../views/mp_views/MPCreateRoom.vue'
import MPGame from '../views/mp_views/MPGame.vue'
import MPLobby from '../views/mp_views/MPLobby.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/signup',
      name: 'signup',
      component: SignupView,
    },
    {
      path: '/guest',
      name: 'guest',
      component: GuestView,
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
    },
    {
      path: '/feedback',
      name: 'feedback',
      component: FeedbackFormView,
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true },
    },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      component: LeaderboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/guide',
      name: 'guide',
      component: GuideView,
      meta: { requiresAuth: true },
    },
    {
      path: '/singleplayer',
      name: 'singleplayer',
      component: SPSelectCategoryView,
      meta: { requiresAuth: true },
    },
    {
      path: '/singleplayer/play',
      name: 'singleplayerPlay',
      component: SPGameView,
      meta: { requiresAuth: true },
    },
    {
      path: '/multiplayer/create',
      name: 'multiplayer',
      component: MPCreateRoomView,
      meta: { requiresAuth: true },
    },
    {
      path: '/multiplayer/lobby/:id',
      name: 'multiplayeLobby',
      component: MPLobby,
      meta: { requiresAuth: true },
    },
    {
      path: '/multiplayer/play/:id',
      name: 'multiplayerPlay',
      component: MPGame,
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],

  scrollBehavior() {
    return {
      top: 0,
      behavior: 'instant',
    }
  },
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.username) {
    return '/login'
  }
})

export default router
