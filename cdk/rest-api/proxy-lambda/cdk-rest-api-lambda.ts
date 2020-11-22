#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { RestProxyStack } from './rest-lambda-proxy-stack';

const app = new App();
new RestProxyStack(app, 'RestAPI-ProxyLambda', {});
