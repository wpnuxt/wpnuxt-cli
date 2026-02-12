import { defineCommand } from 'citty'
import { version } from '../package.json'
import { commands } from './commands'

export const main = defineCommand({
  meta: {
    name: 'wpnuxi',
    version,
    description: 'WPNuxt CLI'
  },
  subCommands: commands
})
