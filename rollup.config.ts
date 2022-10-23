import { fileURLToPath } from 'node:url'
import type { RollupOptions } from 'rollup'
import typescript from '@rollup/plugin-typescript'

const config: RollupOptions = {
  input: 'src/index.ts',
  output: {
    // Must be in the same directory as input for emoji.json to be resolved
    // properly. https://rollupjs.org/guide/en/#external
    file: 'src/bundle.js',
    format: 'cjs'
  },
  plugins: [typescript()],
  external: [
    'discord.js',
    'fs-extra',
    'mcproto',
    'child_process',
    fileURLToPath(new URL('./src/commands/emoji.json', import.meta.url))
  ]
}
export default config
