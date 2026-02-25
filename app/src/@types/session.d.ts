import 'express-session';

declare module 'express-session' {
  interface SessionData {
    // Add the properties you are trying to access here
    // userId: string;
    // isAuthenticated: boolean;
    // status: string;
    //----
    token: string;
    user: { userId: number; publicKey: string };
    //----

    status?: {
      login?: string;
      program?: string;
      register?: string;
      withdraw?: string;
    };
    
    tab?: any;
    // ... other custom properties
  }
}
