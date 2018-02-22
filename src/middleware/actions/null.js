import { type NullAction } from 'types/redux/actions/null';

export const nullAction = (): NullAction => ({
  meta: {
    initiatedBy: null,
    sendToServer: false,
  },
  type: 'NULL ACTION',
});
