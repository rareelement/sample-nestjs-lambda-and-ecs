#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaStack } from '../lib/lambda-stack';
import { EcsStack } from '../lib/ecs-stack';

const app = new cdk.App();
new LambdaStack(app, 'LambdaStack', {});
new EcsStack(app, 'EcsStack', {});
