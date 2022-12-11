# XtremeJS 2022: Write a Scraper as a State Machine with Playwright and Kafka

[![Github Actions](https://github.com/jkomyno/xtremejs-2022/actions/workflows/ci.yaml/badge.svg?branch=master)](https://github.com/jkomyno/xtremejs-2022/actions/workflows/ci.yaml)

> Accompanying code for my talk at [XtremeJS 2022](https://xtremejs.dev/2022/schedule/).

---------------------------------------------

## What this is about

Designing a scraper is a daunting task, yet a useful one. Often, scraping is the most viable way of programmatically retrieving data when no public API is accessible. In this talk, we’ll design a loosely coordinated system of microservices that scrape information from [Glassdoor](https://www.glassdoor.com). You’ll learn how to start from a high-level state machine design to then dive deep into the implementation with `Playwright`, where we’ll discuss its capabilities and gotchas. Finally, we’ll see a demo of the open-source implementation, written using `TypeScript` and `Kafka.js`.

## 🚀 Getting started

1.  **Install dependencies**

    We recommend using [pnpm](https://pnpm.io/) to install dependencies, but you could use `npm` as well.

    ```sh
    pnpm i
    ```

2. **Run tests**
    You can run unit tests with 

    ```sh
    pnpm test:unit
    ```
    or integration tests with:

    ```sh
    pnpm test:integration
    ```

    If you want to run both, you can just use

    ```sh
    pnpm test
    ```

## 👤 Author

Hi, I'm **Alberto Schiabel**, you can follow me on:

- Github: [@jkomyno](https://github.com/jkomyno)
- Twitter: [@jkomyno](https://twitter.com/jkomyno)

## 🦄 Show your support

Give a ⭐️ if this project helped or inspired you!

## 📝 License

Built with ❤️ by [Alberto Schiabel](https://github.com/jkomyno).<br />
This project is [MIT](https://github.com/jkomyno/xtremejs-2022/blob/master/LICENSE) licensed.
