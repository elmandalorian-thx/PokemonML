import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from GitHub Pages at /PokemonML/
export default defineConfig({
  base: '/PokemonML/',
  plugins: [react()],
})
