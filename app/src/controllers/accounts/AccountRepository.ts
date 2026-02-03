import type bcrypt from 'bcryptjs';
import type Account from './Account.ts';

export default class AccountRepository {
  #accounts: Account[];

  // accounts is an internal array of account objects
  constructor(initialAccounts = []) {
    this.#accounts = initialAccounts;
  }

  getAccounts = () => this.#accounts;

  findById = (id: number | string) => this.#accounts.find((acc) => acc.id === id);
  findByIdentifier = (id: string) => this.#accounts.find((acc) => acc.identifier === id);

  getFreeId = () => {
    const taken = new Set(this.#accounts.map((acc) => acc.id));
    let id = 0;
    while (taken.has(id)) id++;
    return id;
  };

  save(account: Account) {
    this.#accounts = this.#accounts.concat(account);
  }

  update(update: Account, updates: any) {
    const updatedAccounts = this.#accounts.map((account) => {
      if (account.id === update.id) return { ...account, ...updates };
      return account;
    });
    // Only return a new repository if the data actually changed (optional optimization)
    if (updatedAccounts !== this.#accounts) {
      // return new AccountRepository(updatedAccounts);
      this.#accounts = updatedAccounts;
    }
    return this;
  }
}
