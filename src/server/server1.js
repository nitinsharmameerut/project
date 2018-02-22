import React from 'react';
import { Provider } from 'react-redux';
import { StaticRouter } from 'react-router-dom';

import App from 'components/App';
import { type Store } from 'types/redux';

type Props = {
  context: any,
  store: Store,
  url: string,
};
const ServerApp = ({ context, store, url }: Props) => (
  <Provider store={store}>
    <StaticRouter location={url} context={context}>
      <App />
    </StaticRouter>
  </Provider>
);

export default ServerApp;
