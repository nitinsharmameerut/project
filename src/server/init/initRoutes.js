import React from 'react';
import { renderToString } from 'react-dom/server';
import { ServerStyleSheet } from 'styled-components';
import passport from 'passport';
import request from 'request';
import { get } from 'lodash';

import { initEnv } from 'actions/env';
import { setCurrentUser } from 'actions/user';
import createHistory from 'history/createMemoryHistory';
import initStore from 'lib/initStore';
import { getCurrentUser } from 'selectors/user';
import { type Context } from 'types/initContext';
import { isNothing } from 'types/maybe';
import { type User } from 'types/user';
import ServerApp from '../ServerApp';
import { handleAction, emitAction } from '../actions';
import { rowToModel as userRowToModel } from '../models/user';
import { handleExport } from '../models/taxonomy';

const initRoutes = (ctx: Context): Promise<Context> => (
  new Promise((resolve, reject) => {
    const {
      app,
      cache,
      database,
      env,
    } = ctx;
    if (!(app && cache && database && env)) {
      reject(new Error('Initialization failure.'));
      return;
    }
    app.all('*', (req, res, next) => {
      // initializes a redux store
      res.locals.store = initStore(createHistory());
      res.locals.store.dispatch(initEnv({
        auth: {
          clientId: env.AUTH0_CLIENT_ID,
          domain: env.AUTH0_DOMAIN,
        },
      }));
      next();
    });
    app.all('*', (req, res, next) => {
      if (req.user) {
        // if we have a logged in user, let the store know
        res.locals.store.dispatch(setCurrentUser(req.user));
      }
      next();
    });
    app.get('/', (req, res, next) => {
      const user = getCurrentUser(res.locals.store.getState());
      // if we already have a logged in user, redirect to the active project
      if (user) {
        if (user.currentProject) {
          res.redirect(`/projects/${user.currentProject.slug}`);
        } else {
          res.redirect('/projects');
        }
        return;
      }
      next();
    });
    app.get('/stream', (req, res) => {
      req.pipe(request(req.query.url)).pipe(res);
    });
    app.get(
      '/login',
      passport.authenticate('auth0', {
        clientID: env.AUTH0_CLIENT_ID,
        domain: env.AUTH0_DOMAIN,
        redirectUri: env.AUTH0_CALLBACK_URL,
        audience: `https://${env.AUTH0_DOMAIN}/userinfo`,
        responseType: 'code',
        scope: 'openid',
      }),
      (req, res) => {
        res.redirect('/');
      },
    );
    app.get('/logout', (req, res) => {
      req.logout();
      res.redirect('/?logout=true');
    });
    app.get(
      '/callback',
      passport.authenticate('auth0', {
        failureRedirect: '/',
      }),
      (req, res) => {
        if (!req.user) {
          throw new Error('No user.');
        }
        res.locals.store.dispatch(setCurrentUser(req.user));
        res.redirect(req.session.returnTo || '/user');
      },
    );
    app.get('*', (req, res, next) => {
      if (req.url !== '/' && isNothing(getCurrentUser(res.locals.store.getState()))) {
        // not logged in, send them back to the homepage for now
        res.redirect('/');
        return;
      }
      next();
    });
    app.get('/export/taxonomy/:taxId', (req, res) => {
      handleExport(
        req.params.taxId,
        database,
        res,
        req.app.locals.logger,
      );
    });
    app.post('/api/action', (req, res) => {
      handleAction(
        req.body,
        getCurrentUser(res.locals.store.getState()),
        database,
        emitAction(req.app.locals.socket),
        cache,
        req.app.locals.logger,
        get(env, 'API_SECRET_KEY', ''),
      )
        .then((result) => {
          res.json(result);
        })
        .catch((error) => {
          req.app.locals.logger.error(error);
          res.status(500).json(error.message);
        });
    });
    app.get('/projects/:slug', (req, res, next) => {
      database.models.project
        .find({ where: { slug: req.params.slug } })
        .then((projectRow: any) => {
          if (!projectRow) {
            database.models.user
              .update({
                currentProjectId: null,
              }, {
                where: { id: req.user.id },
              })
              .then(() => {
                database.models.user
                  .findById(
                    req.user.id,
                    {
                      include: [{
                        model: database.models.project,
                        as: 'currentProject',
                      }],
                    },
                  )
                  .then((userRow: any) => (
                    userRowToModel(userRow, cache)
                  ))
                  .then((user: User) => {
                    res.locals.store.dispatch(setCurrentUser(user));
                    req.session.user = user;
                    req.user = user;
                    res.redirect('/projects');
                  });
              });
            return;
          }
          if (req.user.currentProjectId === projectRow.id) {
            next();
            return;
          }
          Promise
            .all([
              database.models.user
                .update({
                  currentProjectId: projectRow.id,
                }, {
                  where: { id: req.user.id },
                }),
              database.models.userProject
                .update({
                  lastAccessed: Math.round((new Date()).getTime() / 1000),
                }, {
                  where: {
                    userId: req.user.id,
                    projectId: projectRow.id,
                  },
                }),
            ])
            .then(() => {
              database.models.user
                .findById(
                  req.user.id,
                  {
                    include: [{
                      model: database.models.project,
                      as: 'currentProject',
                    }],
                  },
                )
                .then((userRow: any) => (
                  userRowToModel(userRow, cache)
                ))
                .then((user: User) => {
                  res.locals.store.dispatch(setCurrentUser(user));
                  req.session.user = user;
                  req.user = user;
                  next();
                });
            });
        });
    });
    app.get('/projects', (req, res, next) => {
      if (req.user && req.user.currentProject) {
        res.redirect(`/projects/${req.user.currentProject.slug}`);
        return;
      }
      next();
    });
    app.get('*', (req, res) => {
      const { store } = res.locals;
      const stylesheet = new ServerStyleSheet();
      const context = {
        appTitle: '',
        status: 200,
      };
      const appContents = renderToString(stylesheet.collectStyles((
        <ServerApp
          context={context}
          store={store}
          url={req.url}
        />
      )));
      res.status(context.status).render('index', {
        appTitle: context.appTitle,
        appContents,
        storeState: JSON.stringify(store.getState()),
        styles: stylesheet.getStyleTags(),
      });
    });
    resolve({
      ...ctx,
      app,
      env,
    });
  })
);

export default initRoutes;
