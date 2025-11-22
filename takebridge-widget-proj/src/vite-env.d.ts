/// <reference types="vite/client" />

// Type definitions for window.api
export {}

declare global {
  interface Window {
    api: {
      runTask: (payload: { task: string; baseUrl: string; jwtToken: string }) => Promise<any>
    }
  }
}