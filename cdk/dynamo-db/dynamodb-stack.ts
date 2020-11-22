import {App, Stack, StackProps} from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import {AttributeType} from '@aws-cdk/aws-dynamodb';
import {StringParameter} from '@aws-cdk/aws-ssm';

export class DynamoDbStack extends Stack {
  constructor(app: App, id: string, props: StackProps) {
    super(app, id, props);


  }
}
