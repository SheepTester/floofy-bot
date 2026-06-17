import esbuild from 'esbuild'

const context = await esbuild.context({
  entryPoints: ['src/index.ts'],
  outdir: 'dist/',
  platform: 'node',
  packages: 'external',
  format: 'esm',
  bundle: true
})

const [, , mode] = process.argv
switch (mode) {
  case 'build': {
    await context.rebuild()
    await context.dispose()
    break
  }
  case 'watch': {
    await context.watch()
    break
  }
  default: {
    console.error('usage: node esbuild.config.ts (build|watch)')
    process.exit(1)
  }
}
