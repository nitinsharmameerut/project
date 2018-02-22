import moment from 'moment';
import { fromImportDocument } from 'lib/document';
import {
  type Annotations,
  type CompleteDocument,
  type CompleteFullDocument,
  type DocumentState,
  type Document,
  type ImportDocument,
  type ReadyFullDocument,
} from 'types/document';
import { type Project } from 'types/project';
import { type User } from 'types/user';
import {
  type AddDocumentsAction,
  type ChangeDocumentSetAction,
  type CompleteDocumentAction,
  type DeleteDocumentsAction,
  type MarkDocumentsAsCompleteAction,
  type SetDocumentsWorkBatchAction,
  type UpdateDocumentsAction,
} from 'types/redux/actions/documents';
import { type BatchState } from 'components/Documents/Upload';

export const addDocuments = (
  file: File,
  importDocuments: Array<ImportDocument>,
  name: string,
  project: Project,
  user: User,
  batchName: BatchState,
): AddDocumentsAction => {
  const map = fromImportDocument(
    batchName.batchName.trim().length > 0 ? batchName.batchName.trim() : moment().format('MMM D, h:mma'),
    Math.round((new Date()).getTime() / 1000),
    user,
  );
  return {
    documents: importDocuments.map(map),
    file,
    name,
    meta: {
      initiatedBy: user.id,
      project: project.id,
      sendToServer: false,
    },
    type: 'ADD DOCUMENTS',
  };
};

export const changeDocumentSet = (
  batch: ?string = null,
  documentSet: DocumentState,
): ChangeDocumentSetAction => ({
  batch,
  documentSet,
  meta: {
    initiatedBy: null,
    sendToServer: false,
  },
  type: 'CHANGE DOCUMENT SET',
});

export const completeDocument = (
  annotations: Annotations,
  document: ReadyFullDocument | CompleteFullDocument,
  project: Project,
  user: User,
): CompleteDocumentAction => ({
  annotations,
  document,
  meta: {
    initiatedBy: user.id,
    project: project.id,
    sendToServer: true,
  },
  type: 'COMPLETE DOCUMENT',
  user,
});

export const deleteDocuments = (
  documentIds: Array<string>,
  project: Project,
  user: User,
): DeleteDocumentsAction => ({
  documentIds,
  meta: {
    initiatedBy: user.id,
    project: project.id,
    sendToServer: true,
  },
  type: 'DELETE DOCUMENTS',
});

export const markDocumentsComplete = (
  documents: Array<CompleteDocument>,
  project: Project,
  user: User,
): MarkDocumentsAsCompleteAction => ({
  documents,
  meta: {
    initiatedBy: user.id,
    project: project.id,
    sendToServer: true,
  },
  type: 'MARK DOCUMENTS COMPLETE',
});

export const setDocumentsWorkBatch = (documentIds: Array<string>): SetDocumentsWorkBatchAction => ({
  documentIds,
  meta: {
    initiatedBy: null,
    sendToServer: false,
  },
  type: 'SET DOCUMENTS WORK BATCH',
});

export const updateDocuments = <T: Document>(
  documents: Array<T>,
  user: ?User = null,
): UpdateDocumentsAction<T> => ({
  documents,
  meta: {
    initiatedBy: user ? user.id : null,
    sendToServer: false,
  },
  type: 'UPDATE DOCUMENTS',
});
