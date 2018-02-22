import Sequelize from 'sequelize';
import moment from 'moment';

import { type Cache } from 'types/cache';
import {
  type CompleteDocument,
  type Document,
  type ProcessingDocument,
  type ReadyDocument,
} from 'types/document';
import { type BriefUser } from 'types/briefUser';

export const getDocumentCacheKey = (document: string | Document): string => (
  typeof document === 'string' ?
    `models.document.${document}` :
    `models.document.${document.id}`
);

export const initDocumentModel = (db: Sequelize, force: boolean = false): Promise<Sequelize> => (
  new Promise((resolve) => {
    const documentBatch = db.define('documentBatch', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      label: {
        type: Sequelize.STRING,
      },
    });
    documentBatch.belongsTo(db.models.project, {
      onDelete: 'CASCADE',
    });

    const documentModel = db.define('document', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      state: {
        type: Sequelize.ENUM,
        values: ['uploaded', 'processing', 'ready', 'complete', 'failed'],
      },
      title: {
        type: Sequelize.STRING(101),
      },
      taskStatusUrl: {
        type: Sequelize.STRING(255),
      },
      taskCurrentStep: {
        type: Sequelize.INTEGER(255),
        defaultValue: 0,
      },
      taskTotalSteps: {
        type: Sequelize.INTEGER(255),
        defaultValue: 1,
      },
      confidence: {
        type: Sequelize.ENUM,
        values: ['None', 'Low', 'High'],
        defaultValue: 'None',
      },
      hasFailed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
    }, {
      indexes: [
        {
          fields: ['state', 'projectId'],
        },
      ],
    });
    documentModel.belongsTo(documentBatch, {
      onDelete: 'CASCADE',
    });
    documentModel.belongsTo(db.models.project, {
      onDelete: 'CASCADE',
    });
    db.models.project.hasMany(documentModel, {
      onDelete: 'CASCADE',
    });
    documentModel.belongsTo(db.models.user, {
      as: 'uploadedBy',
    });
    documentModel.belongsTo(db.models.user, {
      as: 'completedBy',
    });
    documentModel.hasMany(db.models.user, {
      as: 'currentlyViewingUsers',
      foreignKey: 'currentlyViewingDocument',
    });

    documentBatch.sync({ force }).then(() => {
      documentModel.sync({ force }).then(() => {
        resolve(db);
      });
    });
  })
);

export const getDefaultDocumentJoins = (databaseModels: any) => ([
  {
    attributes: ['id', 'name', 'avatar'],
    model: databaseModels.user,
    as: 'uploadedBy',
  }, {
    attributes: ['id', 'name', 'avatar'],
    model: databaseModels.user,
    as: 'completedBy',
  }, {
    attributes: ['label', 'createdAt'],
    model: databaseModels.documentBatch,
  },
  {
    model: databaseModels.project,
  },
]);

const processingDocumentFromRow = (row: any, logger: any): Promise<ProcessingDocument> => (
  new Promise((resolve, reject) => {
    const {
      documentBatch,
      hasFailed,
      id,
      taskCurrentStep,
      taskTotalSteps,
      title,
    } = row;
    row
      .getCurrentlyViewingUsers({
        attributes: ['id', 'name', 'avatar'],
      })
      .then((users: Array<any>) => {
        resolve({
          batchDetails: {
            label: documentBatch.label,
            time: moment(documentBatch.createdAt).unix(),
          },
          hasFailed,
          id,
          state: 'processing',
          task: {
            progress: taskCurrentStep,
            steps: taskTotalSteps,
          },
          title: title || 'Untitled',
          uploadedBy: {
            id: row.uploadedBy.id,
            name: row.uploadedBy.name,
            avatar: row.uploadedBy.avatar,
          },
          viewing: users.map((u: any): BriefUser => ({
            id: u.id,
            name: u.name,
            avatar: u.avatar,
          })),
        });
      })
      .catch((err: Error) => {
        logger.error(err);
        reject(err);
      });
  })
);

const readyDocumentFromRow = (row: any, logger: any): Promise<ReadyDocument> => (
  new Promise((resolve, reject) => {
    const {
      confidence,
      hasFailed,
      id,
      documentBatch,
      title,
    } = row;
    try {
      row
        .getCurrentlyViewingUsers({
          attributes: ['id', 'name', 'avatar'],
        })
        .then((users: Array<any>) => {
          resolve({
            annotationConfidence: confidence,
            batchDetails: {
              label: documentBatch.label,
              time: moment(documentBatch.createdAt).unix(),
            },
            hasFailed,
            id,
            state: 'ready',
            title: title || 'Untitled',
            uploadedBy: {
              id: row.uploadedBy.id,
              name: row.uploadedBy.name,
              avatar: row.uploadedBy.avatar,
            },
            viewing: users.map((u: any): BriefUser => ({
              id: u.id,
              name: u.name,
              avatar: u.avatar,
            })),
          });
        })
        .catch((err: Error) => {
          logger.error(err);
          reject(err);
        });
    } catch (err) {
      logger.error(err);
      reject(err);
    }
  })
);

const completeDocumentFromRow = (row: any, logger: any): Promise<CompleteDocument> => (
  new Promise((resolve, reject) => {
    const {
      hasFailed,
      id,
      documentBatch,
      title,
    } = row;
    row
      .getCurrentlyViewingUsers({
        attributes: ['id', 'name', 'avatar'],
      })
      .then((users: Array<any>) => {
        resolve({
          batchDetails: {
            label: documentBatch.label,
            time: moment(documentBatch.createdAt).unix(),
          },
          completedBy: {
            id: row.completedBy.id,
            name: row.completedBy.name,
            avatar: row.completedBy.avatar,
          },
          hasFailed,
          id,
          state: 'complete',
          title: title || 'Untitled',
          uploadedBy: {
            id: row.uploadedBy.id,
            name: row.uploadedBy.name,
            avatar: row.uploadedBy.avatar,
          },
          viewing: users.map((u: any): BriefUser => ({
            id: u.id,
            name: u.name,
            avatar: u.avatar,
          })),
        });
      })
      .catch((err: Error) => {
        logger.error(err);
        reject(err);
      });
  })
);

const documentFromRow = (row: any, logger: any): Promise<Document> => (
  new Promise((resolve, reject) => {
    switch (row.state) {
      case 'uploaded':
      case 'processing':
        processingDocumentFromRow(row, logger)
          .then((result: ProcessingDocument) => {
            resolve(result);
          })
          .catch((err) => {
            logger.error(err);
            reject(err);
          });
        return;
      case 'ready':
        readyDocumentFromRow(row, logger)
          .then((result: ReadyDocument) => {
            resolve(result);
          })
          .catch((err) => {
            logger.error(err);
            reject(err);
          });
        return;
      case 'complete':
        completeDocumentFromRow(row, logger)
          .then((result: CompleteDocument) => {
            resolve(result);
          })
          .catch((err) => {
            logger.error(err);
            reject(err);
          });
        return;
      default:
        reject(new Error(`Unhandled document state: "${row.state}".`));
    }
  })
);

export const rowToModel = (row: any, cache: Cache, logger: any): Promise<Document> => (
  new Promise((resolve, reject) => {
    documentFromRow(row, logger)
      .then((document: Document) => {
        resolve(document);
      })
      .catch((e) => {
        logger.error(e);
        reject(e);
      });
  })
);
