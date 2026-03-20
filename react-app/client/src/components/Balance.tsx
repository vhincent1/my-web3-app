import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState, useCallback } from "react";

export const WalletBalance = () => {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

    console.log('Connected:',connected)
  console.log('publicKey:',publicKey)

  // Function to fetch the balance
  const fetchBalance = useCallback(async () => {
    console.log('Fetch')
    if (publicKey) {
      try {
        const balance = await connection.getBalance(publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      }
    }
  }, [publicKey, connection]);

  // Fetch balance on mount and when publicKey changes
  useEffect(() => {
    console.log('useEffect')
    fetchBalance();

    // Optional: Refresh balance automatically every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  if (!publicKey) return null;

  return (
    <div style={{ padding: "10px", fontWeight: "bold" }}>
      {balance !== null ? (
        <span>Balance: {balance.toFixed(4)} SOL</span>
      ) : (
        <span>Loading balance...</span>
      )}
      hi
    </div>
  );
};

export default WalletBalance