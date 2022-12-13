# XtremeJS 2022: Write a Scraper as a State Machine with Playwright and Kafka

[![Github Actions](https://github.com/jkomyno/xtremejs-2022/actions/workflows/ci.yaml/badge.svg?branch=master)](https://github.com/jkomyno/xtremejs-2022/actions/workflows/ci.yaml)

> Accompanying code for my talk at [XtremeJS 2022](https://xtremejs.dev/2022/schedule/).

Slides for this talk are also available [here](https://jkomyno-xtremejs-2022.vercel.app).
A video of me running the demo is available [here](https://www.loom.com/share/ad141b76eff74064baf1437be58e6f24), as well as a brief discussion of the tests [here](https://www.loom.com/share/994db06c61744b5a836406c2206af91f).

---------------------------------------------

## What this is about

Designing a scraper is a daunting task, yet a useful one. Often, scraping is the most viable way of programmatically retrieving data when no public API is accessible. In this talk, we’ll design a loosely coordinated system of microservices that scrape information from [Glassdoor](https://www.glassdoor.com). You’ll learn how to start from a high-level state machine design to then dive deep into the implementation with `Playwright`, where we’ll discuss its capabilities and gotchas. Finally, we’ll see a demo of the open-source implementation, written using `TypeScript` and `Kafka.js`.

## Structure

This project is a [`pnpm`](https://pnpm.io/) monorepo written in `TypeScript` and tested on `Node.js` 18.

The packages are the following:

- [`@jkomyno/glassdoor-scraper-fsm`](./packages/glassdoor-scraper-fsm/): A state machine library for scraping users' data on Glassdoor, written with `playwright` and `xstate`.
- [`@jkomyno/glassdoor-scraper`](./packages/glassdoor-scraper/): The main application. It runs a long-running consume-and-produce loop in which, for each incoming message, it scrapes the data of the user identified by the message, and produces a new message with the scraped data upon completion. It uses `kafkajs`.
- [`@jkomyno/common-entities`](./packages/common-entities/): Library that contains common `zod` validation entities and types.

## 🚀 Getting started

1.  **Install dependencies**

    We recommend using [`pnpm`](https://pnpm.io/) for this project (although you may use `npm` as well).

    ```sh
    pnpm i
    ```

2. **Build the project**

    Run:

    ```sh
    pnpm build
    ```

3. **Run tests**
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

4. **Setup Kafka**

    - Install Docker, if you don't have it already
    - Run

        ```sh
        docker-compose -f docker/docker-compose.yml up
        ```

    This step will start a Kafka and a Zookeeper instance, as well as a Kafka UI tool.
    (Depending on your internet connection, this step might take a while).

    - Open [http://localhost:8080](http://localhost:8080) to access the Kafka UI tool.
      You can login with the default credentials (user: `admin@admin.io`; password: `admin`).

5. **Setup environment variables**
    - (Recommended):
        - Install [direnv](https://direnv.net/)
        - Run:

            ```sh
            direnv allow .
            ```

    - (Alternatively, on Linux/macOS):
        - Run:

            ```sh
            source .envrc
            ```
    
    - Make sure this setup succeeded by printing one of the environment variables defined in [`.envrc`](./.envrc). E.g.,:

        ```sh
        echo $KAFKA_BROKER_LIST
        ```
## Demo

Too busy to run the demo yourself? You can **watch a video** of it [here](https://www.loom.com/share/ad141b76eff74064baf1437be58e6f24).

1. **Start the Glassdoor scraper**
    - Run:
        
        ```sh
        pnpm --filter glassdoor-scraper start
        ```
    - Wait for the scraper to connect to Kafka. You should see a message similar to this in your terminal:

        ```sh
        [02:10:01.330] INFO (57014): Starting server @jkomyno/glassdoor-scraper
        [02:10:01.330] INFO (57014): subscribing to input topic...
            inputTopic: "input-glassdoor"
        {"level":"INFO","timestamp":"2022-12-12T01:10:25.022Z","logger":"kafkajs","message":"[ConsumerGroup] Consumer has joined the group","groupId":"@jkomyno/glassdoor-scraper","memberId":"@jkomyno/glassdoor-scraper-6a4dbc47-5e9b-48bc-b0a8-c2901a1d32cc","leaderId":"@jkomyno/glassdoor-scraper-6a4dbc47-5e9b-48bc-b0a8-c2901a1d32cc","isLeader":true,"memberAssignment":{"input-glassdoor":[0]},"groupProtocol":"RoundRobinAssigner","duration":23687}
        ```

2. **Open the Kafka UI**
    - Navigate to [http://localhost:8080](http://localhost:8080)
    - Login with the default credentials (user: `admin@admin.io`; password: `admin`).

3. **Create new Kafka topic** (`input-glassdoor`)
    - Navigate to the console at [http://localhost:8080/console](http://localhost:8080/console)
    - Click on the `Create Topic` button in the top-right corner
    - Create a new topic named `input-glassdoor`

4. **Produce a new Kafka message** (in `input-glassdoor`)
    - Navigate to the console at [http://localhost:8080/console](http://localhost:8080/console)
    - Click on the `input-glassdoor` topic
    - Click on the `Produce` tab in the top bar
    - In the `Key` field, type `test`
    - In the `Value` field, type the authentication credentials for your Glassdoor account, e.g.:
            
        ```json
        {
          "auth": {
            "email": "ravi.van.test@gmail.com",
            "password": "ravi.van.test@gmail.com"
          }
        }
        ```
    - Click on the `Produce` button

## Exercises for the audience

1. Extract the headless browser setup with `Playwright` out of the `xstate` machine configuration
    - This will allow us to reuse the same browser instance across multiple pages
    - What would happen to the browser session when you submit scraping jobs with different authentication credentials?
    - How would that impact the resource dispose strategy of [`@jkomyno/glassdoor-scraper`](./packages/glassdoor-scraper/)?

2. Implement a "retry" strategy for the whole scraping pipeline in [`@jkomyno/glassdoor-scraper`](./packages/glassdoor-scraper/)
    - You can use a standard bounded exponential backoff
    - What impact does it have on the overall throughput of the system?
    - Does it make sense to retry the whole pipeline, or retrying just a subset of the FSM transitions is preferable?

3. Implement a "retry" strategy for the `authenticated.scrape-resumes.store-resumes` state only in [`@jkomyno/glassdoor-scraper-fsm`](./packages/glassdoor-scraper-fsm/)
    - You can again use a bounded exponential backoff
    - What impact does it have on the overall throughput of the system?
    - How would you reconsider your implementation if you had to implement a "retry" strategy every possible state in the pipeline?

## 👤 Author

Hi, I'm **Alberto Schiabel**, you can follow me on:

- Github: [@jkomyno](https://github.com/jkomyno)
- Twitter: [@jkomyno](https://twitter.com/jkomyno)

## 🦄 Show your support

Give a ⭐️ if this project helped or inspired you!

## 📝 License

Built with ❤️ by [Alberto Schiabel](https://github.com/jkomyno).<br />
This project is [MIT](https://github.com/jkomyno/xtremejs-2022/blob/master/LICENSE) licensed.
