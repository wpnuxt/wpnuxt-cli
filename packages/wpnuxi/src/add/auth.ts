import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'pathe'
import { loadFile, writeFile } from 'magicast'

export interface AddAuthOptions {
  cwd: string
  skipInstall?: boolean
  force?: boolean
}

const LOGIN_PAGE_NUXT_UI = `<script setup lang="ts">
const { login, isLoading, error, isAuthenticated } = useWPAuth()
const router = useRouter()
const username = ref('')
const password = ref('')

async function onSubmit() {
  const result = await login({
    username: username.value,
    password: password.value
  })
  if (result.success) {
    router.push('/')
  }
}

watch(isAuthenticated, (value) => {
  if (value) router.push('/')
}, { immediate: true })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-xl font-bold">Login</h1>
      </template>

      <UForm :state="{ username, password }" @submit="onSubmit">
        <UFormField label="Username" name="username" class="mb-4">
          <UInput v-model="username" placeholder="Username" />
        </UFormField>

        <UFormField label="Password" name="password" class="mb-4">
          <UInput v-model="password" type="password" placeholder="Password" />
        </UFormField>

        <UAlert v-if="error" color="error" :title="error" class="mb-4" />

        <UButton type="submit" block :loading="isLoading">
          Sign in
        </UButton>
      </UForm>
    </UCard>
  </div>
</template>
`

const LOGIN_PAGE_PLAIN = `<script setup lang="ts">
const { login, isLoading, error, isAuthenticated } = useWPAuth()
const router = useRouter()
const username = ref('')
const password = ref('')

async function onSubmit() {
  const result = await login({
    username: username.value,
    password: password.value
  })
  if (result.success) {
    router.push('/')
  }
}

watch(isAuthenticated, (value) => {
  if (value) router.push('/')
}, { immediate: true })
</script>

<template>
  <div class="login-page">
    <form class="login-form" @submit.prevent="onSubmit">
      <h1>Login</h1>

      <div class="form-row">
        <label for="username">Username</label>
        <input id="username" v-model="username" type="text" placeholder="Username">
      </div>

      <div class="form-row">
        <label for="password">Password</label>
        <input id="password" v-model="password" type="password" placeholder="Password">
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="isLoading">
        {{ isLoading ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
}
.login-form {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,.1);
}
.login-form h1 {
  margin: 0 0 1.5rem;
  font-size: 1.25rem;
  font-weight: bold;
}
.form-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.form-row label {
  width: 5rem;
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 500;
}
.form-row input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}
.form-row input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59,130,246,.3);
}
.error {
  color: #dc2626;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}
button[type="submit"] {
  width: 100%;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: #fff;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button[type="submit"]:hover { background: #2563eb; }
button[type="submit"]:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
`

export async function addAuth(options: AddAuthOptions): Promise<void> {
  const { cwd } = options
  const configPath = resolve(cwd, 'nuxt.config.ts')

  if (!existsSync(configPath)) {
    throw new Error('nuxt.config.ts not found. Are you in a Nuxt project?')
  }

  // Update nuxt.config.ts
  const mod = await loadFile(configPath)
  const config = mod.exports.default.$args[0]

  if (!config.modules) config.modules = []
  if (!config.modules.includes('@wpnuxt/auth')) {
    config.modules.push('@wpnuxt/auth')
  }

  if (!config.wpNuxtAuth) config.wpNuxtAuth = {}
  config.wpNuxtAuth.providers = {
    password: true,
    headlessLogin: true,
  }

  await writeFile(mod, configPath)

  // Update package.json
  const pkgPath = resolve(cwd, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  pkg.dependencies ||= {}
  if (!pkg.dependencies['@wpnuxt/auth']) {
    pkg.dependencies['@wpnuxt/auth'] = 'latest'
  }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  // Scaffold login page
  const hasNuxtUI = !!(pkg.dependencies?.['@nuxt/ui'] || pkg.devDependencies?.['@nuxt/ui'])
  const loginTemplate = hasNuxtUI ? LOGIN_PAGE_NUXT_UI : LOGIN_PAGE_PLAIN

  // Detect app/ directory structure
  const appPagesDir = resolve(cwd, 'app', 'pages')
  const rootPagesDir = resolve(cwd, 'pages')
  const pagesDir = existsSync(resolve(cwd, 'app')) ? appPagesDir : rootPagesDir
  const loginPath = resolve(pagesDir, 'login.vue')

  if (!existsSync(loginPath) || options.force) {
    mkdirSync(pagesDir, { recursive: true })
    writeFileSync(loginPath, loginTemplate)
  }

  // Add login link to app.vue nav
  const appVuePath = resolve(cwd, 'app', 'app.vue')
  const rootAppVuePath = resolve(cwd, 'app.vue')
  const appPath = existsSync(appVuePath) ? appVuePath : existsSync(rootAppVuePath) ? rootAppVuePath : null

  if (appPath) {
    let appContent = readFileSync(appPath, 'utf-8')
    if (!appContent.includes('/login') && !appContent.includes('useWPAuth')) {
      // Add useWPAuth composable to script setup
      appContent = appContent.replace(
        '<script setup lang="ts">',
        `<script setup lang="ts">\nconst { isAuthenticated, logout } = useWPAuth()`
      )
      // Make nav flex and add login/logout link pushed to the right
      appContent = appContent.replace(
        '<nav v-if="menu">',
        '<nav v-if="menu" style="display: flex; gap: 1rem; align-items: center;">'
      )
      appContent = appContent.replace(
        '</nav>',
        `  <NuxtLink v-if="!isAuthenticated" to="/login" style="margin-left: auto;">Login</NuxtLink>\n      <button v-else style="margin-left: auto;" @click="logout()">Logout</button>\n    </nav>`
      )
      writeFileSync(appPath, appContent)
    }
  }
}
