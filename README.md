# Autoscaling Group with Application Load Balancer

## Deploying the App

To deploy your stack, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)

### Steps

After cloning this repo, from this working directory, run these commands:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

2. Set the required configuration variables for this program:

    ```bash
    $ cat public_key.pub | pulumi config set awsPublicKey
    ```

3. Stand up the stack, which will deploy a bastion host and install apache on the webservers:

    ```bash
    $ pulumi up
    ```

4. After several minutes, your stack will be ready, and two stack outputs are printed:

    ```bash
    $ pulumi stack output
    Current stack outputs (2):
    OUTPUT            VALUE
    bastionHostname   ec2_hostname.compute.amazonaws.com
    webURL            alb-hostname.elb.amazonaws.com
    ```

5. Visit your new website by entering the websiteURL into your browser, or running:

    ```bash
    $ curl $(pulumi stack output url)
    ```

6. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

7. Afterwards, destroy your stack and remove it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```