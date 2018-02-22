import Sequelize from 'sequelize';
import { zipObject } from 'lodash';

import { type Cache } from 'types/cache';
import {
  type CompleteDocument,
  type ProcessingDocument,
  type ReadyDocument,
} from 'types/document';
import { type Project, type Taxonomy } from 'types/project';
import { rowToModel as taxonomyRowToModel } from './taxonomy';
import { getDefaultDocumentJoins, rowToModel as documentRowToModel } from './document';

export const getProjectCacheKey = (project: string | Project): string => (
  typeof project === 'string' ?
    `models.project.${project}` :
    `models.project.${project.id}`
);

let databaseModels;

export const initProjectModel = (db: Sequelize, force: boolean = false): Promise<Sequelize> => (
  new Promise((resolve) => {
    const model = db.define('project', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
      },
      slug: {
        type: Sequelize.STRING(128),
        unique: 'uniqueSlug',
      },
      model: {
        type: Sequelize.STRING(255),
      },
      token: {
        type: Sequelize.TEXT,
      },
    });
    model.belongsTo(db.models.team);
    model
      .sync({ force })
      .then(() => {
        databaseModels = db.models;
        resolve(db);
      });
  })
);

export const rowToModel = (row: any, cache: Cache, logger: any): Promise<Project> => (
  new Promise((resolve) => {
    Promise.all([
      row.getTaxonomies({
        limit: 100,
        order: ['name'],
      }),
      row.getDocuments({
        include: getDefaultDocumentJoins(databaseModels),
        order: ['id'],
        where: {
          state: 'processing',
        },
      }),
      row.getDocuments({
        include: getDefaultDocumentJoins(databaseModels),
        order: ['id'],
        where: {
          state: 'ready',
        },
      }),
      row.getDocuments({
        include: getDefaultDocumentJoins(databaseModels),
        order: ['id'],
        where: {
          state: 'complete',
        },
      }),
    ]).then(([
      taxRows: Array<any>,
      processingDocs: Array<any>,
      readyDocs: Array<any>,
      completeDocs: Array<any>,
    ]) => {
      Promise.all([
        Promise.all(taxRows.map((r: any) => taxonomyRowToModel(r, cache, logger))),
        Promise.all(processingDocs.map((r: any) => documentRowToModel(r, cache, logger))),
        Promise.all(readyDocs.map((r: any) => documentRowToModel(r, cache, logger))),
        Promise.all(completeDocs.map((r: any) => documentRowToModel(r, cache, logger))),
      ])
        .then((map: Array<any>) => {
          const taxonomies: Array<Taxonomy> = map[0];
          const processing: Array<ProcessingDocument> = map[1];
          const ready: Array<ReadyDocument> = map[2];
          const complete: Array<CompleteDocument> = map[3];
          resolve({
            id: row.id,
            name: row.name,
            slug: row.slug,
            documents: {
              total: processing.length + ready.length + complete.length,
              uploading: {
                total: 0,
                documents: {},
              },
              processing: {
                total: processing.length,
                documents: zipObject(
                  processing.map(d => d.id),
                  processing,
                ),
              },
              ready: {
                total: ready.length,
                documents: zipObject(
                  ready.map(d => d.id),
                  ready,
                ),
              },
              complete: {
                total: complete.length,
                documents: zipObject(
                  complete.map(d => d.id),
                  complete,
                ),
              },
            },
            taxonomies: zipObject(
              taxRows.map(t => t.id),
              taxonomies,
            ),
          });
        });
    });
  })
);
