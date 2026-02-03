import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const project = config.get("project");
const env = pulumi.getStack();

export const vpc = new awsx.ec2.Vpc(`${project}-${env}-vpc`, {cidrBlock: "10.0.0.0/16"});

export const AlbSg = new aws.ec2.SecurityGroup(`${project}-${env}-lb-sg`, {
  vpcId: vpc.vpcId,
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
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
});

export const Alb = new aws.lb.LoadBalancer(`${project}-${env}-lb`, {
    name: `${project}-${env}-lb`,
    internal: false,
    loadBalancerType: "application",
    securityGroups: [AlbSg.id],
    subnets: vpc.publicSubnetIds,
    enableDeletionProtection: true,
    tags: {
        Environment: `${env}`,
        Project: `${project}`,
        Pulumi: "true",
    },
});

export const targetGroup = new aws.lb.TargetGroup(`${project}-${env}-target-group`, {
    name: `${project}-${env}-target-group`,
    port: 80,
    protocol: "HTTP",
    vpcId: vpc.vpcId,
    targetType: "ip",
});

export const listener = new aws.lb.Listener(`${project}-${env}-listener`, {
    loadBalancerArn: Alb.arn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [{
        type: "forward",
        targetGroupArn: targetGroup.arn,
    }],
});