FROM node:16 AS build

RUN npm install -g npm@8.2.0

RUN mkdir -p /home/demo-nestjs/entry; mkdir -p /home/demo-nestjs/backend; 

WORKDIR /home/demo-nestjs/backend

COPY src /home/demo-nestjs/backend/src
COPY *.json /home/demo-nestjs/backend/

RUN npm install
RUN npm run build

RUN npm prune --production

COPY *.sh /home/demo-nestjs/entry/
RUN chmod +x /home/demo-nestjs/entry/*.sh

FROM node:16-alpine as release
COPY --from=build /home/demo-nestjs/entry /home/demo-nestjs/entry
COPY --from=build /home/demo-nestjs/backend/dist /home/demo-nestjs/dist/
COPY --from=build /home/demo-nestjs/backend/node_modules /home/demo-nestjs/dist/node_modules

WORKDIR /home/demo-nestjs/dist

ENV NODE_ENV=production

EXPOSE 5432

CMD ["/home/demo-nestjs/entry/start.sh"]