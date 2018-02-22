import fs from 'fs';
import { createLogger, format, transports } from 'winston';
import { type Context } from 'types/initContext';

const initLogger = (ctx: Context): Promise<Context> => (
  new Promise((resolve, reject) => {
    const { app, env } = ctx;
    if (!env) {
      reject(new Error('Initialization failure.'));
      return;
    }
    const { LOGGER_LEVEL, LOGGER_TRANSPORTS } = env;
    const LOGGER_TRANSPORTS_ARRAY = LOGGER_TRANSPORTS.split(',');
    const transportOptions = [];
    const logDir = 'log';

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    if (LOGGER_TRANSPORTS_ARRAY.includes('console')) {
      transportOptions.push(new transports.Console({ level: LOGGER_LEVEL }));
    }
    if (LOGGER_TRANSPORTS_ARRAY.includes('file')) {
      transportOptions.push(new transports.File({
        filename: `${logDir}/application.log`,
        level: LOGGER_LEVEL,
      }));
    }
    const { combine, timestamp, printf } = format;
    const logFormat = printf(info => (`${info.timestamp} ${info.level}: ${info.message}`));

    const logger = createLogger({
      level: LOGGER_LEVEL,
      format: combine(timestamp(), logFormat),
      transports: transportOptions,
    });
    if (app) {
      app.locals.logger = logger;
    }

    resolve({ ...ctx, logger, app });
  })
);
export default initLogger;
