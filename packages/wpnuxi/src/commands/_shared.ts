import type { ArgDef } from 'citty'

export const cwdArgs = {
  cwd: {
    type: 'string',
    description: 'Working directory',
    default: '.'
  }
} satisfies Record<string, ArgDef>
