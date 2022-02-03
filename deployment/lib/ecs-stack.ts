import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { AwsLogDriver, Cluster, ContainerImage, FargateService, FargateTaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class EcsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create or import VPC
    const vpc = new Vpc(this, `DemoVpc`, {
      cidr: '10.1.0.0/18',
      maxAzs: 2,
      vpnGateway: false,
      natGateways: 0, // enable NAT if you want to place ECS tasks in private subnet
      subnetConfiguration: [
        {
          cidrMask: 22,
          name: `demo-public-subnet`,
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 22,
          name: `demo-isolated-subnet`,
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
        // {
        //     cidrMask: 22,
        //     name: `demo-private-subnet`,
        //     subnetType:SubnetType.PRIVATE_WITH_NAT,
        // },
      ]
    });

    // Create ECS cluster
    const cluster = new Cluster(this, `EcsCluster`, {
      vpc,
      containerInsights: false,
      enableFargateCapacityProviders: true,
    });

    // Create ALB
    const loadBalancer = new ApplicationLoadBalancer(this, `DemoALB`, {
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
        onePerAz: true,
      },
      internetFacing: true,
    });

    /* HTTPS requires SSL cert
    const httpsListener = loadBalancer.addListener('HttpsListener', {
      port: 443,
      protocol: ApplicationProtocol.HTTPS,
      open: true,
      // certificates: ....
    });
    */

    const listener = loadBalancer.addListener('HttpListener', {
      port: 3000,
      protocol: ApplicationProtocol.HTTP,
      open: true,
    });

    // specify ECS Fargate task specs
    const taskDefinition = new FargateTaskDefinition(this, `DemoBackendTask`, {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    const logGroup = new LogGroup(this, 'DemoLogGroup', {
      logGroupName: `demo-backend`,
      retention: RetentionDays.ONE_DAY,
    });

    const container = taskDefinition.addContainer('nodejs-container', {
      image: ContainerImage.fromAsset('./../backend'),
      logging: new AwsLogDriver({
        streamPrefix: 'backend',
        logGroup,
      }),
      environment: {
        DEMO_NESTJS_PORT: '5432',
      },
    });

    container.addPortMappings({ containerPort: 5432, });

    const service = new FargateService(this, `DemoService`, {
      cluster,
      taskDefinition,
      desiredCount: 1,
      maxHealthyPercent: 200,
      minHealthyPercent: 50,
      circuitBreaker: { rollback: true },
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
        // subnetType: SubnetType.PRIVATE_WITH_NAT,
        onePerAz: true
      },
      enableECSManagedTags: true,
      assignPublicIp: true,
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 1,
        },
        // {
        //   capacityProvider: 'FARGATE',
        //   weight: 1,
        //   // base: 2  
        // }
      ],
    });

    const port = 80;
    listener.addTargetGroups('DemoTg', {
      targetGroups: [new ApplicationTargetGroup(this, 'DemoTargetGroup', {
        vpc,
        protocol: ApplicationProtocol.HTTP,
        port,
        targets: [service],
        healthCheck: {
          path: '/app/hello',
          interval: Duration.minutes(5),
          healthyHttpCodes: '200,401,301,302'
        },
      })]
    });

    new CfnOutput(this, 'DemoAlbEndpoint', {
      exportName: 'demo-alb-endpoint',
      value: loadBalancer.loadBalancerDnsName
    });

  }
}
