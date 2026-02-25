import AccountRepository from './AccountRepository.ts';
import { AccountService } from './AccountService.ts';

const repo = new AccountRepository();
const service = new AccountService(repo);

export { repo as accountRepository, service as accountService };

// init stuff

const account = service.register('host', 'password');
account.role = 1;

for (let i = 0; i < 5; i++) {
  service.register('user' + i, 'password');
}

import type { Message } from './Account.ts';

function testInbox() {
  const message: Message = {
    sender: 0,
    title: 'Title',
    content: 'Hi',
  };

  service.sendMessage(0, [], message, { sendReceipt: false });

  message.inbox = 0;
  account.messages.push(message);
}

testInbox();
