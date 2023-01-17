import { createServer, proxy } from 'aws-serverless-express';
import polka from 'polka';

import { handler as svelteHandler } from './handler.js';

const app = polka().use(svelteHandler);
const server = createServer(app.handler);

export const handler = (event, context) => {
	proxy(server, event, context);
};
