import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config()

// You must create a key pair locally and create a configuration value in Pulumi:
// cat public_key.pub | pulumi config set awsPublicKey
export const awsPublicKey = config.require("awsPublicKey")

// instanceType is the WebServer and Bastion host EC2 instance type
export const instanceType = "t3.micro"

// Minimum and maximimum nuber of instances in autoscaling group
export const minSizeASG = 1
export const maxSizeASG = 3