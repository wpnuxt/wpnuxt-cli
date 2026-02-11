import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { defineCommand } from 'citty'
import * as p from '@clack/prompts'
import { downloadTemplate } from 'giget'
import { detectPackageManager, installDependencies } from 'nypm'
import { resolve } from 'pathe'
import pc from 'picocolors'
import { isDirEmpty, isValidUrl, wpNuxtAscii, themeColor } from '../utils'
// import { addBlocks, addAuth } from '../add'

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
    template: {
      type: 'string',
      description: 'Template to use (full, minimal)',
      alias: 't'
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
    },
    add: {
      type: 'string',
      description: 'Modules to add for minimal template (comma-separated: blocks,auth)'
    }
  },
  async run({ args }) {
    process.stdout.write(`\n${wpNuxtAscii}\n\n`)
    p.intro(pc.bold('Welcome to WPNuxt!'.split('').map(c => `${themeColor}${c}`).join('')))

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

    // WordPress environment
    let wpUrl = args['wordpress-url']
    let usedPlayground = false
    if (!wpUrl) {
      const wpEnv = await p.select({
        message: 'WordPress environment',
        initialValue: 'playground',
        options: [
          { value: 'playground', label: 'Blueprint Playground (included)', hint: 'no WordPress setup needed' },
          { value: 'custom', label: 'Existing WordPress instance', hint: 'requires WPGraphQL plugin' }
        ]
      })
      if (p.isCancel(wpEnv)) return onCancel()

      if (wpEnv === 'custom') {
        const result = await p.text({
          message: 'WordPress site URL',
          placeholder: 'https://my-wordpress-site.com',
          validate(value) {
            if (!value) return 'URL is required'
            if (!isValidUrl(value)) return 'Please enter a valid URL (http:// or https://)'
          }
        })
        if (p.isCancel(result)) return onCancel()
        wpUrl = result
      }
      else {
        wpUrl = DEFAULT_WP_URL
        usedPlayground = true
      }
    }
    else if (!isValidUrl(wpUrl)) {
      p.log.error('Invalid WordPress URL. Must start with http:// or https://')
      process.exit(1)
    }
    wpUrl = wpUrl.replace(/\/+$/, '')

    // Template
    let template = args.template
    if (!template) {
      const result = await p.select({
        message: 'Template',
        initialValue: 'full',
        options: [
          { value: 'full', label: 'Full (recommended)', hint: 'core + blocks + auth + Nuxt UI' },
          { value: 'minimal', label: 'Minimal', hint: 'core only, without Nuxt UI' }
        ]
      })
      if (p.isCancel(result)) return onCancel()
      template = result
    }
    else if (!['full', 'minimal'].includes(template)) {
      p.log.error('Invalid template. Must be "full" or "minimal".')
      process.exit(1)
    }

    // TODO: Minimal template: ask about additional modules
    // let shouldAddBlocks = false
    // let shouldAddAuth = false

    // if (template === 'minimal') {
    //   const addFlag = args.add
    //   if (addFlag) {
    //     const modules = addFlag.split(',').map(m => m.trim())
    //     shouldAddBlocks = modules.includes('blocks')
    //     shouldAddAuth = modules.includes('auth')
    //   }
    //   else {
    //     const blocksResult = await p.confirm({
    //       message: 'Add @wpnuxt/blocks?',
    //       initialValue: false
    //     })
    //     if (p.isCancel(blocksResult)) return onCancel()
    //     shouldAddBlocks = blocksResult

    //     const authResult = await p.confirm({
    //       message: 'Add @wpnuxt/auth?',
    //       initialValue: false
    //     })
    //     if (p.isCancel(authResult)) return onCancel()
    //     shouldAddAuth = authResult
    //   }
    // }

    const templateRepo = template === 'minimal' ? 'github:wpnuxt/starter-minimal' : 'github:wpnuxt/starter'

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
      await downloadTemplate(templateRepo, { dir: targetDir, force: true })
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

    // TODO: Add optional modules for minimal template
    // if (template === 'minimal') {
    //   if (shouldAddBlocks) {
    //     s.start('Adding @wpnuxt/blocks...')
    //     try {
    //       await addBlocks({ cwd: targetDir, skipInstall: true })
    //       s.stop('@wpnuxt/blocks added.')
    //     }
    //     catch (err) {
    //       s.stop(pc.yellow('Failed to add @wpnuxt/blocks.'))
    //       p.log.warn(String(err))
    //     }
    //   }

    //   if (shouldAddAuth) {
    //     s.start('Adding @wpnuxt/auth...')
    //     try {
    //       await addAuth({ cwd: targetDir, skipInstall: true })
    //       s.stop('@wpnuxt/auth added.')
    //     }
    //     catch (err) {
    //       s.stop(pc.yellow('Failed to add @wpnuxt/auth.'))
    //       p.log.warn(String(err))
    //     }
    //   }
    // }

    // Install dependencies
    if (!args['skip-install']) {
      s.start(`Installing dependencies with ${pm}...`)
      try {
        await installDependencies({ cwd: targetDir, silent: true, ignoreWorkspace: true, packageManager: { name: pm as 'npm' | 'pnpm' | 'yarn' | 'bun', command: pm } })
        s.stop('Dependencies installed.')
      }
      catch {
        // Postinstall may fail (e.g. blueprint not running) but deps are installed
        s.stop('Dependencies installed.')
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
        usedPlayground ? `${pm} run dev:blueprint` : `${pm} run dev`
      ].filter(Boolean).join('\n'),
      'Next steps'
    )

    p.outro(pc.green('Project created!'))
  }
})
