#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { NestLayerStack } from './nest-layer-stack';

const app = new App();
new NestLayerStack(app, 'NestLayer', {});
