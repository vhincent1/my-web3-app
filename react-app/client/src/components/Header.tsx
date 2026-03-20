// import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import ConnectWallet from './ConnectWallet.tsx';
import Balance from './Balance.tsx';

export const Header = () => {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px' }}>
      <h2>My Solana App</h2>
      <br />

      {/* Your connected balance */}
      <Balance />

      {/* The actual Connect Wallet button */}
      <ConnectWallet />
    </nav>
  );
};
