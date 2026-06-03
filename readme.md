# 🛸 Api Guide to findings

The project was created using the docker and quick build strapi api (CMS).


## Environment variables

The example of the environment variables necessary for the system to work is found in this way:

```
api/.env.example
```

## Project startup

To start in development mode:

```
cd api
yarn
yarn build
yarn develop
```

To deploy in an environment use docker compose to facilitate the process:

```
cd api/
docker-compose build
docker-compose up
```