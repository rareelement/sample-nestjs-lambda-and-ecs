import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Deployment, EndpointType, LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Code, Function, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from 'path';

export class LambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // npm run build:layer
    const layerLocation = join(__dirname, './../../backend/lambda-layer/');
    const layer = new LayerVersion(this, 'NestLayer', {
      code: Code.fromAsset(layerLocation),
      compatibleRuntimes: [Runtime.NODEJS_14_X],
      license: 'Private',
    });

    // npm run build
    const lambdaCode = join(__dirname, './../../backend/dist/');
    const lambda = new Function(this, `NestLambda`, {
      code: Code.fromAsset(lambdaCode, {
        // bundling
      }),
      handler: './main.handler',
      runtime: Runtime.NODEJS_14_X,
      memorySize: 256,
      timeout: Duration.seconds(30),
      layers: [
        layer,
      ],
    });

    const restAPI = new LambdaRestApi(this, `NestApi`, {
      endpointTypes: [EndpointType.REGIONAL],
      handler: lambda,
      deploy: true,
      endpointExportName: 'demo-nestjs-lambda-endpoint',
      deployOptions: {
        stageName: '',
      },
    });

    const deployment = new Deployment(this, `NestApiDeployment`, {
      api: restAPI,
      retainDeployments: false,
    });

    deployment.node.addDependency(restAPI);
  }
}
