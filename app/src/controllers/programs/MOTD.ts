import { Connection, PublicKey } from '@solana/web3.js';
import mySolanaProgram from '@my-web3-app/motd';

// import { accountRepository } from '../accounts.ts';
import { addApiRoute } from '../../routes/api.routes.ts';
import { ProgramEntry, programs } from './index.controller.ts';
import { loadKeypair, OWNER_KEYPAIR_PATH } from '../../../scripts/keypair.ts';
import { authMiddleware } from '../../middleware/auth.middleware.ts';

const PROGRAM_ID = new PublicKey('8pRUcpXfWot7uhCyF8pH4ebz48hReW83VXwPzSh14DKy');
const CONNECTION = new Connection('http://thinkpadx270:8899', 'confirmed');

const MessageOfTheDayProgram = new mySolanaProgram.MotdProgram(CONNECTION, PROGRAM_ID);
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
    read: { path: '/program/motd/read' },
    update: { path: '/program/motd/update' },
  },
};

addApiRoute(PROGRAM_ENTRY.apiRoutes.read.path, 'GET', null, async (req, res) => {
  const state = await MessageOfTheDayProgram.update();
  // update ejs
  // const program = programs.find((entry) => entry.alias == PROGRAM_ENTRY.alias).program;
  // program.state = state;
  res.status(200).send(state);
});

addApiRoute(PROGRAM_ENTRY.apiRoutes.update.path, 'POST', authMiddleware, async (req, res) => {
  const { variant, userInput } = req.body;
  console.log('Received data:', variant, userInput, userInput.length);

  const account = req.account;
  console.log(`Server action performed for Account ID: ${account.id}`);
  
  const program = programs.find((entry) => entry.alias == PROGRAM_ENTRY.alias).program;

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

  const tab = programs.findIndex((entry) => entry.alias === PROGRAM_ENTRY.alias);
  res.redirect(`/dashboard?tab=${tab}`);
});

export default PROGRAM_ENTRY;
