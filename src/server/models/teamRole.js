import Sequelize from 'sequelize';

import { type TeamPermission } from 'types/team';

type TeamRole = {
  label: string,
  permissions: Array<TeamPermission>,
};

const TEAM_ROLES: Array<TeamRole> = [
  {
    label: 'Member',
    permissions: [

    ],
  },
  {
    label: 'Manager',
    permissions: [
      'CAN_ADD_TEAM_MEMBER',
      'CAN_REMOVE_TEAM_MEMBER',
      'CAN_CREATE_NEW_PROJECT',
      'CAN_CHANGE_TEAM_SETTINGS',
    ],
  },
  {
    label: 'Admin',
    permissions: [
      'CAN_ADD_TEAM_MEMBER',
      'CAN_REMOVE_TEAM_MEMBER',
      'CAN_ADD_TEAM_MANAGER',
      'CAN_REMOVE_TEAM_MANAGER',
      'CAN_ADD_TEAM_OWNER',
      'CAN_REMOVE_TEAM_OWNER',
      'CAN_CREATE_NEW_PROJECT',
      'CAN_CHANGE_TEAM_SETTINGS',
    ],
  },
];

export const initTeamRoleModel = (
  db: Sequelize,
  force: boolean = false,
): Promise<Sequelize> => (
  new Promise((resolve) => {
    const model = db.define('teamRole', {
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
    const modelPermissions = db.define('teamRolePermission', {
      teamRoleId: {
        type: Sequelize.UUID,
        primaryKey: true,
      },
      teamPermissionId: {
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
            TEAM_ROLES.map((role: TeamRole) => ({
              label: role.label,
            })),
            { ignoreDuplicates: true },
          )
          .then(() => {
            model.findAll().then((rows: Array<any>) => {
              const toInsert = rows.reduce(
                (insert: Array<any>, row: any): Array<any> => {
                  const role = TEAM_ROLES.filter(r => r.label === row.label);
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
