import * as pulumi from "@pulumi/pulumi";
import * as ecs from "@pulumi/aws/ecs";
import * as aws from "@pulumi/aws";
import * as networking from "./networking";

const config = new pulumi.Config();
const project = config.get("project");
const env = pulumi.getStack();

const cluster = new ecs.Cluster(`${project}-${env}-cluster`);

const executionRole = new aws.iam.Role(`${project}-${env}-ecs-execution-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs-tasks.amazonaws.com" }),
});

new aws.iam.RolePolicyAttachment(`${project}-${env}-ecs-execution-policy`, {
    role: executionRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
});

const taskDefinition = new ecs.TaskDefinition(`${project}-${env}-task-definition`, {
  family: `${project}-${env}-task-definition-nginx`,
  requiresCompatibilities: ["FARGATE"],
  networkMode: "awsvpc",
  executionRoleArn: executionRole.arn,
  cpu: "256",
  memory: "512",
  containerDefinitions: JSON.stringify([
    {
      name: `${project}-${env}-nginx`,
      image: "nginx:latest",
      essential: true,
      portMappings: [{
        containerPort: 80,
        hostPort: 80,
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
      fromPort: 80,
      toPort: 80,
      protocol: "tcp",
      securityGroups: [networking.AlbSg.id],
    },
  ],
});

new aws.ecs.Service(`${project}-${env}-service`, {
  name: `${project}-${env}-service`,
  cluster: cluster.arn,
  taskDefinition: taskDefinition.arn,
  desiredCount: 1,
  launchType: "FARGATE",

  networkConfiguration: {
    assignPublicIp: true,
    subnets: networking.vpc.publicSubnetIds,
    securityGroups: [sg.id],
  },
  loadBalancers: [{
    targetGroupArn: networking.targetGroup.arn,
    containerName: `${project}-${env}-nginx`,
    containerPort: 80,
  }],
}, {
  dependsOn: [cluster],
});

// Export the load balancer's address so that it's easy to access.
export const url = networking.Alb.dnsName;