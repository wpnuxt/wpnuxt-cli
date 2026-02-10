import { existsSync, readdirSync } from 'node:fs'

export function isDirEmpty(path: string): boolean {
  if (!existsSync(path)) return true
  return readdirSync(path).length === 0
}
