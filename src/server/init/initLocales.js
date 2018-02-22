import { addLocaleData } from 'react-intl';
// $FlowFixMe
import en from 'react-intl/locale-data';

import { type Context } from 'types/initContext';

const initLocales = (ctx: Context): Context => {
  const locales = addLocaleData([...en]);
  return {
    ...ctx,
    locales,
  };
};

export default initLocales;
