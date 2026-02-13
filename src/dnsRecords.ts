import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Alb } from "./networking";

const config = new pulumi.Config();
const project = config.get("project");
const dnsName = config.get("dnsName");
const env = pulumi.getStack();

const zone = aws.route53.getZone({
    name: dnsName,
    privateZone: false,
});

export const route53Record = new aws.route53.Record("application", {
    zoneId: zone.then(z => z.id),
    name: zone.then(z => `${project}-${env}.${z.name}`),
    type: aws.route53.RecordType.CNAME,
    ttl: 300,
    records: [Alb.dnsName],
});