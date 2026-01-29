import path from 'path';
import express from 'express';
import appConfig from '../app.config.ts';
import app from './index.ts';
import { programsController } from './controllers/programs/index.controller.ts';
import { MotdProgram } from '@my-web3-app/motd/lib/instructions.ts';

//initialize programs
programsController.programs.forEach((entry) => {
  if (entry.program instanceof MotdProgram) {
    entry.program.initialize();
  }
});

import { solanaUtils } from '@my-util-lib/utils';
import Account from './controllers/accounts/Account.ts';
import { accountRepository } from './controllers/accounts/index.accounts.ts';
import bcrypt from 'bcryptjs';

if (appConfig.ENVIRONMENT.developement) {
  // const debugAccount = new Account(0, 'debug');
  // debugAccount.password = await bcrypt.hash('password', 10);

  const debugAccount = await accountRepository.register('debug', 'password');

  await debugAccount.getBalances().update();
  const address = debugAccount.getWallet().addresses[0];
  // console.log('address:',address)
  // await Promise.resolve(await solanaUtils.requestAirdrop(appConfig.CONNECTION, address.keypair.publicKey, 1));
}

// express app

const port = 3000;
const __dirname = path.resolve();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Serve static files (like your frontend script)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
