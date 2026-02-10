import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { defineCommand } from 'citty'
import * as p from '@clack/prompts'
import { downloadTemplate } from 'giget'
import { detectPackageManager, installDependencies } from 'nypm'
import { resolve } from 'pathe'
import pc from 'picocolors'
import { isDirEmpty, isValidUrl } from '../utils'

const DEFAULT_WP_URL = 'http://127.0.0.1:9400'

function onCancel() {
  p.cancel('Operation cancelled.')
  process.exit(0)
}

export default defineCommand({
  meta: {
    name: 'init',
    description: 'Scaffold a new WPNuxt project'
  },
  args: {
    dir: {
      type: 'positional',
      description: 'Project directory',
      required: false
    },
    'wordpress-url': {
      type: 'string',
      description: 'WordPress site URL',
      alias: 'w'
    },
    pm: {
      type: 'string',
      description: 'Package manager (npm, pnpm, yarn, bun)'
    },
    'skip-install': {
      type: 'boolean',
      description: 'Skip dependency installation',
      default: false
    },
    'skip-git': {
      type: 'boolean',
      description: 'Skip git initialization',
      default: false
    }
  },
  async run({ args }) {
    p.intro(pc.bold('create-wpnuxt'))

    // Project name
    let dir = args.dir
    if (!dir) {
      const result = await p.text({
        message: 'Project name',
        placeholder: 'my-wpnuxt-app',
        defaultValue: 'my-wpnuxt-app',
        validate(value) {
          if (!value) return 'Project name is required'
        }
      })
      if (p.isCancel(result)) return onCancel()
      dir = result
    }

    const targetDir = resolve(dir)

    if (!isDirEmpty(targetDir)) {
      p.log.error(`Directory ${pc.bold(dir)} is not empty.`)
      process.exit(1)
    }

    // WordPress URL
    let wpUrl = args['wordpress-url']
    if (!wpUrl) {
      const result = await p.text({
        message: 'WordPress site URL',
        placeholder: DEFAULT_WP_URL,
        defaultValue: DEFAULT_WP_URL,
        validate(value) {
          if (!isValidUrl(value)) return 'Please enter a valid URL (http:// or https://)'
        }
      })
      if (p.isCancel(result)) return onCancel()
      wpUrl = result
    }
    else if (!isValidUrl(wpUrl)) {
      p.log.error('Invalid WordPress URL. Must start with http:// or https://')
      process.exit(1)
    }

    // Package manager
    let pm = args.pm
    if (!pm) {
      const detected = await detectPackageManager(process.cwd()).catch(() => undefined)
      const defaultPm = detected?.name || 'pnpm'
      const result = await p.select({
        message: 'Package manager',
        initialValue: defaultPm,
        options: [
          { value: 'pnpm', label: 'pnpm' },
          { value: 'npm', label: 'npm' },
          { value: 'yarn', label: 'yarn' },
          { value: 'bun', label: 'bun' }
        ]
      })
      if (p.isCancel(result)) return onCancel()
      pm = result
    }

    // Git init
    let initGit = !args['skip-git']
    if (initGit && !args['skip-git'] && !args.dir) {
      const result = await p.confirm({
        message: 'Initialize a git repository?',
        initialValue: true
      })
      if (p.isCancel(result)) return onCancel()
      initGit = result
    }

    // Download template
    const s = p.spinner()
    s.start('Downloading template...')
    try {
      await downloadTemplate('github:wpnuxt/starter', { dir: targetDir, force: true })
      s.stop('Template downloaded.')
    }
    catch (err) {
      s.stop('Failed to download template.')
      p.log.error(String(err))
      process.exit(1)
    }

    // Write .env
    p.log.step('Configuring environment...')
    writeFileSync(resolve(targetDir, '.env'), `WPNUXT_WORDPRESS_URL=${wpUrl}\n`)

    // Install dependencies
    if (!args['skip-install']) {
      s.start(`Installing dependencies with ${pm}...`)
      try {
        await installDependencies({ cwd: targetDir, packageManager: { name: pm as 'npm' | 'pnpm' | 'yarn' | 'bun', command: pm } })
        s.stop('Dependencies installed.')
      }
      catch {
        s.stop(pc.yellow('Failed to install dependencies. You can install them manually.'))
      }
    }

    // Git init
    if (initGit) {
      s.start('Initializing git repository...')
      try {
        execSync('git init', { cwd: targetDir, stdio: 'ignore' })
        execSync('git add -A', { cwd: targetDir, stdio: 'ignore' })
        execSync('git commit -m "initial commit"', { cwd: targetDir, stdio: 'ignore' })
        s.stop('Git repository initialized.')
      }
      catch {
        s.stop(pc.yellow('Failed to initialize git repository.'))
      }
    }

    // Next steps
    const relativePath = dir === '.' ? '' : dir
    p.note(
      [
        relativePath && `cd ${relativePath}`,
        `${pm} run dev:blueprint    ${pc.dim('WordPress Playground + Nuxt')}`,
        `${pm} run dev              ${pc.dim('Nuxt with your WordPress site')}`
      ].filter(Boolean).join('\n'),
      'Next steps'
    )

    p.outro(pc.green('Project created!'))
  }
})
