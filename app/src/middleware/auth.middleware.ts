import jwt from 'jsonwebtoken';

import { accountRepository, accountService } from '../controllers/accounts/index.accounts.ts';

const createSession = async (req, res, next) => {
  const { userId, publicKey } = req.session.user;

  console.log('createSession:', userId, publicKey);

  try {
    // User is authenticated, proceed to the next middleware or route handler
    const account = accountRepository.findByIdentifier(userId);
    if (!account) {
      return res.status(401).send(`Account id=${userId} not found`);
    }

    await accountService.updateBalance(userId)
    // await account.getBalances().update();
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
    res.status(401).send('Unauthorized Access');
  }
};

// Protected route middleware
export const authMiddleware = (req, res, next) => {
  const token = req.session.token;

  if (!token) {
    req.session.status = 'Error: Unauthorized Access';
    return res.redirect('/login'); // Redirect to login if no token
  }

  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // If verification fails (e.g., token expired, invalid signature)
      req.session.status = 'Error: Invalid or expired token: ' + err.message;
      return res.redirect('/login'); // Invalid token
    }
    req.session.user = decoded; // Add decoded user payload to request object
    // console.log('authToken:', user.userId);
    // next(); // Proceed to the protected route
    createSession(req, res, next);
    // next();
  });
};
