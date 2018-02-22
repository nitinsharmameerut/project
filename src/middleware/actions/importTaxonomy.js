import { addTaxonomy } from 'actions/taxonomy';
import sendAction from 'lib/sendAction';
import { getCurrentProject, getCurrentUser } from 'selectors/user';
import { type ImportTaxonomy } from 'types/project';
import { type Dispatch, type GetState } from 'types/redux';
// import { type ClientAction } from 'types/redux/actions/base';

export const importTaxonomy = (
  name: string,
  taxonomy: ImportTaxonomy,
) => (
  (dispatch: Dispatch, getState: GetState) => {
    const project = getCurrentProject(getState());
    const user = getCurrentUser(getState());
    if (project && user) {
      sendAction(addTaxonomy(
        name,
        project,
        taxonomy,
        user,
      ))
        .then((action: any) => {
          dispatch(action);
        });
    }
  }
);
