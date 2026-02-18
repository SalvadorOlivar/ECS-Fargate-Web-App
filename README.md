# Deploying a Web App on ECS Fargate

## Introduction

The main goal of this project was to learn and experiment with Pulumi as an infrastructure as code (IaC) tool, using TypeScript as the programming language. Throughout this guide, I document the process of deploying a web application on AWS ECS Fargate, covering the key concepts, project structure, and step-by-step implementation.

This post is intended for anyone interested in modern cloud infrastructure automation, especially those looking to get started with Pulumi, TypeScript, and AWS Fargate. The approach is hands-on and practical, focusing on building a real solution from scratch and explaining each component along the way.

## What you should build:

- ECS Cluster
- Task Definition with Docker Image
- Service on Fargate
- Public Load Balancer (ALB)
- Environment variables and logs in CloudWatch

## Architecture 
![Arquitectura](docs/architecture-ecs-fargate.png)

## ECS Fargate

### What is ECS Fargate?

Amazon ECS Fargate is a serverless compute engine for containers that allows you to run containers without managing servers or clusters. With Fargate, you only need to define your application requirements, and AWS automatically provisions, scales, and manages the infrastructure for you. This simplifies container deployment, improves security, and reduces operational overhead.

### What is ECS Cluster?

An ECS Cluster is a logical grouping of tasks or services in Amazon Elastic Container Service (ECS). It acts as the foundation for running and managing containerized applications, allowing you to organize and control resources such as compute instances or serverless infrastructure (like Fargate) within a single environment. Clusters help you manage scaling, networking, and security for your container workloads.

### What is ECS Fargate Task Definition?

An ECS Fargate task definition is a blueprint that specifies how Amazon ECS should run containers on the Fargate launch type. It includes details such as container configurations, resource requirements, networking, and IAM roles. Below are the key components and considerations for creating a task definition for Fargate.

## Pulumi

### How to initializate a Pulumi project.
Pulumi is an infrastructure as code (IaC) platform that allows you to define, deploy, and manage cloud infrastructure using familiar programming languages such as TypeScript, Python, Go, C#, and more. Unlike other IaC tools, Pulumi integrates infrastructure directly into the development workflow, making it easier to reuse code, integrate with libraries, and automate advanced scenarios.

### How to initialize a Pulumi project

1. **Install Pulumi:**
   Download and install Pulumi from the official website or using a package manager:
   ```sh
   curl -fsSL https://get.pulumi.com | sh
   ```
   Or with npm:
   ```sh
   npm install -g pulumi
   ```

2. **Log in to Pulumi:**
   You can use the Pulumi Cloud (default), or for collaborative and secure state management, it is recommended to store the state in an AWS S3 bucket or Azure Storage Account. This allows multiple team members to work together and ensures the state is safely stored and versioned.

   Example for AWS S3:
   ```sh
   pulumi login s3://my-bucket
   ```
   Example for Azure Storage:
   ```sh
   pulumi login azblob://my-container
   ```

   For this project, the state was stored locally:
   ```sh
   pulumi login --local
   ```

3. **Create a new project:**
   Pulumi provides a repository of templates for different programming languages and cloud providers at:
   [https://github.com/pulumi/templates](https://github.com/pulumi/templates)

   These templates offer predefined solutions to help you get started quickly. However, for learning purposes, it's best to start from scratch and build your own infrastructure step by step.

   For this guide, we'll use the following command to initialize a new Pulumi project for AWS with TypeScript:
   ```sh
   pulumi new aws-typescript
   ```
   You can replace `aws-typescript` with other templates depending on your preferred language and cloud provider.

4. **Configure your stack and credentials:**
   Pulumi will ask you to set up a stack (environment) and your cloud provider credentials (e.g., AWS).

5. **Run your first deployment:**
   Once you have defined your infrastructure in the main file (e.g., `index.ts`), run:
   ```sh
   pulumi up
   ```
   This will show a summary of the changes and, after confirmation, deploy the infrastructure.


## Repository Structure
I decided to organize the repository as follows:

- All TypeScript files that define the infrastructure are located inside the `src/` directory.
- The rest of the structure follows the default Pulumi template layout.

Within the `src/` folder, there is one file per main functionality. The `index.ts` file acts as the entry point and central hub of the repository—for example, in this case, it contains the ECS configuration. The other files in `src/` complement the solution, each handling a specific part of the infrastructure (such as networking, IAM roles, DNS, etc.).

This modular approach makes the codebase easier to maintain and extend as your infrastructure grows.

Additionally, the configurations used in the code are managed through the file named `Pulumi.<stack-name>.yaml`. This file allows you to define variables and settings specific to each stack (environment).

Later in this blog, we will explain how to use these configurations within your code.

```yaml
config:
  aws:region: us-east-1
  project: pulumi

  appName: solivar-blog
  appPort: 3000
  appDesiredCount: 2
  appCpu: 256
  appMemory: 512
  appNetworkMode: awsvpc
  appRepository: homosapiensother
  serviceLaunchType: FARGATE
  
  dnsName: mydomain.com
```

## Detailed Explanation of index.ts Components

Let's break down each of the main components defined in the `src/index.ts` file and how configuration values are loaded from the Pulumi stack configuration file (`Pulumi.<stack-name>.yaml`).

### Loading Configuration Values

Pulumi provides the `pulumi.Config()` class to access configuration values defined in your stack YAML file. For example:

```typescript
const config = new pulumi.Config();
const appName = config.get("appName");
const appPort = config.getNumber("appPort") || 3000;
```

This allows you to keep sensitive or environment-specific values outside your codebase and change them per stack (e.g., dev, prod).

### Main Components in index.ts

- **ECS Cluster**
   - Created with:
      ```typescript
      const cluster = new ecs.Cluster(`${project}-${env}-cluster`);
      ```
   - This is the logical group where your ECS services and tasks will run.

- **Task Definition**
   - Created with:
      ```typescript
      const taskDefinition = new ecs.TaskDefinition(...)
      ```
   - Defines how your container should run, including image, CPU, memory, ports, and roles. Uses config values like `appCpu`, `appMemory`, `appName`, `appRepository`, and `appTag`.

- **Security Group**
   - Created with:
      ```typescript
      const sg = new aws.ec2.SecurityGroup(...)
      ```
   - Controls network access to your ECS service. Ingress and egress rules are set based on your networking setup and the `appPort` config value.

- **ECS Service**
   - Created with:
      ```typescript
      new aws.ecs.Service(...)
      ```
   - Deploys and manages the desired number of running containers (`appDesiredCount`) using the task definition, cluster, and networking resources. Integrates with the load balancer and target group.

- **Exported URL**
   - At the end, the service exports the DNS name of the load balancer or Route53 record:
      ```typescript
      export const url = dnsRecods.route53Record.fqdn;
      ```
   - This makes it easy to retrieve the endpoint after deployment.

Each of these components is parameterized using values from the configuration file, making your infrastructure flexible and environment-agnostic.

## Detailed Explanation of networking.ts Components

The `src/networking.ts` file is responsible for setting up the networking resources required for the ECS Fargate application. Here’s a breakdown of its main components:

- **VPC (Virtual Private Cloud)**
   - Created with:
      ```typescript
      export const vpc = new awsx.ec2.Vpc(`${project}-${env}-vpc`, {cidrBlock: "10.0.0.0/16"});
      ```
   - This defines a new VPC with a CIDR block, providing isolated networking for your application. It automatically creates public and private subnets.

- **Load Balancer Security Group (AlbSg)**
   - Created with:
      ```typescript
      export const AlbSg = new aws.ec2.SecurityGroup(`${project}-${env}-lb-sg`, {...});
      ```
   - Controls network access to the load balancer. Allows all inbound and outbound traffic for demonstration purposes, but can be restricted for production.

- **Application Load Balancer (Alb)**
   - Created with:
      ```typescript
      export const Alb = new aws.lb.LoadBalancer(`${project}-${env}-lb`, {...});
      ```
   - Provides a public-facing entry point for your application, distributing traffic to ECS tasks. Uses the security group and public subnets from the VPC.

- **Target Group**
   - Created with:
      ```typescript
      export const targetGroup = new aws.lb.TargetGroup(`${project}-${env}-target-group`, {...});
      ```
   - Defines how the load balancer routes traffic to your ECS tasks. Uses the app port and VPC.

- **Listener**
   - Created with:
      ```typescript
      export const listener = new aws.lb.Listener(`${project}-${env}-listener`, {...});
      ```
   - Listens for HTTPS traffic (port 443) on the load balancer, using an ACM certificate for SSL. Forwards requests to the target group.

These networking resources ensure that your ECS service is securely accessible, traffic is properly routed, and the infrastructure is ready for production workloads. All resources are parameterized using values from the configuration file, making them flexible and reusable.

## Brief Explanation of Secondary Files

The following files complement the main infrastructure setup and help modularize the code:

- **acm.ts**
   - Handles the retrieval of an ACM (AWS Certificate Manager) certificate for SSL/TLS. It fetches the most recent certificate for the domain specified in the configuration.
   - Uses the `get` function to bring existing resources from AWS into your Pulumi code. This is similar to Terraform's data search, allowing you to reference and use resources that were created outside of Pulumi.

   ```typescript
   export const certificate = aws.acm.getCertificate({
    domain: dnsName,
    types: ["AMAZON_ISSUED"],
    mostRecent: true,
   });
   ```

- **dnsRecords.ts**
   - Manages DNS records using AWS Route53. It creates a CNAME record pointing to the load balancer, making your application accessible via a custom domain.

- **roles.ts**
   - Defines the IAM role required for ECS task execution. Attaches the necessary policies to allow ECS tasks to interact with AWS services securely.

These files keep the main codebase clean and organized, separating concerns for certificate management, DNS, and IAM roles.

## Previewing and Applying Changes

Once your configuration and code are ready, Pulumi allows you to preview the changes before actually making any modifications to your cloud resources. This is similar to running `terraform plan` in Terraform.

- To see what resources will be created, updated, or deleted—without making any changes—run:
   ```sh
   pulumi preview
   ```
   This command provides a detailed summary of the planned actions, so you can review and validate them before proceeding.

- When you're ready to apply the changes, use:
   ```sh
   pulumi up
   ```
   Pulumi will show you the proposed changes again and ask for confirmation. Type `yes` to proceed and Pulumi will create, update, or delete resources as needed.

This workflow helps you avoid surprises and gives you full control over your infrastructure changes, making deployments safer and more predictable.

## Conclusion

Working through this project provided valuable hands-on experience with Pulumi, TypeScript, and AWS ECS Fargate. By building the infrastructure step by step, I learned how to structure a modern IaC project, manage configurations, and leverage cloud resources efficiently.

Pulumi’s approach—using familiar programming languages for infrastructure—makes it easier to create modular, reusable, and maintainable code. Integrating with AWS services like ECS, ACM, and Route53 was straightforward, and the workflow with preview and up commands gave me confidence in the changes being made.

If you’re looking to modernize your cloud automation or want to try a new IaC tool, I highly recommend giving Pulumi a try, especially with TypeScript for its strong typing and developer experience.