import {
  type CreateNewProjectAction,
  type ProjectAddedAction,
} from 'types/redux/actions/project';
import { type Project } from 'types/project';
import { type User } from 'types/user';

export const createNewProject = (
  user: User,
  name: string,
  teamId: string,
): CreateNewProjectAction => ({
  meta: {
    initiatedBy: user.id,
    project: 'NEW',
    sendToServer: true,
  },
  name,
  teamId,
  type: 'CREATE NEW PROJECT',
});

export const projectAdded = (project: Project, user: User): ProjectAddedAction => ({
  project,
  meta: {
    initiatedBy: user.id,
    sendToServer: false,
  },
  type: 'PROJECT ADDED',
});
