import Account from './Account.ts';

export default class AccountRepository {
  #accounts: Account[];

  // accounts is an internal array of account objects
  constructor(initialAccounts = []) {
    this.#accounts = initialAccounts;
  }

  findById = (id: number) => this.#accounts.find((acc) => acc.id == id) ?? null;
  getAccounts = () => Object.freeze(this.#accounts.slice());

  getFreeId = () => {
    const taken = new Set(this.#accounts.map((acc) => acc.id));
    let id = 0;
    while (taken.has(id)) id++;
    return id;
  };

  register(account: Account) {
    const exists = this.#accounts.find((acc) => acc.identifier == account.identifier);
    if (exists === null) throw Error('Account already exists');
    const updatedAccounts = this.#accounts.concat(account);

    console.log('Registered:', account);

    // this.#accounts.push(account);
    this.#accounts = updatedAccounts;
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
