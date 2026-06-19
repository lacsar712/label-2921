import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';

vi.mock('axios', async () => {
  const actual = await vi.importActual('axios') as any;
  return {
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
    },
  };
});

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
  },
}));

describe('Axios Instance', () => {
  it('should be created with correct config', () => {
    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: '/api',
      timeout: 10000,
    }));
  });
});
