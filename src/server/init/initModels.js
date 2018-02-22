import { type Context } from 'types/initContext';

import { initProjectModel } from '../models/project';
import { initTaxonomyModel } from '../models/taxonomy';
import { initUserModel } from '../models/user';
import { initDocumentModel } from '../models/document';
import { initProjectPermissionsModel } from '../models/projectPermissions';
import { initProjectRoleModel } from '../models/projectRole';
import { initTeamPermissionsModel } from '../models/teamPermissions';
import { initTeamRoleModel } from '../models/teamRole';
import { initTeamModel } from '../models/team';

const initModels = (ctx: Context): Promise<Context> => (
  new Promise((resolve, reject) => {
    const { database } = ctx;
    if (!database) {
      reject(new Error('Database did not initialize.'));
      return;
    }
    initTeamPermissionsModel(database)
      .then(initProjectPermissionsModel)
      .then(initTeamRoleModel)
      .then(initTeamModel)
      .then(initProjectModel)
      .then(initProjectRoleModel)
      .then(initUserModel)
      .then(initTaxonomyModel)
      .then(initDocumentModel)
      .then(() => {
        resolve({
          ...ctx,
          database,
        });
      });
  })
);

export default initModels;
