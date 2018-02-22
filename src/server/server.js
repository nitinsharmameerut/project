/* eslint-disable no-console */
import { type Context } from 'types/initContext';
import {
  initApp,
  initAuth,
  initCache,
  initDatabase,
  initEnvironment,
  initLocales,
  initModels,
  initRoutes,
  initSocket,
  initLogger,
} from './init';

const context: Context = {};

initEnvironment(context)
  .then(initApp)
  .then(ctx => new Promise((resolve, reject) => {
    Promise.all([
      initLogger(ctx),
      initCache(ctx),
      initDatabase(ctx),
      initLocales(ctx),
    ]).then(([logger: Context, cache: Context, database: Context, locales: Context]) => {
      resolve({
        ...ctx,
        logger: logger.logger,
        cache: cache.cache,
        database: database.database,
        locales: locales.locales,
      });
    }).catch((err) => {
      reject(err);
    });
  }))
  .then(initModels)
  .then(initAuth)
  .then(initRoutes)
  .then(initSocket)
  .then((ctx: Context) => {
    const { app, logger } = ctx;
    if (app && logger) {
      const { hostname, port } = app;
      logger.info(`App running on ${hostname}:${port}.`);
    }
  })
  .catch((err) => {
    console.error('Application did not initialize.');
    console.error(err);
    process.exit();
  });
