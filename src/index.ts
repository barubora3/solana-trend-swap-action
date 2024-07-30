import { serve } from '@hono/node-server';
import jupiterSwap from './jupiter-swap/route';
import trend from './trend/route';
import getPostTarget from './get-post-target/route';
import generatImage from './generate-image/route';
import { cors } from 'hono/cors';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { serveStatic } from '@hono/node-server/serve-static';

const app = new OpenAPIHono();
app.use('/public/*', serveStatic({ root: './public' }));

app.use(
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'Accept-Encoding'],
    allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  }),
);

// <--Actions-->
app.route('/api/jupiter/swap', jupiterSwap);
app.route('/api/trend', trend);
app.route('/api/get-post-target', getPostTarget);
app.route('/api/generate-image', generatImage);

app.get('/static/*', serveStatic({ root: './' }));

// </--Actions-->

app.doc('/doc', {
  info: {
    title: 'An API',
    version: 'v1',
  },
  openapi: '3.1.0',
});

app.get(
  '/swagger-ui',
  swaggerUI({
    url: '/doc',
  }),
);

const port = 3000;
console.log(
  `Server is running on port ${port}
Visit http://localhost:${port}/swagger-ui to explore existing actions
Visit https://dial.to to unfurl action into a Blink
`,
);

serve({
  fetch: app.fetch,
  port,
});
