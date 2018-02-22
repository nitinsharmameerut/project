import { type InitEnvAction } from 'types/redux/actions/env';
import { type EnvironmentSettings } from 'types/redux/reducers/env';

export const initEnv = (env: EnvironmentSettings): InitEnvAction => ({
  env,
  meta: {
    initiatedBy: null,
    sendToServer: false,
  },
  type: 'INIT ENVIRONMENT',
});
