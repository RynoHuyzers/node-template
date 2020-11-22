#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { RestAPIStack } from './rest-api-gw-stack';

const app = new App();
new RestAPIStack(app, 'RestAPI-Gateway', {});
