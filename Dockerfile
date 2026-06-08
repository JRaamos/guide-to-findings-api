FROM node:20.20.0

RUN apt-get update && apt-get install libvips-dev postgresql-client -y

ENV NODE_ENV=production

WORKDIR /opt/
COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable && yarn config set network-timeout 600000 -g && yarn install

ENV PATH /opt/node_modules/.bin:$PATH

WORKDIR /opt/app
COPY . .

RUN ["yarn", "build"]

EXPOSE 1337

CMD ["yarn", "start"]
