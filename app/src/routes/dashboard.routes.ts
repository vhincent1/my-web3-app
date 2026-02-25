import express from 'express';

import type { Connection, PublicKey } from '@solana/web3.js';
import type mySolanaProgram from '@my-web3-app/motd';

import { programsController } from '../controllers/programs/index.controller.ts';
import { accountRepository } from '../controllers/accounts/index.accounts.ts';
import AccountController from '../controllers/accounts/AccountController.ts';
import type { addApiRoute } from './api.routes.ts';
import type { authMiddleware } from '../middleware/auth.middleware.ts';

const app = express.Router();

//load dashboard stuff
AccountController.initialize('/dashboard');

app.get('/', async (req, res) => {
  // req.session.user = { publicKey: 'Debug', userId: 0 };
  // const session = req.session;
  // const { cookie, ...newObject } = session;
  // console.log('req.session:', newObject);
  // console.log('current tab:', req.session.tab);

  let account = req.account;
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

  const { inbox, tab, viewId }: any = req.query;

  return res.render('dashboard', {
    title: 'Dashboard',
    status: status, // status div
    query: req.query,

    account: account, // account.ejs

    programs: programsController.programs, // programs.ejs
    tab: tab,
  });
});

app.get('/view/:id', (req, res) => {
  const id = req.params.id;

  let account = req.account;
  if (account.role < 1) {
    return res.status(401).send('Unauthorized access');
  }
  const find = accountRepository.findById(parseInt(id));
  if (!find) return res.status(404).send(`account id=${id} not found`);

  console.log('Viewing account', id);
  account = find;

  const status = req.session.status;
  delete req.session.status;

  req.session.status = {
    program: 'Test'
  }

  return res.render('dashboard', {
    title: 'Dashboard',
    status: status, // status message divs
    query: req.query,

    account: account, // account.ejs

    programs: programsController.programs, // programs.ejs
    tab: undefined
  });
});

app.get('/inbox', (req, res) => {
  const account = req.account;

  const inbox = req.query.inbox;

  const query = { inbox };
  console.log('q:', query);
  res.render('account/inbox', { query, account });
});

// program tabs
app.post('/tab', (req, res) => {
  const { tabInput } = req.body;
  console.log('tab input:', tabInput);

  //  const user = res.locals.user;
  req.session.tab = tabInput;

  res.redirect('/dashboard?tab=' + tabInput);
});

export default app;
