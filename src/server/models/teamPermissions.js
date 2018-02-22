import Sequelize from 'sequelize';

import { type TeamPermission } from 'types/team';

type TeamPermissionMap = {
  [key: TeamPermission]: string,
};

export const TEAM_PERMISSIONS: TeamPermissionMap = {
  CAN_ADD_TEAM_MEMBER: 'Can add new team members.',
  CAN_REMOVE_TEAM_MEMBER: 'Can remove team members.',
  CAN_ADD_TEAM_MANAGER: 'Can add new team manager.',
  CAN_REMOVE_TEAM_MANAGER: 'Can remove a team manager.',
  CAN_ADD_TEAM_OWNER: 'Can add new team owner.',
  CAN_REMOVE_TEAM_OWNER: 'Can remove a team owner.',
  CAN_CREATE_NEW_PROJECT: 'Can create a new project.',
  CAN_CHANGE_TEAM_SETTINGS: 'Can change team settings.',
};

export const initTeamPermissionsModel = (
  db: Sequelize,
  force: boolean = false,
): Promise<Sequelize> => (
  new Promise((resolve) => {
    const model = db.define('teamPermission', {
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
      const keys = Object.keys(TEAM_PERMISSIONS);
      model
        .bulkCreate(
          keys.map((id: TeamPermission) => ({
            id,
            label: TEAM_PERMISSIONS[id],
          })),
          { ignoreDuplicates: true },
        )
        .then(() => {
          resolve(db);
        });
    });
  })
);
