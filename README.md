# pnpm-monorepo-example

[![Github Actions](https://github.com/jkomyno/pnpm-monorepo-example/actions/workflows/ci.yaml/badge.svg?branch=master)](https://github.com/jkomyno/pnpm-monorepo-example/actions/workflows/ci.yaml)

> Practical example of a `TypeScript` monorepo with [`pnpm`](https://pnpm.io), [`turborepo`](https://turborepo.org), and [`jest`](https://jestjs.io).

---------------------------------------------

## What's Included

- `pnpm` workspace, whose configuration is stored in [`pnpm-workspace.yaml`](/pnpm-workspace.yaml). Two example packages are included, [`common-utils`](packages/common-utils) and [`example`](packages/example), with the latter importing `common-utils` as a dependency. All local packages are decorated with a `@jkomyno/*` scope (you may want to substitute these instances in the `name` entries of any `package.json` with yours or your company's name).
- `turborepo`, whose configuration is stored in [`turbo.json`](./turbo.json)
- an example [`Dockerfile`](./Dockerfile.pnpm) that can be built and used as a base image for your Node.js Docker containers.
- the `jest` test engine, whose configuration is stored in the [`packages/jest`](./packages/jest) folder.
- opinionated [`prettier`](https://prettier.io) and [`eslint`](https://eslint.org) setups.

## Available Scripts

- `pnpm install`: install the dependencies needed for each package.
- `pnpm build`: transpile the local TypeScript packages to JavaScript.
- `pnpm eslint-check`: check that the code follows the `eslint` guidelines.
- `pnpm prettier-check`: check that the code follows the `prettier` guidelines.
- `pnpm prettier-write`: override the code to follow the `prettier` guidelines.
- `pnpm test:unit`: run unit tests.
- `pnpm test:integration`: run integration tests.

## Test Structure

We follow an opinionated convention for storing an running tests.
All tests should be written in the `__tests__` directory of a local package.
Moreover, unit tests should be placed in the `__tests__/unit` folder; similarly, integration tests should be placed in the `__tests__/integration` folder.
This allows for easily running groups of tests (for instance, you might want to run unit tests locally, while deferring integration tests - that will probably need access to external services like Docker containers - to the CI only).

In each local package's `package.json` file, make sure to replace the `JEST_LIB_UNDER_TEST` environment variable declaration with the local package name, for each `test*` command in the `scripts` section. 

## FAQ

1. How do I add a new package to the local workspace?

- Create a new folder `$packageName` in [`packages/`](packages/). Initialize it with a `tsconfig.json` file (which will reference the [`tsconfig.base.node.json`](./tsconfig.base.node.json) file at the root level) and a `package.json` file similarly to how it's done in the  [`common-utils`](packages/common-utils) package.

2. How do I add a new depedency that should be available to each package in the local workspace?

> `pnpm add -w $dependencyName`

## 👤 Author

Hi, I'm **Alberto Schiabel**, you can follow me on:

- Github: [@jkomyno](https://github.com/jkomyno)
- Twitter: [@jkomyno](https://twitter.com/jkomyno)

## 🦄 Show your support

Give a ⭐️ if this project helped or inspired you!

## 📝 License

Built with ❤️ by [Alberto Schiabel](https://github.com/jkomyno).<br />
This project is [MIT](https://github.com/jkomyno/pnpm-monorepo-example/blob/master/LICENSE) licensed.
