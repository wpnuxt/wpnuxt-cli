import { defineCommand } from 'citty'
import init from '../../wpnuxi/src/commands/init'

export const main = defineCommand({
  meta: {
    name: 'create-wpnuxt',
    version: '0.1.0',
    description: 'Scaffold a WPNuxt project'
  },
  args: init.args,
  run: init.run!
})
