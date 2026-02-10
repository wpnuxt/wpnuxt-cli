import { existsSync, readFileSync } from 'node:fs'
import { defineCommand } from 'citty'
import { resolve } from 'pathe'
import pc from 'picocolors'
import { cwdArgs } from './_shared'
import { isValidUrl, parseEnvFile, resolveGraphQLUrl, checkGraphQLHealth, checkIntrospection } from '../utils'

interface CheckResult {
  label: string
  status: 'pass' | 'fail' | 'warn'
  message?: string
  critical: boolean
}

export default defineCommand({
  meta: {
    name: 'doctor',
    description: 'Check project health'
  },
  args: {
    ...cwdArgs
  },
  async run({ args }) {
    const cwd = resolve(args.cwd)
    const results: CheckResult[] = []

    // Read package.json once
    const pkgPath = resolve(cwd, 'package.json')
    let pkg: Record<string, unknown> | undefined
    if (existsSync(pkgPath)) {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>
    }

    // Read .env once
    const env = parseEnvFile(cwd)
    const wpUrl = env.WPNUXT_WORDPRESS_URL

    // Check 1: .env has WPNUXT_WORDPRESS_URL
    if (wpUrl) {
      results.push({ label: '.env has WPNUXT_WORDPRESS_URL', status: 'pass', critical: true })
    }
    else {
      results.push({ label: '.env has WPNUXT_WORDPRESS_URL', status: 'fail', message: 'WPNUXT_WORDPRESS_URL not found in .env', critical: true })
    }

    // Check 2: WordPress URL is valid
    if (wpUrl && isValidUrl(wpUrl)) {
      results.push({ label: 'WordPress URL is valid', status: 'pass', critical: true })
    }
    else if (wpUrl) {
      results.push({ label: 'WordPress URL is valid', status: 'fail', message: `Invalid URL: ${wpUrl}`, critical: true })
    }
    else {
      results.push({ label: 'WordPress URL is valid', status: 'fail', message: 'No URL to validate', critical: true })
    }

    // Check 3 & 4: Network checks (only if URL is valid)
    if (wpUrl && isValidUrl(wpUrl)) {
      const graphqlUrl = resolveGraphQLUrl(wpUrl)

      // Check 3: GraphQL endpoint reachable
      const health = await checkGraphQLHealth(graphqlUrl)
      if (health.ok) {
        results.push({ label: 'GraphQL endpoint reachable', status: 'pass', critical: true })
      }
      else {
        results.push({ label: 'GraphQL endpoint reachable', status: 'fail', message: health.error, critical: true })
      }

      // Check 4: Introspection enabled
      const intro = await checkIntrospection(graphqlUrl)
      if (intro.ok) {
        results.push({ label: 'WPGraphQL introspection enabled', status: 'pass', critical: false })
      }
      else {
        results.push({ label: 'WPGraphQL introspection enabled', status: 'warn', message: intro.error, critical: false })
      }
    }
    else {
      results.push({ label: 'GraphQL endpoint reachable', status: 'fail', message: 'Skipped (no valid URL)', critical: true })
      results.push({ label: 'WPGraphQL introspection enabled', status: 'warn', message: 'Skipped (no valid URL)', critical: false })
    }

    // Check 5: @wpnuxt/core in package.json
    if (pkg) {
      const deps = pkg.dependencies as Record<string, string> | undefined
      const devDeps = pkg.devDependencies as Record<string, string> | undefined
      if (deps?.['@wpnuxt/core'] || devDeps?.['@wpnuxt/core']) {
        results.push({ label: '@wpnuxt/core in package.json', status: 'pass', critical: true })
      }
      else {
        results.push({ label: '@wpnuxt/core in package.json', status: 'fail', message: 'Not found in dependencies', critical: true })
      }
    }
    else {
      results.push({ label: '@wpnuxt/core in package.json', status: 'fail', message: 'package.json not found', critical: true })
    }

    // Check 6: nuxt in package.json
    if (pkg) {
      const deps = pkg.dependencies as Record<string, string> | undefined
      const devDeps = pkg.devDependencies as Record<string, string> | undefined
      if (deps?.['nuxt'] || devDeps?.['nuxt']) {
        results.push({ label: 'nuxt in package.json', status: 'pass', critical: true })
      }
      else {
        results.push({ label: 'nuxt in package.json', status: 'fail', message: 'Not found in dependencies', critical: true })
      }
    }
    else {
      results.push({ label: 'nuxt in package.json', status: 'fail', message: 'package.json not found', critical: true })
    }

    // Print results
    console.log()
    console.log(pc.bold('WPNuxt Doctor'))
    console.log()

    for (const r of results) {
      const icon = r.status === 'pass' ? pc.green('[PASS]') : r.status === 'warn' ? pc.yellow('[WARN]') : pc.red('[FAIL]')
      const msg = r.message ? pc.dim(` — ${r.message}`) : ''
      console.log(`  ${icon} ${r.label}${msg}`)
    }

    console.log()

    const criticalFails = results.filter(r => r.critical && r.status === 'fail')
    if (criticalFails.length > 0) {
      console.log(pc.red(`${criticalFails.length} critical issue(s) found.`))
      process.exit(1)
    }
    else {
      console.log(pc.green('All critical checks passed.'))
    }
  }
})
