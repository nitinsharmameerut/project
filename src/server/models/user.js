import Sequelize from 'sequelize';
import { zipObject } from 'lodash';

import { DEFAULT_CACHE_TIMEOUT } from 'constants/models';
import { type Cache } from 'types/cache';
import { type Project } from 'types/project';
import { type RawUser, type User } from 'types/user';
import { getProjectCacheKey, rowToModel as projectRowToModel } from './project';

let databaseModels;

export const initUserModel = (db: Sequelize, force: boolean = false): Promise<Sequelize> => (
  new Promise((resolve) => {
    const userModel = db.define('user', {
      id: {
        allowNull: false,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      email: {
        allowNull: false,
        type: Sequelize.STRING(128),
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      avatar: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      currentlyViewingDocument: {
        type: Sequelize.UUID,
      },
    }, {
      indexes: [
        {
          fields: ['currentlyViewingDocument'],
        },
      ],
    });
    userModel.belongsTo(db.models.project, {
      as: 'currentProject',
    });
    const userTeam = db.define('userTeam', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
    }, {
      timestamps: false,
    });
    userTeam.belongsTo(userModel, {
      onDelete: 'CASCADE',
    });
    userTeam.belongsTo(db.models.team, {
      onDelete: 'CASCADE',
    });
    userTeam.belongsTo(db.models.teamRole);
    const userProject = db.define('userProject', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      lastAccessed: {
        type: Sequelize.INTEGER, // use a unix timestamp
      },
    }, {
      timestamps: false,
    });
    userProject.belongsTo(userModel, {
      onDelete: 'CASCADE',
    });
    userProject.belongsTo(db.models.project, {
      onDelete: 'CASCADE',
    });
    userProject.belongsTo(db.models.projectRole);
    userModel.sync({ force }).then(() => {
      userTeam.sync({ force }).then(() => {
        userProject.sync({ force }).then(() => {
          databaseModels = db.models;
          resolve(db);
        });
      });
    });
  })
);

export const rowToModel = (row: any, cache: Cache, logger: any): Promise<User> => (
  new Promise((resolve, reject) => {
    Promise
      .all([
        databaseModels.userProject.findAll({
          include: [
            {
              attributes: ['name', 'slug'],
              model: databaseModels.project,
            },
          ],
          where: { userId: row.id },
          order: [
            ['lastAccessed', 'DESC'],
          ],
          limit: 5,
        }),
        databaseModels.userTeam.findAll({
          include: [
            {
              attributes: ['name'],
              model: databaseModels.team,
            },
          ],
          where: { userId: row.id },
          order: [
            Sequelize.col('team.name'),
          ],
        }),
      ])
      .then((results: Array<Array<any>>) => {
        const recentProjects = results[0];
        const teams = results[1];
        Promise
          .all(teams.map((t: any) => databaseModels.teamRolePermission.findAll({
            where: { teamRoleId: t.teamRoleId },
          })))
          .then((teamPermissions: Array<Array<any>>) => {
            const teamData = zipObject(
              teams.map(t => t.teamId),
              teams.map((t, i) => ({
                id: t.teamId,
                name: t.team.name,
                permissions: teamPermissions[i].map(tp => tp.teamPermissionId),
              })),
            );
            const { currentProject } = row;
            const model: User = {
              id: row.id,
              email: row.email,
              avatar: row.avatar,
              name: row.name,
              teams: teamData,
              currentProject: null,
              recentProjects: recentProjects.map(p => ({
                id: p.id,
                name: p.project.name,
                slug: p.project.slug,
              })),
            };
            if (currentProject) {
              const projectCacheKey = getProjectCacheKey(currentProject);
              cache.get(projectCacheKey, (err: Error, result: ?string) => {
                if (err) {
                  reject(err);
                  return;
                } else if (result) {
                  model.currentProject = JSON.parse(result);
                  resolve(model);
                  return;
                }
                projectRowToModel(currentProject, cache, logger)
                  .then((p: Project) => {
                    cache.set(
                      projectCacheKey,
                      JSON.stringify(p),
                      'EX',
                      DEFAULT_CACHE_TIMEOUT,
                    );
                    model.currentProject = p;
                    resolve(model);
                  });
              });
              return;
            }
            resolve(model);
          });
      });
  })
);

export const populateUser = (
  db: Sequelize,
  raw: RawUser,
  cache: Cache,
  logger: any,
): Promise<User> => (
  new Promise((resolve, reject) => {
    if (raw.emails.length < 1) {
      reject(new Error('User does not have an email address.'));
      return;
    }
    const email: string = raw.emails[0].value;
    db.models.user
      .findOrCreate({
        where: {
          email,
        },
        defaults: {
          avatar: raw.picture || '',
          currentProjectId: null,
          email,
          name: raw.nickname || 'No Name',
        },
        include: [{
          model: db.models.project,
          as: 'currentProject',
        }],
      })
      .then(([row: any, created: boolean]) => {
        if (!created) {
          rowToModel(row, cache, logger)
            .then((user: User) => {
              resolve(user);
            });
          return;
        }
        db.models.user
          .count()
          .then((result: number) => {
            if (result === 1) {
              // this is our first user so adding them to the admin team
              Promise
                .all([
                  // $FlowFixMe
                  db.models.team.findOne(),
                  // $FlowFixMe
                  db.models.teamRole.findOne({
                    where: { label: 'Admin' },
                  }),
                ])
                .then(([team: any, role: any]) => {
                  if (!row || !team || !role) {
                    reject(new Error('Unable to assign first user to team.'));
                  }
                  db.models.userTeam
                    .create({
                      // $FlowFixMe
                      userId: row.id,
                      teamId: team.id,
                      teamRoleId: role.id,
                    })
                    .then(() => {
                      rowToModel(row, cache, logger)
                        .then((user: User) => {
                          resolve(user);
                        });
                    });
                });
              return;
            }
            rowToModel(row, cache, logger)
              .then((user: User) => {
                resolve(user);
              });
          });
      });
  })
);
