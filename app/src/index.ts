// index.js
import express from 'express';
import session from 'express-session';
import jwt from 'jsonwebtoken';

import appConfig from '../app.config.ts';
import { authMiddleware } from './middleware/auth.middleware.ts';

import apiRoutes from './routes/api.routes.ts';
import authRoute from './routes/auth.routes.ts';
import registerRoute from './routes/register.routes.ts';
import dashboardRoute from './routes/dashboard.routes.ts';
import { accountRepository, type accountService } from './controllers/accounts/index.accounts.ts';
import process from "node:process";

const app = express();

// allows for rich objects and arrays to be encoded into the URL-encoded format
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Configure and use session middleware
app.use(
  session({
    secret: 'your-strong-secret-key', // Required: Replace with a secure key
    resave: false, // Recommended: saves the session back to the store, even if not modified
    saveUninitialized: true, // Recommended: forces a session that is "uninitialized" to be saved to the store
    //  store: new SQLiteStore({ db: 'sessions.db', dir: './var/db' })
  }),
);

// Middleware to make session data available to all EJS templates
app.use((req, res, next) => {
  res.locals.session = req.session;
  // You can also add specific user data
  // Check if the user is in the session and make it available in res.locals
  // res.locals.user = req.session.user || null;

  // If a user is logged in (e.g., stored in req.session.user),
  // make it available in all templates as 'user' and the entire session as 'session'.
  // res.locals.user = req.session.user || null;
  // res.locals.session = req.session;
  next();
});

if (appConfig.ENVIRONMENT.developement || appConfig.ENVIRONMENT.test) {
  const debugAccount = accountRepository.findById(0);

  // await debugAccount.getBalances().update();
  // const address = debugAccount.getWallet().addresses[0];
  // console.log('address:',address)
  // await Promise.resolve(await solanaUtils.requestAirdrop(appConfig.CONNECTION, address.keypair.publicKey, 1));

  app.use((req, res, next) => {
    //debug temporary session
    const user = { userId: debugAccount.id, publicKey: debugAccount.identifier };
    req.session.token = jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: '1h' });
    next();
  });
}

app.use('/api', authMiddleware, apiRoutes);
app.use('/dashboard', authMiddleware, dashboardRoute);
app.use('/register', registerRoute);
app.use('/login', authRoute);

app.get('/', (req, res) => res.status(200).send(`<span style='font-family: monospace;'>@my-web3-app</span>`));

// app.listen(port, () => {
//   console.log(`Server listening at http://localhost:${port}`);
// });

export default app;
