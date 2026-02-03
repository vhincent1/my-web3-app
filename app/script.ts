// program test

// import { keypairUtils } from '@my-util-lib/utils';
// import mySolanaProgram from '@my-web3-app/motd';
// import { Connection, PublicKey } from '@solana/web3.js';

// const PROGRAM_ID = new PublicKey('8pRUcpXfWot7uhCyF8pH4ebz48hReW83VXwPzSh14DKy');
// const CONNECTION = new Connection('http://thinkpadx270:8899', 'confirmed');

// const MessageOfTheDayProgram = new mySolanaProgram.MotdProgram(CONNECTION, PROGRAM_ID);
// const payer = keypairUtils.generateKeypair();
// try {
//   console.log('send');
//   const result = await MessageOfTheDayProgram.submitMessage(payer, 1, 'Message~~~');
//   console.log(result);
// } catch (err) {
//   console.log('error');
//   console.log(err);
// }

// send message test

// import { accountRepository, accountService } from './src/controllers/accounts/index.accounts.ts';
// import { Message } from './src/controllers/accounts/Account.ts';
// accountService.register('admin', '');
// for (let i = 0; i < 3; i++) {
//   accountService.register('user' + i, '');
// }

// console.info(`Total accounts: ${accountRepository.getAccounts().length}`);

// console.info(`Send message`);
// const message: Message = {
//   sender: 0,
//   title: 'Title',
//   content: 'Hi',
// };

// try {
//   const result = accountService.sendMessage(0, [1, 2, 3, 4], message, { sendReceipt: true });
//   console.log('result:', result);
// } catch (err) {
//   console.log('send message error:', err);
// }

// console.info('Read sender inbox');
// let account = accountRepository.findById(0);

// const inbox = (index: number = 0) => {
//   // const messages = index ? account?.messages.filter((m) => m.inbox === index) : account?.messages;
//   return account?.messages.filter((m) => m.inbox === index) || [];
// };
// console.info('Inbox (Total):', inbox().length);
// console.info('Inbox (Sent):', inbox(1).length);

// account?.messages.forEach((message) => {
//   console.info(message.inbox, message.title);
// });

// console.info();

// withdraw
import { accountRepository, accountService } from './src/controllers/accounts/index.accounts.ts';
const account = accountRepository.findById(0);

import { solanaUtils } from '@my-util-lib/utils';
import appConfig from './app.config.ts';

const address1 = account?.getKeypair(0).publicKey;
const address2 = account?.getKeypair(1).publicKey;

await Promise.resolve(solanaUtils.requestAirdrop(appConfig.CONNECTION, address1!!, 1));

setTimeout(async () => {
  // console.log(address1, address2);

  const result = await accountService.withdraw(account, address1?.toBase58(), address2?.toBase58(), 0.2);
  console.log('RESULT:', result);
}, 2 * 1000);


// import fs from 'fs';
// import path from 'node:path';

// const __dirname = path.resolve();

// const packagePath = path.join(__dirname, 'package.json');
// const packageString = fs.readFileSync(packagePath, 'utf8');
// const packageData = JSON.parse(packageString);

// Object.keys(packageData.dependencies).forEach((dep) => {
//   console.log('deno add npm:' + dep);
// });

// Object.keys(packageData.devDependencies).forEach((dep) => {
//   console.log('deno add npm:' + dep);
// });
