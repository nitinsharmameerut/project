/* eslint-disable no-console */
import fs from 'fs';
import { zipObject } from 'lodash';
import Sequelize from 'sequelize';
import temp from 'tmp';

import { DEFAULT_CACHE_TIMEOUT } from 'constants/models';
import natSort from 'lib/naturalSort';
import { type Cache } from 'types/cache';
import { type ImportTaxonomy, type LeafNode, type Taxonomy } from 'types/project';

let taxonomyModel;
let taxonomyTermModel;

export const getTaxonomyCacheKey = (taxId: string): string => (
  `models.project.${taxId}`
);

export const initTaxonomyModel = (db: Sequelize, force: boolean = false): Promise<Sequelize> => (
  new Promise((resolve) => {
    taxonomyModel = db.define('taxonomy', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      projectId: {
        type: Sequelize.UUID,
        references: {
          model: db.models.project,
          key: 'id',
        },
        unique: 'byProject',
      },
      name: {
        type: Sequelize.STRING(100),
        unique: 'byProject',
      },
    });
    taxonomyTermModel = db.define('taxonomyTerm', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      label: {
        type: Sequelize.TEXT,
      },
    }, {
      indexes: [
        {
          type: 'FULLTEXT',
          fields: ['label'],
        },
      ],
    });
    taxonomyTermModel.belongsTo(taxonomyTermModel, {
      as: 'parent',
      onDelete: 'CASCADE',
    });
    taxonomyModel.hasMany(taxonomyTermModel, {
      as: 'Terms',
      onDelete: 'CASCADE',
    });
    db.models.project.hasMany(taxonomyModel, {
      onDelete: 'CASCADE',
    });
    taxonomyModel.sync({ force }).then(() => {
      taxonomyTermModel.sync({ force }).then(() => {
        resolve(db);
      });
    });
  })
);

const buildTaxonomyTree = (
  id: ?string,
  label: string,
) => (terms: Array<any>): Promise<Taxonomy> => (new Promise((resolve) => {
  if (terms.length < 1) {
    resolve({
      id,
      label,
      children: [],
      childrenCount: 0,
    });
    return;
  }
  const termIds: Array<string> = terms.map(t => t.id);
  const termObjects: Array<LeafNode> = terms.map(termObject => ({
    id: termObject.id,
    label: termObject.label,
  }));
  Promise
    .all(termIds.map((termId: string) => (
      taxonomyTermModel
        .findAll({
          limit: 100,
          order: [
            'label',
          ],
          where: {
            parentId: termId,
          },
        })
    )))
    .then((children: Array<Array<any>>) => (
      children.reduce((prev, next) => prev.concat(next), [])
    ))
    .then((children: Array<any>) => {
      if (children.length < 1) {
        resolve({
          id,
          label,
          children: termObjects,
          childrenCount: termObjects.length,
        });
        return;
      }
      Promise
        .all(termObjects.map((termObject: LeafNode) => (
          buildTaxonomyTree(
            termObject.id,
            termObject.label,
          )(children.filter(c => c.parentId === termObject.id))
        )))
        .then((grandChildren: Array<Taxonomy>) => {
          resolve({
            id,
            label,
            children: zipObject(
              grandChildren.map(g => g.label.toLowerCase()),
              grandChildren,
            ),
            childrenCount: grandChildren.length,
          });
        });
    });
}));

export const rowToModel = (row: any, cache: Cache, logger: any): Promise<Taxonomy> => (
  new Promise((resolve, reject) => {
    const cacheKey = getTaxonomyCacheKey(row.id);
    cache.get(cacheKey, (err: Error, result: ?string) => {
      if (err) {
        logger.error(err);
        reject(err);
        return;
      } else if (result) {
        resolve(JSON.parse(result));
        return;
      }
      row.getTerms({
        limit: 100,
        order: [
          'label',
        ],
        where: { parentId: null },
      })
        .then(buildTaxonomyTree(null, row.name))
        .then((taxonomy: Taxonomy) => {
          cache.set(cacheKey, JSON.stringify(taxonomy), 'EX', DEFAULT_CACHE_TIMEOUT);
          resolve(taxonomy);
        });
    });
  })
);

/**
 * Builds a taxonomy export.
 */
export const buildTaxonomyExport = (
  database: Sequelize,
  taxonomyId: string,
  parentId: ?string = null,
): Promise<ImportTaxonomy> => (
  new Promise((resolve) => {
    database.query( // a clever query for determining if the node has grandchildren
      `
        SELECT a.id, a.label, COUNT(*)
        FROM taxonomyTerms a
        INNER JOIN taxonomyTerms b ON a.id = b.parentId
        WHERE a.taxonomyId = :taxonomyId
        AND a.parentId ${parentId ? '= :parentId' : 'IS NULL'}
        GROUP BY a.id;
      `,
      {
        raw: false,
        replacements: {
          taxonomyId,
          parentId,
        },
      },
    )
      .then((rows: Array<any>) => {
        if (rows[0].length < 1) {
          // no grandchildren so can return all children as an array
          database.models.taxonomyTerm
            .findAll({
              attributes: ['label'],
              where: {
                taxonomyId,
                parentId: parentId || null,
              },
              order: [
                'label',
              ],
            })
            .then((grandchildren: Array<any>) => {
              resolve(grandchildren.map(g => g.label));
            });
          return;
        }
        const ids = rows[0].map(row => row.id);
        Promise
          .all(ids.map(id => buildTaxonomyExport(database, taxonomyId, id)))
          .then((childrenTax: Array<ImportTaxonomy>) => {
            const responseUnordered = zipObject(
              rows[0].map(row => row.label),
              childrenTax,
            );
            database.models.taxonomyTerm
              .findAll({
                attributes: ['label'],
                where: {
                  taxonomyId,
                  parentId: parentId || null,
                  // $FlowFixMe
                  id: {
                    [Sequelize.Op.notIn]: ids,
                  },
                },
              })
              .then((grandchildren: Array<any>) => {
                const additionalTerms = zipObject(
                  grandchildren.map(g => g.label),
                  grandchildren.map(() => []),
                );
                const merged = {
                  ...responseUnordered,
                  ...additionalTerms,
                };
                const sortedKeys: Array<string> = Object.keys(merged);
                sortedKeys.sort(natSort);
                resolve(zipObject(
                  sortedKeys,
                  sortedKeys.map(k => merged[k]),
                ));
              });
          });
      });
  })
);

export const handleExport = (taxId: string, database: Sequelize, res: any, logger: any) => {
  database.models.taxonomy
    .findById(taxId)
    .then((tax: any) => {
      if (!tax) {
        res.status(404).end('Not found.');
        return;
      }
      buildTaxonomyExport(database, taxId)
        .then((contents: ImportTaxonomy) => {
          temp.file((err1, path: string) => {
            if (!err1) {
              fs.writeFile(path, JSON.stringify(contents, null, 2), (err2) => {
                if (!err2) {
                  res.download(path, `Endexa taxonomy export - ${tax.name}.json`);
                  return;
                }
                logger.error(`Error 2: ${err2.message}`);
              });
              return;
            }
            logger.error(`Error 1: ${err1.message}`);
          });
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).send('Something went wrong with export.');
        });
    });
};
