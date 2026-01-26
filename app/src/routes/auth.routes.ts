import express from 'express';
import jwt from 'jsonwebtoken';

import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = express.Router();

process.env.TOKEN_SECRET = 'token-secret';

// A simple in-memory store for session data
const userSessions: any = {}; //pendingSignatures

router.post('/', async (req, res) => {
  const { username, password } = req.body;
  // ... (verify user credentials)
  const user = { id: 'someUserId', email: req.body.email }; // Example payload
  const token = jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: '1h' });

  req.session.token = token;
  //   res.cookie('token', token, { httpOnly: true, maxAge: 3600000 }); // Store as httpOnly cookie

  console.log(token);
  //   res.redirect('/dashboard');
});

router.get('/', async (req, res) => {
  res.render('login');
});

router.get('/protected-route', authMiddleware, async (req, res) => {
  res.send(`Hi ${req.account.id}`);
});

export default router;
