import { App, Stack, StackProps } from '@aws-cdk/core';
import { AssetCode, Runtime, LayerVersion } from '@aws-cdk/aws-lambda';
import { StringParameter } from '@aws-cdk/aws-ssm';

export class NestLayerStack extends Stack {
  
  constructor(app: App, id: string, props: StackProps) {
    super(app, id, props);

    // NestJS Rest API Layer
    const nestjsLayerPath: string = `${__dirname}/../../../deploy/nest-layer.zip`;
    const nestjsLayer: LayerVersion = new LayerVersion(
      this, 
      'NestJSRestLayer', {
        layerVersionName: 'NestjsRestLayer',
        code: new AssetCode(nestjsLayerPath),
        compatibleRuntimes: [Runtime.NODEJS_12_X],
      }
    );

    new StringParameter(
      this, 
      'NestLayerArnParameter', {
        parameterName: '/NestJsLayer/Arn',
        stringValue: nestjsLayer.layerVersionArn,
      }
    )
  }
}
