import express from 'express';

import type { Connection, PublicKey } from '@solana/web3.js';
import type mySolanaProgram from '@my-web3-app/motd';

import { programsController } from '../controllers/programs/index.controller.ts';
import type { accountRepository } from '../controllers/accounts/index.accounts.ts';
import AccountController from '../controllers/accounts/AccountController.ts';
import type { addApiRoute } from './api.routes.ts';
import type { authMiddleware } from '../middleware/auth.middleware.ts';

const app = express.Router();

//load account stuff
AccountController.init('/dashboard');

app.get('/', async (req, res) => {
  // req.session.user = { publicKey: 'Debug', userId: 0 };
  // const session = req.session;
  // const { cookie, ...newObject } = session;
  // console.log('req.session:', newObject);
  // console.log('current tab:', req.session.tab);

  const account = req.account;
  // await account.getBalances().update(); //TODO: try catch error

  // const redirectTo = req.session.returnTo || '/';
  // delete req.session.returnTo; // Clean up the session variable

  const status = req.session.status;
  delete req.session.status;

  // 1. Grab the tab from the session (default to 'home' if not found)
  // const activeTab = req.session.tab || 0;
  // 2. Clear it from the session so it doesn't "stick" forever
  // (Optional: only if you want it to reset on refresh)
  // delete req.session.tab;

  const tab = req.query.tab;

  return res.render('dashboard', {
    title: 'Dashboard',
    status: status, // status div
    tab: tab,
    account: account, // account.ejs
    programs: programsController.programs, // programs.ejs
  });
});

app.post('/tab', async (req, res) => {
  const { tabInput } = req.body;
  console.log('tab input:', tabInput);

  //  const user = res.locals.user;
  req.session.tab = tabInput;

  res.redirect('/dashboard?tab=' + tabInput);
});

export default app;
