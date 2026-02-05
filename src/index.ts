import * as pulumi from "@pulumi/pulumi";
import * as ecs from "@pulumi/aws/ecs";
import * as aws from "@pulumi/aws";
import * as networking from "./networking";
import { executionRole } from "./roles";
import * as dnsRecods from "./dnsRecords";

const config            = new pulumi.Config();
const project           = config.get("project");
const env               = pulumi.getStack();
const appPort           = config.getNumber("appPort") || 3000;
const appDesiredCount   = config.getNumber("appDesiredCount");
const appName           = config.get("appName");
const serviceLaunchType = config.get("serviceLaunchType") || "FARGATE";
const appCpu            = config.get("appCpu");
const appMemory         = config.get("appMemory");
const appNetworkMode    = config.get("appNetworkMode") || "awsvpc";
const appRepository     = config.get("appRepository");

const cluster = new ecs.Cluster(`${project}-${env}-cluster`);

const taskDefinition = new ecs.TaskDefinition(`${project}-${env}-task-definition`, {
  family: `${project}-${env}-task-definition-${appName}`,
  requiresCompatibilities: [serviceLaunchType],
  networkMode: appNetworkMode,
  executionRoleArn: executionRole.arn,
  cpu: appCpu,
  memory: appMemory,
  containerDefinitions: JSON.stringify([
    {
      name: `${project}-${env}-${appName}`,
      image: `${appRepository}/${appName}:main`,
      essential: true,
      portMappings: [{
        containerPort: appPort,
        hostPort: appPort,
      }],
    }
  ])
});

const sg = new aws.ec2.SecurityGroup(`${project}-${env}-service-sg`, {
  vpcId: networking.vpc.vpcId,
  egress: [
    {
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  ingress: [
    {
      fromPort: appPort,
      toPort: appPort,
      protocol: "tcp",
      securityGroups: [networking.AlbSg.id],
    },
  ],
});

new aws.ecs.Service(`${project}-${env}-service`, {
  name: `${project}-${env}-service`,
  cluster: cluster.arn,
  taskDefinition: taskDefinition.arn,
  desiredCount: appDesiredCount,
  launchType: serviceLaunchType,

  networkConfiguration: {
    assignPublicIp: true,
    subnets: networking.vpc.publicSubnetIds,
    securityGroups: [sg.id],
  },
  loadBalancers: [{
    targetGroupArn: networking.targetGroup.arn,
    containerName: `${project}-${env}-${appName}`,
    containerPort: appPort,
  }],
}, {
  dependsOn: [cluster],
});

// Export the load balancer's address so that it's easy to access.
export const url = dnsRecods.route53Record.fqdn;