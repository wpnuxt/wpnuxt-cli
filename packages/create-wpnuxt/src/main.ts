import { defineCommand } from 'citty'
import { version } from '../package.json'
import init from '../../wpnuxi/src/commands/init'

export const main = defineCommand({
  meta: {
    name: 'create-wpnuxt',
    version,
    description: 'Scaffold a WPNuxt project'
  },
  args: init.args,
  run: init.run!
})
