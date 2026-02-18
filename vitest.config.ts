import { defineConfig } from 'vitest/config'
import path from 'path'

const alias = {
  '@': path.resolve(__dirname, './'),
}

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias,
        },
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          include: ['**/*.test.ts'],
          exclude: ['node_modules', 'e2e', 'hooks/**/*.test.ts'],
          pool: 'forks',
        },
      },
      {
        resolve: {
          alias,
        },
        test: {
          name: 'hooks-jsdom',
          globals: true,
          environment: 'jsdom',
          include: ['hooks/**/*.test.ts'],
          exclude: ['node_modules', 'e2e'],
          pool: 'forks',
        },
      },
    ],
  },
  resolve: {
    alias,
  },
})
