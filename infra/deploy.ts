import { resolve } from 'path';
import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

class SveltekitDemo extends cdk.Stack {
	constructor(scope: Construct, id: string) {
		super(scope, id);

		const handler = new lambda.Function(this, 'SveltekitHandler', {
			code: lambda.Code.fromAsset(resolve(process.cwd(), 'build')),
			handler: 'lambda-handler.handler',
			runtime: lambda.Runtime.NODEJS_18_X
		});

		const api = new apigateway.LambdaRestApi(this, 'API', { handler });

		new cdk.CfnOutput(this, 'APIDomain', { value: api.domainName?.domainName || '' });
	}
}

const app = new cdk.App();

new SveltekitDemo(app, 'SveltekitDemo');

app.synth();
