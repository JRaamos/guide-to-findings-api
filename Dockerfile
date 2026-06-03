FROM node:18.20.2

RUN apt-get update && apt-get install libvips-dev -y
#RUN apt-get add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev nasm bash vips-dev

ARG ENV_FILE_PATH=./.env
COPY $ENV_FILE_PATH /opt/app/.env
ENV $(cat /opt/app/.env | xargs)

ENV NODE_ENV=production

WORKDIR /opt/
COPY package.json yarn.lock ./
RUN yarn config set network-timeout 600000 -g && yarn install
#RUN yarn add --platform=linuxmusl --arch=x64 sharp
ENV PATH /opt/node_modules/.bin:$PATH

WORKDIR /opt/app
COPY . .
#RUN chown -R node:node /opt/app
#USER node

RUN ["yarn", "build"]
EXPOSE 1337
CMD ["yarn", "start"]