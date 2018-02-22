import { type Project } from 'types/project';
import {
  type ClearCurrentUserAction,
  type MarkCurrentDocumentAsViewingAction,
  type SetCurrentUserAction,
} from 'types/redux/actions/user';
import { type User } from 'types/user';

export const setCurrentUser = (user: User): SetCurrentUserAction => ({
  meta: {
    initiatedBy: null,
    sendToServer: false,
  },
  type: 'SET CURRENT USER',
  user,
});

export const clearCurrentUser = (): ClearCurrentUserAction => ({
  meta: {
    initiatedBy: null,
    sendToServer: false,
  },
  type: 'CLEAR CURRENT USER',
});

export const markCurrentDocumentAsViewing = (
  user: User,
  project: Project,
  docId: ?string,
): MarkCurrentDocumentAsViewingAction => ({
  docId,
  meta: {
    initiatedBy: user.id,
    project: project.id,
    sendToServer: true,
  },
  type: 'MARK DOCUMENT AS VIEWING',
  user,
});
