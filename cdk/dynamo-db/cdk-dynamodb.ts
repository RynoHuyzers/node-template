import { App } from '@aws-cdk/core';
import { DynamoDbStack } from './dynamodb-stack';

const app = new App();
new DynamoDbStack(app, 'DynamoDb', {});
