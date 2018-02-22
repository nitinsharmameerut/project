import cuid from 'cuid';

import { type ImportTaxonomy, type Taxonomy, type Project } from 'types/project';
import {
  type AddTaxonomyAction,
  type AddTermToTaxonomyAction,
  type ChangeSelectedTaxonomyAction,
  type CompletedTaxonomyImportAction,
  type CreateTaxonomyImportAction,
  type FilterTaxonomyRequestAction,
  type FilterTaxonomyResponseAction,
  type RemoveTermFromTaxonomyAction,
  type RenameTaxonomyAction,
  type RenameTermInTaxonomyAction,
  type UpdateClientTaxonomyIdAction,
  type UpdateClientTaxonomyImportAction,
  type UpdateClientTaxonomyTermIdAction,
} from 'types/redux/actions/taxonomy';
import { type User } from 'types/user';

export const addTaxonomy = (
  name: string,
  project: Project,
  taxonomy: ImportTaxonomy,
  user: User,
): AddTaxonomyAction => ({
  id: cuid(),
  meta: {
    initiatedBy: user.id,
    project: project.id,
    sendToServer: true,
  },
  name,
  taxonomy,
  type: 'ADD TAXONOMY',
});

export const addToTaxonomy = (
  label: string,
  parent: ?string,
  project: Project,
  user: User,
  taxonomy: string,
): AddTermToTaxonomyAction => ({
  id: cuid(),
  label,
  meta: {
    initiatedBy: user.id,
    project: project.id,
    sendToServer: true,
  },
  parent,
  taxonomy,
  type: 'ADD TO TAXONOMY',
});

export const changeSelectedTaxonomy = (taxonomy: ?string): ChangeSelectedTaxonomyAction => ({
  meta: {
    initiatedBy: null,
    sendToServer: false,
  },
  type: 'CHANGE SELECTED TAXONOMY',
  taxonomy,
});

export const completedTaxonomyImport = (
  id: string,
  tax: Taxonomy,
): CompletedTaxonomyImportAction => ({
  id,
  meta: {
    initiatedBy: null,
    sendToServer: false,
  },
  taxonomy: tax,
  type: 'COMPLETED TAXONOMY IMPORT',
});

export const createTaxonomyImport = (
  id: string,
  name: string,
  totalSteps: number,
): CreateTaxonomyImportAction => ({
  id,
  meta: {
    initiatedBy: null,
    sendToServer: false,
  },
  name,
  totalSteps,
  type: 'CREATE TAXONOMY IMPORT',
});

export const filterTaxonomyRequest = (
  filter: string,
  taxonomyId: string,
  project: Project,
  user: User,
): FilterTaxonomyRequestAction => ({
  filter,
  meta: {
    initiatedBy: user.id,
    project: project.id,
    sendToServer: true,
  },
  taxonomyId,
  type: 'FILTER TAXONOMY REQUEST',
});

export const filterTaxonomyResponse = (
  filter: string,
  taxonomy: Taxonomy,
  taxonomyId: string,
  user: User,
): FilterTaxonomyResponseAction => ({
  filter,
  meta: {
    initiatedBy: user.id,
    sendToServer: false,
  },
  taxonomy,
  taxonomyId,
  type: 'FILTER TAXONOMY RESPONSE',
});

export const removeFromTaxonomy = (
  id: string,
  project: Project,
  taxonomy: string,
  user: User,
): RemoveTermFromTaxonomyAction => ({
  id,
  meta: {
    initiatedBy: user.id,
    project: project.id,
    sendToServer: true,
  },
  taxonomy,
  type: 'REMOVE FROM TAXONOMY',
});

export const renameTaxonomy = (
  id: string,
  newName: string,
  project: Project,
  user: User,
): RenameTaxonomyAction => ({
  id,
  meta: {
    initiatedBy: user.id,
    project: project.id,
    sendToServer: true,
  },
  newName,
  type: 'RENAME TAXONOMY',
});

export const renameTermInTaxonomy = (
  id: string,
  newName: string,
  project: Project,
  taxonomy: string,
  user: User,
): RenameTermInTaxonomyAction => ({
  id,
  newName,
  meta: {
    initiatedBy: user.id,
    project: project.id,
    sendToServer: true,
  },
  taxonomy,
  type: 'RENAME TERM IN TAXONOMY',
});

export const updateClientTaxonomyId = (
  clientId: string,
  id: string,
): UpdateClientTaxonomyIdAction => ({
  clientId,
  id,
  meta: {
    initiatedBy: null,
    sendToServer: false,
  },
  type: 'UPDATE CLIENT TAXONOMY ID',
});

export const updateClientTaxonomyTermId = (
  clientId: string,
  id: string,
  taxonomyId: string,
): UpdateClientTaxonomyTermIdAction => ({
  clientId,
  id,
  meta: {
    initiatedBy: null,
    sendToServer: false,
  },
  taxonomyId,
  type: 'UPDATE CLIENT TAXONOMY TERM ID',
});

export const updateClientTaxonomyImport = (
  id: string,
  currentStep: number,
  totalSteps: number,
): UpdateClientTaxonomyImportAction => ({
  id,
  meta: {
    initiatedBy: null,
    sendToServer: false,
  },
  currentStep,
  totalSteps,
  type: 'UPDATE TAXONOMY IMPORT',
});
