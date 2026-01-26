import { Request } from 'express'; // This import is optional if you use the 'express-serve-static-core' module augmentation
declare module 'express-serve-static-core' {
  interface Request {
    /**
     * The custom user property added by authentication middleware.
     */
    // user?: any; // Replace 'any' with the actual type of your property
    // userId?: string; // Example for another property
    account?: any
  }
}