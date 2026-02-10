import { existsSync, readFileSync } from 'node:fs'
import { defineCommand } from 'citty'
import { resolve } from 'pathe'
import pc from 'picocolors'
import { cwdArgs } from './_shared'
import { parseEnvFile, resolveGraphQLUrl } from '../utils'

function detectPackageManagerFromLockfile(cwd: string): string {
  if (existsSync(resolve(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(resolve(cwd, 'yarn.lock'))) return 'yarn'
  if (existsSync(resolve(cwd, 'bun.lockb')) || existsSync(resolve(cwd, 'bun.lock'))) return 'bun'
  if (existsSync(resolve(cwd, 'package-lock.json'))) return 'npm'
  return 'unknown'
}

function getPackageVersion(pkg: Record<string, unknown>, name: string): string | undefined {
  const deps = pkg.dependencies as Record<string, string> | undefined
  const devDeps = pkg.devDependencies as Record<string, string> | undefined
  return deps?.[name] || devDeps?.[name]
}

export default defineCommand({
  meta: {
    name: 'info',
    description: 'Show project information'
  },
  args: {
    ...cwdArgs
  },
  async run({ args }) {
    const cwd = resolve(args.cwd)

    const rows: [string, string][] = []

    // OS & Node
    rows.push(['OS', `${process.platform} ${process.arch}`])
    rows.push(['Node.js', process.version])

    // Package manager
    rows.push(['Package Manager', detectPackageManagerFromLockfile(cwd)])

    // Read package.json
    const pkgPath = resolve(cwd, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>

      const wpnuxtVersion = getPackageVersion(pkg, '@wpnuxt/core')
      if (wpnuxtVersion) rows.push(['@wpnuxt/core', wpnuxtVersion])

      const nuxtVersion = getPackageVersion(pkg, 'nuxt')
      if (nuxtVersion) rows.push(['nuxt', nuxtVersion])

      const nuxtUiVersion = getPackageVersion(pkg, '@nuxt/ui')
      if (nuxtUiVersion) rows.push(['@nuxt/ui', nuxtUiVersion])
    }
    else {
      rows.push(['package.json', pc.yellow('not found')])
    }

    // .env
    const env = parseEnvFile(cwd)
    const wpUrl = env.WPNUXT_WORDPRESS_URL
    if (wpUrl) {
      rows.push(['WordPress URL', wpUrl])
      rows.push(['GraphQL Endpoint', resolveGraphQLUrl(wpUrl)])
    }
    else {
      rows.push(['WordPress URL', pc.yellow('not set')])
    }

    // Print table
    console.log()
    console.log(pc.bold('WPNuxt Project Info'))
    console.log()
    const maxLabel = Math.max(...rows.map(r => r[0].length))
    for (const [label, value] of rows) {
      console.log(`  ${pc.cyan(label.padEnd(maxLabel))}  ${value}`)
    }
    console.log()
  }
})
