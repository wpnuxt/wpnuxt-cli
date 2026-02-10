import type { CommandDef } from 'citty'

function _rDefault(mod: { default: CommandDef }) {
  return mod.default
}

export const commands = {
  init: () => import('./init').then(_rDefault),
  info: () => import('./info').then(_rDefault),
  doctor: () => import('./doctor').then(_rDefault)
} as Record<string, () => Promise<CommandDef>>
