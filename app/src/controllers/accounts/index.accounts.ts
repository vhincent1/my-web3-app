import AccountRepository from './AccountRepository.ts';
import { AccountService } from './AccountService.ts';

const repo = new AccountRepository();
const service = new AccountService(repo);

const account = service.register('host', 'password');
account.role = 0;

export { repo as accountRepository, service as accountService };
