import sendAction from 'lib/sendAction';
import { getCurrentProject, getCurrentUser, getUploadDocuments } from 'selectors/user';
import { unwrap } from 'types/maybe';
import { type DocumentMap, type ProcessingDocument, type UploadingDocument } from 'types/document';
import { type Dispatch, type GetState } from 'types/redux';
import { type UpdateDocumentsAction } from 'types/redux/actions/documents';
import { type UploadDocumentsAction } from 'types/redux/actions/upload';

const UPLOAD_SIZE = 5;

export const uploadDocuments = (
  documents: Array<UploadingDocument>,
  initiatedBy: string,
  project: string,
  batchLabel: string,
  batchId: ?string = null,
): UploadDocumentsAction => ({
  batchId,
  batchLabel,
  documents,
  meta: {
    initiatedBy,
    project,
    sendToServer: true,
  },
  project,
  type: 'UPLOAD DOCUMENTS',
});

export const processUploadBatch = (batchLabel: string, batchId: ?string = null) => (
  (dispatch: Dispatch, getState: GetState) => {
    const uploadDocs: DocumentMap<UploadingDocument> = getUploadDocuments(getState());
    const documentIds: Array<string> = Object.keys(uploadDocs);
    if (documentIds.length < 1) {
      return;
    }
    const uploadAction: UploadDocumentsAction = uploadDocuments(
      documentIds.slice(0, UPLOAD_SIZE).map((id: string): UploadingDocument => uploadDocs[id]),
      unwrap(getCurrentUser(getState())).id,
      unwrap(getCurrentProject(getState())).id,
      batchLabel,
      batchId,
    );
    sendAction(uploadAction)
      .then((action: UpdateDocumentsAction<ProcessingDocument>) => {
        dispatch(action);
        setTimeout(() => {
          dispatch(processUploadBatch(batchLabel, action.batchId || null));
        }, 0);
      });
  }
);
