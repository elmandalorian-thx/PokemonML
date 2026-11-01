import react from '@vitejs/plugin-react'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const BASE = '/PokemonML/'
const DATA_DIR = fileURLToPath(new URL('../data/raw/', import.meta.url))
const csvFiles = () => readdirSync(DATA_DIR).filter((f) => f.endsWith('.csv'))

/** Serves the original Kaggle CSVs (single copy in data/raw/) at <base>data/kaggle/*.csv in dev and build. */
function kaggleData(): Plugin {
  return {
    name: 'kaggle-data',
    configureServer(server) {
      server.middlewares.use(`${BASE}data/kaggle`, (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '')
        if (!csvFiles().includes(name)) return next()
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.end(readFileSync(DATA_DIR + name))
      })
    },
    generateBundle() {
      for (const f of csvFiles()) {
        this.emitFile({ type: 'asset', fileName: `data/kaggle/${f}`, source: readFileSync(DATA_DIR + f) })
      }
    },
  }
}

// Served from GitHub Pages at /PokemonML/
export default defineConfig({
  base: BASE,
  plugins: [react(), kaggleData()],
})
