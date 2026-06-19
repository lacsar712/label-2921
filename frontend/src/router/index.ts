import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../store/user';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { guest: true },
    },
    {
      path: '/',
      component: () => import('../layout/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('../views/Dashboard.vue'),
        },
        {
          path: 'books',
          name: 'Books',
          component: () => import('../views/Books.vue'),
        },
        {
          path: 'categories',
          name: 'Categories',
          component: () => import('../views/Categories.vue'),
        },
        {
          path: 'borrowers',
          name: 'Borrowers',
          component: () => import('../views/Borrowers.vue'),
        },
        {
          path: 'system-settings',
          name: 'SystemSettings',
          component: () => import('../views/SystemSettings.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'borrows',
          name: 'Borrows',
          component: () => import('../views/Borrows.vue'),
        },
        {
          path: 'current-borrows',
          name: 'CurrentBorrows',
          component: () => import('../views/CurrentBorrows.vue'),
        },
        {
          path: 'reservations',
          name: 'Reservations',
          component: () => import('../views/Reservations.vue'),
        },

      ],
    },
  ],
});

router.beforeEach((to, _, next) => {
  const userStore = useUserStore();
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next('/login');
  } else if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next('/');
  } else if (to.meta.guest && userStore.isAuthenticated) {
    next('/');
  } else {
    next();
  }
});

export default router;
