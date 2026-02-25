import express from 'express';

import { checkField, type keypairUtils } from '@my-util-lib/utils';

import { authMiddleware } from '../../middleware/auth.middleware.ts';
import { addApiRoute } from '../../routes/api.routes.ts';
import { type accountRepository, accountService } from './index.accounts.ts';
import type { solanaUtils } from '@my-util-lib/utils';
import type appConfig from '../../../app.config.ts';

const router = express.Router();

// router.get('/', async (req, res) => {
//   const user = res.locals.user;
//   if (!user) return res.status(401).send('session not found');
//   req.session.returnTo = '/account'
//   await user.account.getBalances().update();
//   res.status(200).render('dashboard/account', { user });
// });

// app.get('/', (req, res) => {
//   res.format({
//     'text/plain': function () {
//       res.send('Greetings from Express in plain text!');
//     },

//     'text/html': function () {
//       res.send('<h1>Greetings from Express in HTML!</h1>');
//     },

//     'application/json': function () {
//       res.send({ message: 'Greetings from Express in JSON!' });
//     },

//     'application/xml': function () {
//       res.send('<message>Greetings from Express in XML!</message>');
//     },

//     // Optional: a default callback if no format matches
//     default: function () {
//       // log the requests's top accepted types
//       console.log('Client accepts:', req.accepts());
//       res.status(406).send('Not Acceptable');
//     }
//   });
// });

function initialize(redirectTo: string) {
  /** withdraw form */
  addApiRoute('/account/withdraw', 'GET', authMiddleware, async (req, res) => {
    const { address, recipient, amount } = req.query;
    const account = req.account;

    const status = req.session.status;
    delete req.session.status;

    // const a = await account.getAccountWithABalance();

    // console.log('account with balance:', a);

    res.render('account/withdraw', {
      title: 'Withdraw form',
      status,
      // form
      address: address,
      recipient: recipient,
      amount: amount,
    });
  });

  addApiRoute('/account/withdraw', 'POST', authMiddleware, async (req, res) => {
    const { address, recipient, amount } = req.body;
    const account = req.account;

    console.log('req:', req.body);

    let statusCode = 200;
    const response = (code, message) => {
      statusCode = code;
      req.session.status = message;
    };

    // let statusCode = 200;
    try {
      const result = await accountService.withdraw(account, address, recipient, amount);
      req.session.status = result;
      response(200, result);
    } catch (err) {
      // console.log(err);
      // statusCode = 400;
      // req.session.status = 'Error: ' + err.message;
      response(400, (err as Error).message);
    }

    // return res.render('account/withdraw', {
    //   title: 'Withdraw form',
    //   status: 'Error: empty address',
    //   recipient,
    //   amount,
    // });
    const addressQuery = `${address !== 'undefined' ? `?address=${address}` : ''}`;
    const recipientQuery = `${recipient !== 'undefined' ? `&recipient=${recipient}` : ''}`;
    const amountQuery = `${amount !== 'undefined' ? `&amount=${amount}` : ''}`;

    res.status(statusCode).redirect(`withdraw${addressQuery}${recipientQuery}&${amountQuery}`);
  });

  /* Generate Address */
  addApiRoute('/account/generate-address', 'POST', authMiddleware, (req, res) => {
    const account = req.account;
    // const userId = req.session.user.userId; //req.body.userId; // Access the data from the form

    console.log(`Server action performed for User ID: ${account.id}`);

    if (account) {
      // account.getWallet().generateKeypair();
      accountService.generateKeypair(account.id);
    }
    // Perform your server-side logic here (e.g., database update)

    //   const redirectTo = req.session.returnTo || '/dashboard';
    //   delete req.session.returnTo; // Clean up the session variable

    //   console.log('post redir: ', redirectTo);
    res.redirect(redirectTo);
  });
}

const accountController = {
  initialize,
};

export default accountController;
