import http from 'http';
import { get } from 'lodash';
import redis from 'redis';
import socketIO from 'socket.io';

import { type Action } from 'types/redux/actions';
import { type Context } from 'types/initContext';
import { type User } from 'types/user';
import { DEFAULT_REDIS_HOST, DEFAULT_REDIS_PORT } from './initCache';

const DEFAULT_HOSTNAME = '0.0.0.0';
const DEFAULT_PORT = 3000;

const initSocket = (ctx: Context): Promise<Context> => (
  new Promise((resolve, reject) => {
    const { app, cache, logger } = ctx;
    if (!(app && cache && logger)) {
      reject(new Error('Initialization failure.'));
      return;
    }
    const httpServer = (http: any).Server(app);
    app.locals.socket = socketIO(httpServer);
    const redisHost = get(ctx, 'env.REDIS_HOST', DEFAULT_REDIS_HOST);
    const redisPort = parseInt(get(ctx, 'env.REDIS_PORT', DEFAULT_REDIS_PORT), 10);
    const subscriber = redis.createClient({
      host: redisHost,
      port: redisPort,
    });
    subscriber.on('message', (channel: string, message: string) => {
      if (channel === 'action') {
        const action: Action = JSON.parse(message);
        app.locals.socket.to(`projects-${action.meta.project}`).emit('action', action);
      }
    });
    subscriber.subscribe('action');
    app.locals.socket.on('connection', (socket: any) => {
      socket.on('identify-user', (user: User) => {
        if (user.currentProject) {
          const room: string = `projects-${user.currentProject.id}`;
          socket.join(room);
          subscriber.subscribe(room);
        }
      });
    });
    const hostname = get(ctx, 'env.APP_HOST', DEFAULT_HOSTNAME);
    const port = parseInt(get(ctx, 'env.APP_PORT', DEFAULT_PORT), 10);
    httpServer.listen(port, hostname, () => {
      resolve({
        ...ctx,
        app: {
          ...app,
          hostname,
          port,
        },
      });
    });
  })
);

export default initSocket;
