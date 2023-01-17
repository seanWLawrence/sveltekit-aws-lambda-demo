# Deploying Sveltekit to AWS Lambda

> This repository is an example for the blog post [Deploying Sveltekit to AWS Lambda](https://www.sean-lawrence.com/deploying-sveltekit-to-aws-lambda/).

I had a hard time using the sveltekit-adapter-aws and services like Elastic Beanstalk, ECS, and CloudFlare Pages. So I created a minimal example of deploying Sveltekit to AWS Lambda using the CDK.

## Prerequisites

- Install Node.js, i.e. using Node version manager (NVM)
- Install and use Node version 18, i.e. `nvm install 18 && nvm use 18` if using NVM
- Create a basic Sveltekit application `npm create svelte@latest <app-name>`
- Create an AWS account
- Authenticate your local environment for AWS, i.e. aws sso login, pasting in temporary credentials from SSO login, using a profile, etc.
- Bootstrap your AWS account for the AWS Cloud Development Kit (CDK), i.e. `npx cdk bootstrap`

## Steps

1. Create a directory to store the lambda handler. In this example, we'll call it `pre-build-lambda-assets`

```sh
mkdir pre-build-lambda-assets
```

2. Add a minimal `package.json` file in the new directory. This tells the Node runtime that we're using the module type, which Svelte's node adapter uses to output the assets. It also installs the only two dependencies we'll need, `aws-serverless-express` to make the server Lambda-friendly and `polka` as a minimal web server.

> Note: you can replace `polka` with `express` or your Node server of choice. I just chose `polka` since it was what was used in the index.js file that Svelte outputs in the build directory and make minor tweaks to get it working with Lambda.

_./pre-build-lambda-assets/package.json_

```json
{
	"type": "module",
	"dependencies": {
		"aws-serverless-express": "^3.4.0",
		"polka": "^0.5.2"
	}
}
```

3. Run `npm install` in this folder to generate a `package-lock.json`. And then delete the `node_modules` folder that it generated in this folder. Our script will install a fresh `node_modules` in the `build` directory when we deploy rather than copying these.

4. Create a lambda handler file. This creates a basic web server just like the original Sveltekit node adapter, and then wraps it with the `aws-serverless-express` functions. And finally, it passes in the event and context from the Lambda request.

_./pre-build-lambda-assets/lambda-handler.js_

```javascript
import { createServer, proxy } from 'aws-serverless-express';
import polka from 'polka';

import { handler as svelteHandler } from './handler.js';

const app = polka().use(svelteHandler);
const server = createServer(app.handler);

export const handler = (event, context) => {
	proxy(server, event, context);
};
```

5. Create a minimal AWS CDK stack that will deploy the Lambda function and API Gateway proxy.

_./infra/deploy.ts_

```typescript
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
```

6. Create a minimal deployment script to run the Sveltekit build, copy the assets we just created into the build directory, install the dependencies, and deploy with the CDK.

_./deploy.sh_

```sh
#! /usr/bin/env bash

npm run build
cp -r ./infra/pre-build-lambda-assets/. ./build/

cd build
npm ci --omit dev

cd ../
npx cdk deploy
```

7. Add permissions to run this script

```sh
chmod +x ./deploy.sh
```

8. Install the Sveltekit node adapter

```sh
npm install @sveltejs/adapter-node --save-dev
```

9. Update the `svelte.config.js` configuration file to use the node adapter

_./svelte.config.js_

```javascript
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter()
	}
};

export default config;
```

10.  Run the deploy script

```sh
./deploy.sh
```

11. Open the hello world page in the browser by going to the url that the successful deployment outputs, named `APIDomain`

## Recap

We created the following:

- A Lambda function that runs our Sveltekit code
- An API Gateway that proxies all requests to the Lambda function

Logical next steps are to add a CloudFront distrbution in front of API Gateway to cache requests for faster performance and adding an SSL certificate and custom domain to the distribution.

### Pros of this approach

- Serverless: no paying for servers when not in use, can be scaled without having to configure an auto scaling policy, larger instance size, etc.
- Easy deployment
- Easy permissions with IAM. You can just grant the Lambda function with the policies it needs

### Cons

- A little hacky until there's a custom adapter to handle this

Happy coding! _SL_