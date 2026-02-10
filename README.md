# WPNuxt CLI

Command-line tools for [WPNuxt](https://wpnuxt.com) projects.

## Packages

| Package | Description |
|---------|-------------|
| [wpnuxi](./packages/wpnuxi) | Main CLI with `init`, `info`, and `doctor` commands |
| [create-wpnuxt](./packages/create-wpnuxt) | Project scaffolding via `npm create wpnuxt` |

## Quick Start

```bash
npm create wpnuxt
```

This scaffolds a new WPNuxt project with a starter template, `.env` configuration, and optional git setup.

## Commands

### `wpnuxi init`

Scaffold a new WPNuxt project (same as `npm create wpnuxt`).

```bash
wpnuxi init my-app --wordpress-url https://my-site.com --pm pnpm
```

### `wpnuxi info`

Display project information — versions, package manager, WordPress URL.

```bash
wpnuxi info --cwd /path/to/project
```

### `wpnuxi doctor`

Run health checks against a WPNuxt project.

```bash
wpnuxi doctor --cwd /path/to/project
```

Checks:
- `.env` has `WPNUXT_WORDPRESS_URL`
- WordPress URL is valid
- GraphQL endpoint is reachable
- WPGraphQL introspection is enabled
- `@wpnuxt/core` and `nuxt` are in `package.json`

## Development

```bash
pnpm install
pnpm build
```

Test locally:

```bash
node packages/wpnuxi/bin/wpnuxi.mjs --help
```

## License

[MIT](./LICENSE)
