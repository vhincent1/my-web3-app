import express from 'express';
import jwt from 'jsonwebtoken';

import { authMiddleware } from '../middleware/auth.middleware.ts';
import { accountRepository } from '../controllers/accounts/index.accounts.ts';
import bcrypt from 'bcryptjs';
import process from "node:process";

const router = express.Router();

// A simple in-memory store for session data
const userSessions: any = {}; //pendingSignatures

router.post('/', async (req, res) => {
  const { username, password } = req.body;
  // ... (verify user credentials)
  // const user = { id: 'someUserId', email: req.body.email }; // Example payload

  const account = accountRepository.findByIdentifier(username);
  if (!account) {
    return res.status(401).render('login', { status: 'Error: account not found' });
  }

  try {
    if (await bcrypt.compare(password, account.password)) {
      //create session
      const user = { userId: account.id, publicKey: account.identifier };
      const token = jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: '1h' });
      req.session.token = token;

      console.log('Success');

      delete req.session?.status;
      res.status(200).redirect('/dashboard');
    } else {
      res.status(401).render('login', { status: 'Error: Invalid password' });
    }
  } catch (err) {
    return res.status(500).send('Error' + err.message);
  }
});

router.get('/', async (req, res) => {
  res.render('login', { status: req.session?.status });
});

router.post('/logout', async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).render('login', { status: 'Could not log out, please try again' });
    }
    res.status(200).render('login', { status: 'Logged out successfully' });
  });
});

router.get('/protected-route', authMiddleware, async (req, res) => {
  res.send(`Hi ${req.account.id}`);
});

export default router;
