import Sequelize from 'sequelize';

import { type ProjectPermission } from 'types/project';

type ProjectPermissionMap = {
  [key: ProjectPermission]: string,
};

const PROJECT_PERMISSIONS: ProjectPermissionMap = {
  CAN_ADD_MEMBERS: 'Can add project members.',
  CAN_ADD_ADMINS: 'Can add project admins.',
  CAN_ADD_OWNERS: 'Can add project owners.',
  CAN_CHANGE_PROJECT_SETTINGS: 'Can change project settings.',
  CAN_ADD_TAXONOMY: 'Can import a new taxonomy.',
  CAN_EXPORT_TAXONOMY: 'Can export a taxonomy.',
  CAN_EDIT_TAXONOMY: 'Can edit a taxonomy.',
  CAN_ADD_TO_TAXONOMY: 'Can add terms to a taxonomy.',
  CAN_UPLOAD_DOCUMENTS: 'Can upload new documents.',
  CAN_ANNOTATE_DOCUMENTS: 'Can annotate documents.',
};

export const initProjectPermissionsModel = (
  db: Sequelize,
  force: boolean = false,
): Promise<Sequelize> => (
  new Promise((resolve) => {
    const model = db.define('projectPermission', {
      id: {
        type: Sequelize.STRING(100),
        primaryKey: true,
      },
      label: {
        type: Sequelize.STRING(100),
      },
    }, {
      timestamps: false,
    });
    model.sync({ force }).then(() => {
      const keys = Object.keys(PROJECT_PERMISSIONS);
      model
        .bulkCreate(
          keys.map((id: ProjectPermission) => ({
            id,
            label: PROJECT_PERMISSIONS[id],
          })),
          { ignoreDuplicates: true },
        )
        .then(() => {
          resolve(db);
        });
    });
  })
);
