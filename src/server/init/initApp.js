import express from 'express';
import bodyParser from 'body-parser';

import { type Context } from 'types/initContext';

const initApp = (ctx: Context): Promise<Context> => (
  new Promise((resolve) => {
    // initialize the express engine
    const app = express();
    // tell express to use the public folder to serve static assets
    app.use(express.static('public'));
    // use the pug templating engine for our page skeleton
    app.set('view engine', 'pug');
    // use the body parser to accept JSON payloads
    app.use(bodyParser.json({
      limit: '50mb',
    }));
    // trust first proxy (nginx typically acts as proxy)
    app.set('trust proxy', 1);
    resolve({
      ...ctx,
      app,
    });
  })
);

export default initApp;
