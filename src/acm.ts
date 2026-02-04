import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const dnsName = config.get("dnsName");

export const certificate = aws.acm.getCertificate({
    domain: dnsName,
    types: ["AMAZON_ISSUED"],
    mostRecent: true,
});