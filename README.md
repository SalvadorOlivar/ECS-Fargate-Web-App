# Deploying a Web App on ECS Fargate

📌 Product team request:

“We need to run a containerized web service without managing servers.”

What you should build:

- ECS Cluster

- Task Definition with Docker Image

- Service on Fargate

- Public Load Balancer (ALB)

- Environment variables and logs in CloudWatch

# What is ECS Fargate?

Amazon ECS Fargate is a serverless compute engine for containers that allows you to run containers without managing servers or clusters. With Fargate, you only need to define your application requirements, and AWS automatically provisions, scales, and manages the infrastructure for you. This simplifies container deployment, improves security, and reduces operational overhead.

# What is ECS Cluster?

An ECS Cluster is a logical grouping of tasks or services in Amazon Elastic Container Service (ECS). It acts as the foundation for running and managing containerized applications, allowing you to organize and control resources such as compute instances or serverless infrastructure (like Fargate) within a single environment. Clusters help you manage scaling, networking, and security for your container workloads.

# What is ECS Fargate Task Definition?

An ECS Fargate task definition is a blueprint that specifies how Amazon ECS should run containers on the Fargate launch type. It includes details such as container configurations, resource requirements, networking, and IAM roles. Below are the key components and considerations for creating a task definition for Fargate.

# Arquitecture 
![Arquitectura](docs/arquitecture.png)


