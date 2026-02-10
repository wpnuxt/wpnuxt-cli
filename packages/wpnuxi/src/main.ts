import { defineCommand } from 'citty'
import { commands } from './commands'

export const main = defineCommand({
  meta: {
    name: 'wpnuxi',
    version: '0.1.0',
    description: 'WPNuxt CLI'
  },
  subCommands: commands
})
