import dotenv from 'dotenv';

import { type Context } from 'types/initContext';

const initEnvironment = (ctx: Context): Promise<Context> => (
  new Promise((resolve) => {
    dotenv.config();
    const { env } = process;
    resolve({
      ...ctx,
      env,
    });
  })
);

export default initEnvironment;
