/* eslint-disable no-underscore-dangle */
import React from 'react';
// $FlowFixMe
import { hydrate } from 'react-dom';
import createHistory from 'history/createBrowserHistory';
import { addLocaleData } from 'react-intl';
// $FlowFixMe
import en from 'react-intl/locale-data/en';
// $FlowFixMe
import fr from 'react-intl/locale-data/fr';

import initStore from 'lib/initStore';
import ClientApp from './ClientApp';

addLocaleData([...en, ...fr]);

const history = createHistory();
const store = initStore(
  history,
  window.__STORE_STATE__,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(),
  true,
);

hydrate(
  <ClientApp history={history} store={store} />,
  document.getElementById('app-container'),
);
