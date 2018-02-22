import Sequelize from 'sequelize';

export const initTeamModel = (
  db: Sequelize,
  force: boolean = false,
): Promise<Sequelize> => (
  new Promise((resolve) => {
    const teamModel = db.define('team', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
      },
    });
    teamModel.sync({ force }).then(() => {
      teamModel
        .count()
        .then((result: number) => {
          if (result < 1) {
            teamModel
              .create({ name: 'Endexa Admins' })
              .then(() => {
                resolve(db);
              });
            return;
          }
          resolve(db);
        });
    });
  })
);
