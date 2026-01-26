import jwt from 'jsonwebtoken';

import { accountRepository } from '../controllers/accounts/index.accounts.ts';

const createSession = async (req, res, next) => {
  const { userId, publicKey } = req.session.user;

  console.log('createSession:', userId);

  try {
    // User is authenticated, proceed to the next middleware or route handler
    const account = accountRepository.findById(userId);
    if (!account) {
      return res.status(401).send(`Account id=${userId} not found`);
    }

    await account.getBalances().update();
    // 3. Attach to req: This makes it available in your routes as req.account
    req.account = account;
    next();
  } catch (err) {
    console.log('err:', err);
    req.session.status = 'Error: ' + err.message;
    // If account fetching fails, clear session and redirect
    req.session.destroy();
    // res.redirect('/login');
    // User is not authenticated, redirect to login page or send an error
    res.status(401).send('Unauthorized access');
  }
};

export const authMiddleware2 = async (req, res, next) => {
  const { userId, publicKey, token } = req.session;

  if (typeof userId === 'undefined') {
    return res.status(401).send('Unauthorized access /login');
  }

  try {
    // User is authenticated, proceed to the next middleware or route handler
    const account = accountRepository.findById(userId);
    if (!account) {
      return res.status(401).send(`Account id=${userId} not found`);
    }

    await account.getBalances().update();
    // 3. Attach to req: This makes it available in your routes as req.account
    req.account = account;
    // 4. Attach to res.locals: This makes it available in all EJS files as 'account'
    // res.locals.account = {...user, ...account};
    next();
  } catch (err) {
    // If account fetching fails, clear session and redirect
    req.session.destroy();
    // res.redirect('/login');
    // User is not authenticated, redirect to login page or send an error
    res.status(401).send('Unauthorized access');
  }
};

export const authMiddleware = (req, res, next) => {
  const token = req.session.token;

  if (!token) {
    req.session.status = 'Error: token not found';
    return res.redirect('/login'); // Redirect to login if no token
  }

  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    if (err) {
      req.session.status = 'Error: Invalid Token: ' + err.message;
      return res.redirect('/login'); // Invalid token
    }
    req.session.user = user; // Add decoded user payload to request object
    // console.log('authToken:', user.userId);
    // next(); // Proceed to the protected route
    createSession(req, res, next);
  });
};
