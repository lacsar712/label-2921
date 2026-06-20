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
          path: 'tags',
          name: 'Tags',
          component: () => import('../views/Tags.vue'),
        },
        {
          path: 'authors',
          name: 'Authors',
          component: () => import('../views/Authors.vue'),
        },
        {
          path: 'authors/:id',
          name: 'AuthorDetail',
          component: () => import('../views/AuthorDetail.vue'),
        },
        {
          path: 'publishers',
          name: 'Publishers',
          component: () => import('../views/Publishers.vue'),
        },
        {
          path: 'publishers/:id',
          name: 'PublisherDetail',
          component: () => import('../views/PublisherDetail.vue'),
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
        {
          path: 'fines',
          name: 'Fines',
          component: () => import('../views/Fines.vue'),
        },
        {
          path: 'fine-ledger',
          name: 'FineLedger',
          component: () => import('../views/FineLedger.vue'),
        },
        {
          path: 'reading-rooms',
          name: 'ReadingRooms',
          component: () => import('../views/ReadingRooms.vue'),
        },
        {
          path: 'reading-rooms/:id',
          name: 'ReadingRoomDetail',
          component: () => import('../views/ReadingRoomDetail.vue'),
        },
        {
          path: 'seat-reservations',
          name: 'SeatReservations',
          component: () => import('../views/SeatReservations.vue'),
        },
        {
          path: 'reviews',
          name: 'Reviews',
          component: () => import('../views/Reviews.vue'),
        },
        {
          path: 'announcements',
          name: 'Announcements',
          component: () => import('../views/Announcements.vue'),
        },
        {
          path: 'donations',
          name: 'Donations',
          component: () => import('../views/Donations.vue'),
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
