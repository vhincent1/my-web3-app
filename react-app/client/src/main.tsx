import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import App from './App.tsx'
import ConnectWallet from './components/ConnectWallet.tsx'
import Balance from './components/Balance.tsx'
import {Header} from './components/Header.tsx'

// import { Buffer } from 'buffer';
// import process from 'process';

// window.Buffer = Buffer;
// window.process = process;



createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ConnectWallet/>
  </StrictMode>,
)
