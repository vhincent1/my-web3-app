import { Connection, PublicKey } from '@solana/web3.js';

export const listenForEvents = (connection: Connection, programId: PublicKey) => {
  const listenerId = connection.onLogs(
    programId,
    (logInfo, context) => {
      console.log('Received logs:', logInfo.logs);
      // Process and parse the logs here to identify specific events
      logInfo.logs.forEach((log) => {
        if (log.includes('Event: User registered')) {
          // Handle the specific event
        }
      });
    },
    'confirmed'
  );

  console.log('Listener ID:', listenerId);
  console.log(`Listening for events from program: ${programId.toString()}`);
};
