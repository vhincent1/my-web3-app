import { Request } from 'express'; // Import Request from express if needed for context
import type Account from '../controllers/accounts/Account.ts';

declare global {
  namespace Express {
    interface Request {
      // Add your custom properties here
      //   user?: any; // Example: adds an optional 'user' property of type 'any'
      account?: Account; // Example: adds an optional 'userId' property of type 'string'
      // Add any other properties like 'session', 'token', etc.
    }
  }
}

// Export an empty object to make the file a module and ensure declaration merging works correctly
export {};
