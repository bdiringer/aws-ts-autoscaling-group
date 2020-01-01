import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as fs from "fs";
import * as config from "./config";

/* VPC
    // Use Crosswalk to deploy our VPC
*/
const vpc = new awsx.ec2.Vpc("vpc")

/* Bastion Host Security Group
    // Allocate a security group for our bastion host
*/
const bastionSG = new awsx.ec2.SecurityGroup("bastion-sg", { vpc })

bastionSG.createIngressRule("bastion-ssh-access", {
    location: new awsx.ec2.AnyIPv4Location(),
    ports: new awsx.ec2.TcpPorts(22),
    description: "Allow SSH access from anywhere",
})

bastionSG.createEgressRule("bastion-outbound-access", {
    location: new awsx.ec2.AnyIPv4Location(),
    ports: new awsx.ec2.AllTraffic,
    description: "Allow outbound access to anywhere",
})

/* Web Servers Security Group
    // Allocate a security group and then a series of rules for web servers
*/
const webserverSG = new awsx.ec2.SecurityGroup("webserver-sg", { vpc })

// Only allow SSH access from our bastion host
webserverSG.createIngressRule("webserver-ssh-access", {
    location: { sourceSecurityGroupId: bastionSG.id },
    ports: new awsx.ec2.TcpPorts(22),
    description: "Allow SSH access from anywhere",
})

webserverSG.createIngressRule("webserver-http-access", {
    location: new awsx.ec2.AnyIPv4Location(),
    ports: new awsx.ec2.TcpPorts(80),
    description: "Allow HTTP access from anywhere",
})

webserverSG.createEgressRule("webserver-outbound-access", {
    location: new awsx.ec2.AnyIPv4Location(),
    ports: new awsx.ec2.AllTraffic,
    description: "Allow outbound access to anywhere",
})

// Amazon Linux 2 AMI (HVM)
const amiId = aws.getAmi({
    filters: [
        {
            name: "name",
            values: ["amzn2-ami-hvm-2.0.*-x86_64-gp2"],
        }
    ],
    mostRecent: true,
    owners: ["137112412989"],
}, { async: true }).then(ami => ami.id)

/* Key Pair
    // Create key pair based on provided public key
    // You must create a key pair locally and create a configuration value in Pulumi:
    // cat public_key.pub | pulumi config set awsPublicKey
*/
const awsPublicKey = config.awsPublicKey
const keyPair = new aws.ec2.KeyPair("aws-keypair", {publicKey: awsPublicKey});

/* Bastion Host
    // Linux Server which can SSH to servers on internal subnets
    // Deploy to the first available public subnet
*/
const bastionHost = new aws.ec2.Instance("bastion-host", {
    tags: { "Name": "bastion-host" },
    instanceType: config.instanceType,
    ami: amiId,
    subnetId: vpc.publicSubnetIds[0],
    vpcSecurityGroupIds: [ bastionSG.securityGroup.id ],
    keyName: keyPair.keyName,
})

export const bastionHostname = bastionHost.publicDns

/* Application Load Balancer
    // Create ALB to attach to ASG
*/
const webALB = new awsx.lb.ApplicationLoadBalancer("web-alb", { vpc: vpc})
// Target group which communicates over HTTP
const albTG = webALB.createTargetGroup("alb-tg",{
    protocol: "HTTP",
    targetType: "instance",
})
// Listener for ALB
const albListener = albTG.createListener("alb-listener", { protocol: "HTTP"})

/* Launch Configuration
    // Launch Configuration for Autoscaling Group 
*/
const webLC = new aws.ec2.LaunchConfiguration("web-lc", {
    imageId: amiId,
    instanceType: config.instanceType,
    securityGroups: [ webserverSG.id ],
    keyName: keyPair.keyName,
    namePrefix: "webserver-lc-",
    userData: fs.readFileSync("files/userdata.sh").toString(),
})

/* Autoscaling Group
    // Run the launch configuration in private subnets
*/
const webserverASG = new aws.autoscaling.Group("web-server-asg", {
    vpcZoneIdentifiers: vpc.privateSubnetIds,
    launchConfiguration: webLC.name,
    tags: [
        {
            key: "Name",
            value: "web-server",
            propagateAtLaunch: true,
        },
    ],
    minSize: config.minSizeASG,
    maxSize: config.maxSizeASG,
})
// Create a new ALB Target Group attachment
new aws.autoscaling.Attachment("asg-attachment", {
    albTargetGroupArn: albTG.targetGroup.arn,
    autoscalingGroupName: webserverASG.name,
})

export const webURL = albListener.endpoint.hostname