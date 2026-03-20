import { useEffect, useState, useCallback } from 'react';
import { createCloseAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';

interface TokenAccount {
  accountAddress: string;
  mint: string;
  amount: string;
  decimals: number;
}

export const TokenList = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const [tokens, setTokens] = useState<TokenAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Toggle selection
  const toggleSelect = (address: string) => {
    setSelectedAccounts((prev) => (prev.includes(address) ? prev.filter((a) => a !== address) : [...prev, address]));
  };

  const handleSignAndServerSend = async () => {
    if (!publicKey || !signTransaction || selectedAccounts.length === 0) {
      return alert('Wallet not connected or no accounts selected');
    }

    console.log('handleSign');
    try {
      // 1. Create the Transaction
      const transaction = new Transaction();

      selectedAccounts.forEach((accountAddr) => {
        const ix = createCloseAccountInstruction(new PublicKey(accountAddr), publicKey, publicKey);
        transaction.add(ix);
      });

      // 2. Prepare the transaction
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // 3. Request Signature from the Wallet
      // This opens the Phantom/Solflare popup
      const signedTx = await signTransaction(transaction);

      // 4. Serialize the SIGNED transaction to Base64
      // We must include the signatures now
      const serializedTx = signedTx.serialize().toString('base64');

      // 5. Send the signed transaction to your Backend
      const response = await fetch('http://localhost:8000/api/relay-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedTx: serializedTx,
          owner: publicKey.toBase58(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSelectedAccounts([]);
        alert(`Transaction sent by server! Signature: ${result.signature}`);
      } else {
        alert(`Server failed to send: ${result.error}`);
      }
    } catch (error) {
      console.error('Signing failed:', error);
    }
  };

  const fetchTokens = useCallback(async () => {
    if (!publicKey) return;
    setSelectedAccounts([]);
    setLoading(true);
    try {
      const response = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID });

      const parsedTokens: TokenAccount[] = response.value.map((item) => ({
        accountAddress: item.pubkey.toBase58(), // This is the address you close
        mint: item.account.data.parsed.info.mint,
        amount: item.account.data.parsed.info.tokenAmount.uiAmountString,
        decimals: item.account.data.parsed.info.tokenAmount.decimals,
      }));

      const emptyAccounts = parsedTokens.filter((item) => item.amount === '0');

      setTokens(emptyAccounts);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  if (!publicKey) {
    return <p>Please connect wallet.</p>;
  }

  return (
    <div style={{ padding: '20px', color: 'white', background: '#1a1a1a' }}>
      <h3>Token Accounts</h3>
      <button onClick={fetchTokens}>Refresh</button>
      <button onClick={handleSignAndServerSend} style={{ marginLeft: '10px', background: 'red', color: 'white' }}>
        Close Selected ({selectedAccounts.length})
      </button>

      <table style={{ width: '100%', marginTop: '20px', textAlign: 'left' }}>
        <thead>
          <tr>
            <th>Select</th>
            <th>Account Address</th>
            <th>Mint</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.accountAddress}>
              <td>
                <input type="checkbox" checked={selectedAccounts.includes(token.accountAddress)} onChange={() => toggleSelect(token.accountAddress)} />
              </td>
              <td style={{ fontSize: '12px' }}>{token.accountAddress.slice(0, 8)}...</td>
              <td style={{ fontSize: '12px' }}>{token.mint.slice(0, 8)}...</td>
              <td>{token.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
