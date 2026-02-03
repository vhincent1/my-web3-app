import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';

import { accountService, accountRepository } from '../src/controllers/accounts/index.accounts.ts';
import { Message } from '../src/controllers/accounts/Account.ts';
import bcrypt from 'bcryptjs';

describe('Account Services', () => {
  let account;
  const mockAcc = {
    id: 100,
    identifier: 'test',
    password: 'password',
  };

  describe('Registration', () => {
    it('create account', async () => {
      account = accountService.register(mockAcc.identifier, mockAcc.password);
      account.id = mockAcc.id;
      expect(account).toBeTruthy();
      expect(account.id).toBe(mockAcc.id);
      expect(account.identifier).toBe(mockAcc.identifier);
    });
    it('decrypt password', async () => {
      const match = bcrypt.compareSync(mockAcc.password, account.password);
      expect(match).toBe(true);
    });

    it('existing account', async () => {
      const result = accountService.register(mockAcc.identifier, '123456789');
      expect(result).toBeNull();
    });
  });

  describe('Inbox', () => {
    const message: Message = {
      sender: 0,
      title: 'Title',
      content: 'Hi',
    };
    it('Sends a message', async () => {
      const result = accountService.sendMessage(account.id, mockAcc.id, message);
      expect(result.success).toBe(true);
    });
    it('Fails on invalid account', async () => {
      const result = accountService.sendMessage(account.id, 69, message);
      expect(result.success).toBe(false);
    });
    it('Reads the message', async () => {
      const account = accountRepository.findById(mockAcc.id);
      const inbox = account?.messages.filter((m) => m.inbox === 0);
      expect(inbox.length).toBe(1);

      const inboxMessage = inbox[0];
      expect(inboxMessage.sender).toBe(message.sender);
      expect(inboxMessage.title).toBe(message.title);
      expect(inboxMessage.content).toBe(message.content);
    });
  });
});
