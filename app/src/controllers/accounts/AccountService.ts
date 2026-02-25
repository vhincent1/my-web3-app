import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import appConfig from '../../../app.config.ts';
import type AccountRepository from './AccountRepository.ts';
import Account, { type Message } from './Account.ts';
import bcrypt from 'bcryptjs';
import { checkField, solanaUtils } from '@my-util-lib/utils';

interface MessageOptions {
  roles?: number[]; // Filter by roles
  includeSender?: boolean; // Save to "Sent" folder
  sendReceipt?: boolean; // Send a summary back to sender
}

export class AccountService {
  constructor(private repo: AccountRepository) {}

  register(username: string, password: string) {
    const exists = this.repo.findByIdentifier(username);
    if (exists) return null; //throw Error('Exisiting identifier');

    const hash = bcrypt.hashSync(password, 10);
    const account = new Account(this.repo.getFreeId(), username, hash);

    const { id, identifier } = account;
    console.log(`[AccountRepository]: register account[id=${id}, identifier=${identifier}]`);

    // update account list
    // this.#accounts = this.#accounts.concat(account);
    this.repo.save(account);
    return account;
  }

  /**
   * To send to one person: broadcast(1, msg, 2)
   * To send to a role: broadcast(1, msg, [], { roles: [2], sendReceipt: true })
   * To send to multiple specific people: broadcast(1, msg, [2, 3, 4])
   */
  sendMessage(from: number, recipient: number | number[] = [], message: Message, options: MessageOptions = {}) {
    const { roles = [], includeSender = true, sendReceipt = false } = options;
    const now = new Date();

    let deliveredCount = 0;

    // 1. Collect all unique recipients
    const targets = new Set<number>();
    const notFound = new Set<number>();
    // Add direct IDs (single or array)
    const idArray = Array.isArray(recipient) ? recipient : [recipient];
    idArray.forEach((id) => id !== 0 && targets.add(id));

    // Add IDs from roles
    if (roles.length > 0)
      this.repo
        .getAccounts()
        .filter((acc) => roles.includes(acc.role))
        .forEach((acc) => targets.add(acc.id));

    // 2. Deliver to Recipients (Clone object to avoid reference bugs)
    targets.forEach((targetId) => {
      const recipient = this.repo.findById(targetId);
      if (recipient) {
        recipient.messages.push({ ...message, timestamp: now, read: false, inbox: 0 });
        deliveredCount++;
      } else {
        notFound.add(targetId);
      }
    });

    // 3. Save to Sender's "Sent" Folder
    if (includeSender) {
      const sender = this.repo.findById(from);
      if (sender) sender.messages.push({ ...message, timestamp: now, read: true, inbox: 1 });
    }

    // 4. If roles/group were involved, send a receipt (Recursive call)
    if (sendReceipt && targets.size > 0) {
      const receipt: Message = {
        sender: from,
        title: 'Group Message Summary',
        content: //prettier-ignore
        `Sent to ${targets.size} accounts. Roles: [${roles}].\n`
        + `******************************\n`
        + `Title: ${message.title}\n`
        + `Message: ${message.content}\n`
        + `******************************\n`,
        inbox: 0,
      };
      // Recursive call with includeSender: false to avoid infinite loops
      //   this.sendMessage(from, from, receipt, { includeSender: true });
      const sender = this.repo.findById(from);
      sender.messages.push(receipt);
    }

    // 4. Return the summary
    return {
      // Success if at least one person received it OR if the intention was only to save to sender
      success: deliveredCount > 0 || (targets.size === 0 && includeSender),
      deliveredCount,
      totalAttempted: targets.size,
      //   errors,
    };
  }

  importSeed(userId: number, mnemonic: string) {
    const account = this.repo.findById(userId);

    // 1. Normalize the input (remove accidental spaces)
    const normalizedMnemonic = mnemonic.trim();
    // 2. Efficiently check for duplicates
    // .some() stops the moment a match is found
    // const isDuplicate = this.repo.getAccounts().some((acc) => acc.getWallet().mnemonic === normalizedMnemonic);
    const isDuplicate = this.repo.getAccounts().find((acc) => acc.getWallet().mnemonic === normalizedMnemonic);

    if (isDuplicate) {
      const message: Message = {
        sender: 0,
        title: '[!]: Duplicate import seed',
        content: //prettier-ignore
        `Account[id=${account.id}, identifier=${account.identifier}] has imported a seed from another:` 
        + `Account[id=${account.id}, identifier=${account.identifier}]`,
      };
      this.sendMessage(0, 0, message); // notify admins
      throw new Error('This mnemonic has already been imported.');
    }

    // 3. Find the account to associate the seed with
    // const account = this.repo.findByIdentifier(username);

    // if (!account) {
    //   throw new Error(`Account with username "${account.identifier}" not found.`);
    // }

    // 4. Continue with logic (e.g., account.setMnemonic(normalizedMnemonic))
    return account;
  }

  getAccountWithABalance(identifier) {
    const account = this.repo.findByIdentifier(identifier);

    const addresses = account.getWallet().addresses;
    if (addresses.length === 0) return null; // Handle empty array
    const address = addresses.reduce((prev, current) => (prev.balance > current.balance ? prev : current));
    return { keypair: address.keypair, balance: address.balance };
  }

  generateKeypair = (identifier) => {
    const account = this.repo.findById(identifier);
    console.log('generating keypair for account id=', account.id);
    account.getWallet().generated += 1;
  };

  async updateBalance(userId: number) {
    const account = this.repo.findById(userId);
    // console.log('update accounts');
    // 1. Extract all Public Keys
    const pubKeys = account.getKeypairs().map((keypair) => keypair.publicKey);
    let accounts = [];
    try {
      // 2. Fetch all data in ONE request
      const infos = await appConfig.CONNECTION.getMultipleAccountsInfo(pubKeys);
      // 3. Map to your desired format
      accounts = infos
        .map((info, index) => ({
          keypair: account.getKeypairs()[index],
          balance: info ? info.lamports / LAMPORTS_PER_SOL : 0,
        })) // highest to lowest
        .sort((a, b) => b.balance - a.balance);
    } catch (error) {
      accounts = account
        .getKeypairs()
        .slice(0, account.getWallet().generated)
        .map((keypair, index) => ({ keypair, balance: 0 }));
    }

    account.getWallet().addresses = accounts;
  }

  async withdraw(account, address, recipient, amount) {
    try {
      checkField(address, 'address');
      checkField(recipient, 'recipient');
      checkField(amount, 'amount');

      const wallet = account.findKeypair(address);
      if (!wallet) throw Error('address not found in wallet');

      //   checkField(wallet.balance, 'invalid balance', wallet.balance < amount);

      console.log('send');
      const result = await solanaUtils.withdraw(appConfig.CONNECTION, wallet.keypair, recipient, amount);
      return result;
    } catch (err: any) {
      // console.log(err)
      return `Error: ${err.message}`;
    }
  }
}
