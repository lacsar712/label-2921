import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore } from './user';

describe('user store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('sets auth data', () => {
    const store = useUserStore();
    store.setAuth('token123', { id: 1, username: 'admin', role: 'ADMIN' });
    expect(store.token).toBe('token123');
    expect(store.user?.username).toBe('admin');
  });

  it('logs out properly', () => {
    const store = useUserStore();
    store.setAuth('token123', { id: 1, username: 'admin', role: 'ADMIN' });
    store.logout();
    expect(store.token).toBe('');
    expect(store.user).toBeNull();
  });
});
