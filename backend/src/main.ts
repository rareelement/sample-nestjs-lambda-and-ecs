import { NestApplication, NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { AppModule } from './app.module';

const serverlessExpressInstance = require('@vendia/serverless-express');

let proxyHandler: any;
let nestApp: NestApplication;

async function bootstrap(port?: number) {
  if (proxyHandler || nestApp)
    return proxyHandler;

  const expressServer = express();

  nestApp = await NestFactory.create(AppModule,
    new ExpressAdapter(expressServer), {});

  // only if started locally
  if (port) {
    console.warn(`Starting NestJS app on port ${port}`);

    await nestApp.listen(port);

  } else {
    console.info(`Initializing NestJS in Lambda`);

    await nestApp.init();
    proxyHandler = await serverlessExpressInstance({ app: expressServer });
    return proxyHandler;
  }
}

const { DEMO_NESTJS_PORT } = process.env;
const port = DEMO_NESTJS_PORT && parseInt(DEMO_NESTJS_PORT, 10) || undefined;

bootstrap(port);

export const handler = async (event: any, context: any, callback: any) => {
  const proxyHandler = await bootstrap();
  const result = proxyHandler(event, context, callback);
  return result;
};
