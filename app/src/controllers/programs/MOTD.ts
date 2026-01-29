import appConfig from '../../../app.config.ts';
import { Connection, PublicKey } from '@solana/web3.js';
import mySolanaProgram from '@my-web3-app/motd';

import { ProgramEntry, programsController } from './index.controller.ts';
import { authMiddleware } from '../../middleware/auth.middleware.ts';
import { addApiRoute } from '../../routes/api.routes.ts';

const PROGRAM_ID = new PublicKey('8pRUcpXfWot7uhCyF8pH4ebz48hReW83VXwPzSh14DKy');

const MessageOfTheDayProgram = new mySolanaProgram.MotdProgram(appConfig.CONNECTION, PROGRAM_ID);
// await MessageOfTheDayProgram.initialize();
// console.log('current program:', MessageOfTheDayProgram.state);

const PROGRAM_ENTRY: ProgramEntry = {
  name: 'Message Of The Day',
  alias: 'motd',
  program: MessageOfTheDayProgram,
  ejs: {
    fileName: 'motd.ejs',
    // variables: { program }
  },
  apiRoutes: {
    read: { path: '/program/motd/read', type: 'GET' },
    update: { path: '/program/motd/update', type: 'POST' },
  },
};

addApiRoute(PROGRAM_ENTRY.apiRoutes.read.path, PROGRAM_ENTRY.apiRoutes.read.type, null, async (req, res) => {
  const state = await MessageOfTheDayProgram.update();
  // update ejs
  // const program = programs.find((entry) => entry.alias == PROGRAM_ENTRY.alias).program;
  // program.state = state;
  res.status(200).send(state);
});

addApiRoute(PROGRAM_ENTRY.apiRoutes.update.path, PROGRAM_ENTRY.apiRoutes.read.type, authMiddleware, async (req, res) => {
  const { variant, userInput } = req.body;
  console.log('Received data:', variant, userInput, userInput.length);

  const account = req.account;
  console.log(`Server action performed for Account ID: ${account.id}`);

  const program = programsController.findByAlias(PROGRAM_ENTRY.alias).program;

  try {
    const payer = await account.getAccountWithABalance();
    if (!payer || payer.balance === 0) {
      console.log('Invalid payer');
      throw Error(!payer ? 'no addresses found' : 'empty balance');
    }

    MessageOfTheDayProgram.validateMessage(variant, userInput, true); // This throws if invalid
    const { status } = await MessageOfTheDayProgram.submitMessage(payer.keypair, variant, userInput);
    console.log('status:', status);

    // update ejs
    program.state = await program.update();

    req.session.status = status;
  } catch (error: any) {
    // console.log(error)
    req.session.status = 'Error: ' + error.message; //.startsWith('Error') ? error.message : `Error: ${error.message}`;
  }

  const tab = programsController.findByAlias(PROGRAM_ENTRY.alias).program;
  res.redirect(`/dashboard?tab=${tab}`);
});

export default PROGRAM_ENTRY;
