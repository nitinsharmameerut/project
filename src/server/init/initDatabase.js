import Sequelize from 'sequelize';

import { type Context } from 'types/initContext';

const initDatabase = (ctx: Context): Promise<Context> => (
  new Promise((resolve, reject) => {
    const { env } = ctx;
    if (!env) {
      reject(new Error('Initialization failure.'));
      return;
    }
    const {
      DB_HOST,
      DB_PORT,
      DB_USER,
      DB_PASS,
      DB_NAME,
    } = env;
    const connString = `mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
    const database = new Sequelize(
      connString,
      {
        define: {
          charset: 'utf8',
          collate: 'utf8_general_ci',
        },
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
        logging: false,
      },
    );
    database
      .authenticate()
      .then(() => {
        resolve({
          ...ctx,
          database,
        });
      })
      .catch((err) => {
        reject(err);
      });
  })
);

export default initDatabase;
