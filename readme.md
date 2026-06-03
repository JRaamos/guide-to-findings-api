# Api Guide to Findings

The project was created using the docker and quick build strapi api (CMS).


## Environment variables

The example of the environment variables necessary for the system to work is found in this way:

```
api/.env.example
```

## Project startup

Create the local env file from the example before running the API:

```
cp .env.example .env
```

Fill the Strapi secrets in `.env` with local values and keep the PostgreSQL variables aligned with `docker-compose.yml` for local development.

To start PostgreSQL locally with Docker:

```
docker-compose up -d postgres
```

To start in development mode:

```
cd guide-to-findings-api
yarn
yarn build
yarn develop
```

The API connects to PostgreSQL by default using:

```
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=guide_to_findings
DATABASE_USERNAME=guide_to_findings
```

To deploy in an environment use docker compose to facilitate the process:

```
cd guide-to-findings-api
docker-compose build
docker-compose up
```
