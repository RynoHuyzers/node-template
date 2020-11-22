import { App, Stack, StackProps } from '@aws-cdk/core';
import { AssetCode, Function, Runtime, LayerVersion, ILayerVersion } from '@aws-cdk/aws-lambda';
import { StringParameter, IStringParameter } from '@aws-cdk/aws-ssm';
import { ManagedPolicy, ServicePrincipal, Role } from '@aws-cdk/aws-iam';

export class RestProxyStack extends Stack {
  constructor(app: App, id: string, props: StackProps) {
    super(app, id, props);

    // NestJS Rest API Layer
    const layerArn: IStringParameter = StringParameter.fromStringParameterName(
      this,
      'NestJSRestLayerARN',
      '/NestJsLayer/Arn',
    );
    const nestjsLayer: ILayerVersion = LayerVersion.fromLayerVersionAttributes(this, 'NestJSRestLayer', {
      layerVersionArn: layerArn.stringValue,
    });

    /******** Roles and policies */
    const proxyLambdaRole = new Role(this, 'proxyLambdaRole', {
      roleName: 'ProxyLambdaRole',
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AWSLambdaFullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEventBridgeFullAccess'),
      ],
    });

    // Rest Proxy Function
    const restProxyFnPath: string = `${__dirname}/../../../../deploy/rest-api/rest-lambda.zip`;
    const restProxyLambda: Function = new Function(this, 'RestAPI_ProxyLambda', {
      functionName: 'RestProxy',
      code: new AssetCode(restProxyFnPath),
      handler: 'lambda-rest-handler.handler',
      layers: [nestjsLayer],
      runtime: Runtime.NODEJS_12_X,
      memorySize: 512,
      environment: {},
      logRetention: 5,
      role: proxyLambdaRole,
    });

    //SSM Parameters
    new StringParameter(this, 'RestApiProxyLambdaArnParameter', {
      parameterName: '/ClientManagement/RestApi/ProxyLambda/Arn',
      stringValue: restProxyLambda.functionArn,
    });
  }
}
