import redis from 'redis';
import { get } from 'lodash';

import { type Context } from 'types/initContext';

export const DEFAULT_REDIS_HOST = '127.0.0.1';
export const DEFAULT_REDIS_PORT = 6379;

const initCache = (ctx: Context): Promise<Context> => (
  new Promise((resolve, reject) => {
    const host = get(ctx, 'env.REDIS_HOST', DEFAULT_REDIS_HOST);
    const port = parseInt(get(ctx, 'env.REDIS_PORT', DEFAULT_REDIS_PORT), 10);
    const cache = redis.createClient({
      host,
      port,
    });
    cache.on('ready', () => {
      resolve({
        ...ctx,
        cache,
      });
    });
    cache.on('error', (err) => {
      reject(err);
    });
  })
);

export default initCache;
