import express from 'express';
import { accountService, accountRepository } from '../controllers/accounts/index.accounts.ts';

const router = express.Router();

router.post('/', async (req, res) => {
  const { username, password } = req.body;

  try {
    const account = accountService.register(username, password);

    return res.status(200).render('login', { status: 'Account created' });
  } catch (err) {
    return res.status(401).render('register', { status: 'Error: ' + err.message });
  }
});

router.get('/', async (req, res) => {
  res.status(200).render('register', { status: req.session?.status });
});

export default router;
