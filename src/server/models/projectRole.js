import Sequelize from 'sequelize';

import { type ProjectPermission } from 'types/project';

type ProjectRole = {
  label: string,
  permissions: Array<ProjectPermission>,
};

const PROJECT_ROLES: Array<ProjectRole> = [
  {
    label: 'Member',
    permissions: [
      'CAN_ANNOTATE_DOCUMENTS',
    ],
  },
  {
    label: 'Admin',
    permissions: [
      'CAN_ADD_MEMBERS',
      'CAN_ADD_TAXONOMY',
      'CAN_EXPORT_TAXONOMY',
      'CAN_EDIT_TAXONOMY',
      'CAN_ADD_TO_TAXONOMY',
      'CAN_UPLOAD_DOCUMENTS',
    ],
  },
  {
    label: 'Owner',
    permissions: [
      'CAN_ADD_MEMBERS',
      'CAN_ADD_ADMINS',
      'CAN_ADD_OWNERS',
      'CAN_CHANGE_PROJECT_SETTINGS',
      'CAN_ADD_TAXONOMY',
      'CAN_EXPORT_TAXONOMY',
      'CAN_EDIT_TAXONOMY',
      'CAN_ADD_TO_TAXONOMY',
      'CAN_UPLOAD_DOCUMENTS',
      'CAN_ANNOTATE_DOCUMENTS',
    ],
  },
];

export const initProjectRoleModel = (
  db: Sequelize,
  force: boolean = false,
): Promise<Sequelize> => (
  new Promise((resolve) => {
    const model = db.define('projectRole', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      label: {
        type: Sequelize.STRING(100),
        unique: true,
      },
    }, {
      timestamps: false,
    });
    const modelPermissions = db.define('projectRolePermission', {
      projectRoleId: {
        type: Sequelize.UUID,
        primaryKey: true,
      },
      projectPermissionId: {
        type: Sequelize.STRING(100),
        primaryKey: true,
      },
    }, {
      timestamps: false,
    });
    model.sync({ force }).then(() => {
      modelPermissions.sync({ force }).then(() => {
        model
          .bulkCreate(
            PROJECT_ROLES.map((role: ProjectRole) => ({
              label: role.label,
            })),
            { ignoreDuplicates: true },
          )
          .then(() => {
            model.findAll().then((rows: Array<any>) => {
              const toInsert = rows.reduce(
                (insert: Array<any>, row: any): Array<any> => {
                  const role = PROJECT_ROLES.filter(r => r.label === row.label);
                  if (role.length < 1) {
                    return insert;
                  }
                  return insert.concat(role[0].permissions.map(p => ({
                    teamRoleId: row.id,
                    teamPermissionId: p,
                  })));
                },
                [],
              );
              modelPermissions
                .bulkCreate(toInsert, { ignoreDuplicates: true })
                .then(() => {
                  resolve(db);
                });
            });
          });
      });
    });
  })
);
