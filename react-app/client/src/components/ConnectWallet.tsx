import { useMemo, useState, useEffect } from 'react';

import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

import Balance from './Balance.tsx';
import {TokenList} from './CloseAccounts.tsx';

function Content() {
  const { publicKey, connected } = useWallet();
  const [backendStatus, setStatus] = useState('');

  const pingBackend = async () => {
    if (!publicKey) return;
    try {
      const response = await fetch(`http://localhost:8000/api/validate/${publicKey.toBase58()}`);
      const data = await response.json();
      setStatus(data.valid ? 'Wallet Verified by Deno!' : 'Verification Failed');
    } catch (err) {
      alert(err);
    }
  };

  useEffect(() => {
    console.log('useEffect');
    if (connected && publicKey) {
      // Store the address in your application's state, a context, or localStorage
      const userAddress = publicKey.toString();
      console.log('Connected wallet address:', userAddress);
      // Example: setAddress(userAddress);
    }
  }, [connected, publicKey]);

  return (
    <div style={{ padding: 20 }}>
      <WalletMultiButton />
      {publicKey && (
        <div>
          <p>Connected: {publicKey.toBase58()}</p>
          <button onClick={pingBackend}>Verify with Deno Server</button>
          <p>{backendStatus}</p>
        </div>
      )}
      <Balance />
      <TokenList />
    </div>
  );
}

export default function App() {
  // const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const endpoint = useMemo(() => "https://api.devnet.solana.com", []);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Content />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
