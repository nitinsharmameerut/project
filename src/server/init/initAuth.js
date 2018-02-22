import session from 'express-session';
import passport from 'passport';
import Auth0Strategy from 'passport-auth0';
import { get } from 'lodash';
import redisSession from 'connect-redis';

import { type Context } from 'types/initContext';
import { type User } from 'types/user';
import { populateUser } from '../models/user';

const initAuth = (ctx: Context): Promise<Context> => (
  new Promise((resolve, reject) => {
    const {
      app,
      cache,
      database,
      env,
      logger,
    } = ctx;
    if (!(app && cache && database && env)) {
      reject(new Error('Initialization failure.'));
      return;
    }
    // init the authentication strategy
    const strategy = new Auth0Strategy(
      {
        domain: env.AUTH0_DOMAIN,
        clientID: env.AUTH0_CLIENT_ID,
        clientSecret: env.AUTH0_CLIENT_SECRET,
        callbackURL: env.AUTH0_CALLBACK_URL,
      },
      (accessToken, refreshToken, extraParams, profile, done) => (
        done(null, profile)
      ),
    );
    passport.use(strategy);
    passport.serializeUser((user, done) => {
      done(null, user);
    });
    passport.deserializeUser((rawUser, done) => {
      populateUser(database, rawUser, cache, logger)
        .then((user: User) => {
          done(null, user);
        });
    });
    const RedisStore = redisSession(session);
    const sessionSettings = {
      store: new RedisStore({
        client: cache,
      }),
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
    };
    if (get(env, 'NODE_ENV', 'DEV') === 'PROD') {
      app.use(session({
        ...sessionSettings,
        cookie: {
          secure: true,
        },
      }));
    } else {
      app.use(session(sessionSettings));
    }
    app.use(passport.initialize());
    app.use(passport.session());
    resolve({
      ...ctx,
      app,
    });
  })
);

export default initAuth;
