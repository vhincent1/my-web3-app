const connectButton = document.getElementById('wallet-connect-button');
const authButton = document.getElementById('wallet-auth-button');
const walletInfoDiv = document.getElementById('wallet-info');
const walletAddressSpan = document.getElementById('wallet-address');
const statusDiv = document.getElementById('wallet-status');

const walletHeaderDiv = document.getElementById('wallet-header');
const walletButtonETH = document.getElementById('wallet-button-eth');
const walletButtonSOL = document.getElementById('wallet-button-sol');

window.addEventListener('load', function () {
  const updateNetwork = (network) => (walletHeaderDiv.textContent = `Connect Your ${network} Wallet`);
  const initStyle = (div = walletHeaderDiv) => {
    div.style.margin = '-9px';
    div.style.fontFamily = 'monospace';
    div.style.color = '#000000';
    updateNetwork('Crypto');
  };
  initStyle();

  walletButtonETH.addEventListener('mouseenter', () => {
    walletHeaderDiv.style.color = '#627EEA';
    updateNetwork('Ethereum');
  });

  walletButtonSOL.addEventListener('mouseenter', () => {
    walletHeaderDiv.style.color = '#9258FF';
    updateNetwork('Solana');
  });

  [walletButtonETH, walletButtonSOL].forEach((div) => div.addEventListener('mouseleave', () => initStyle()));
});

let pubKey;
let userData;
authButton.addEventListener('click', async () => {
  if (window.ethereum) {
    await authenticateWallet(window.provider);
  } else {
    await authenticateWallet(window.provider);
  }
});

const wallet = {
  ETH: {
    connect: async () => {
      if (!window.ethereum) {
        console.log('window not eth');
        return;
      }
      try {
        // 1. Create a BrowserProvider for the user's wallet
        const provider = new ethers.BrowserProvider(window.ethereum);

        // 2. Request accounts from the user (prompts MetaMask)
        const accounts = await provider.send('eth_requestAccounts', []);
        const account = accounts[0]; // Get the connected account address

        // 3. Get the Signer (represents the user's account for signing)
        const signer = await provider.getSigner();

        console.log('Connected account:', account);
        console.log('Signer:', signer);

        console.log(await provider.lookupAddress(account));
        // 4. Update UI
        walletButtonETH.textContent = `ETH: ${account}`;
      } catch (error) {
        console.error('User denied account access or error:', error);
      }
    },
    auth: () => {},
  },
  SOL: {
    connect: async () => {
      try {
        const provider = window.solana;
        // Request permission to connect to the wallet

        if (provider.isPhantom) {
          const resp = await provider.connect();
          const publicKey = resp.publicKey.toString();
          pubKey = publicKey;

          console.log('Connected to wallet:', publicKey);

          // Update the UI with the connected address
          walletButtonSOL.textContent = `SOL: ${publicKey}`;
          walletAddressSpan.textContent = publicKey;
          walletInfoDiv.style.display = 'block';
          connectButton.style.display = 'none';
          statusDiv.textContent = 'Wallet connected successfully!';
        } else {
          alert('Phantom wallet is not detected. Please install Phantom.');
        }
      } catch (err) {
        console.error('User rejected wallet connection:', err);
        alert('Wallet connection was rejected.');
      }
    },
    auth: () => {},
  },
};

walletButtonETH.addEventListener('click', () => {
  console.log('connect eth wallet');
  wallet.ETH.connect();
});

walletButtonSOL.addEventListener('click', () => {
  console.log('connect sol wallet');
  wallet.SOL.connect();
});

// connectButton.addEventListener('click', async () => {
//   if (window.ethereum) {
//     try {
//       // 1. Create a BrowserProvider for the user's wallet
//       const provider = new ethers.BrowserProvider(window.ethereum);

//       // 2. Request accounts from the user (prompts MetaMask)
//       const accounts = await provider.send('eth_requestAccounts', []);
//       const account = accounts[0]; // Get the connected account address

//       // 3. Get the Signer (represents the user's account for signing)
//       const signer = await provider.getSigner();

//       console.log('Connected account:', account);
//       console.log('Signer:', signer);

//       walletButtonETH.textContent = `ETH: ${account}`;
//     } catch (error) {
//       console.error('User denied account access or error:', error);
//     }
//   } else if ('solana' in window || window.solana) {
//     connectSOL();
//   } else {
//     alert('Phantom wallet is not detected. Please install the Phantom browser extension.');
//   }
// });

// Function to authenticate the wallet by signing a message
const authenticateWallet = async (provider) => {
  try {
    let apiResponse;

    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // 2. Request accounts from the user (prompts MetaMask)
      const accounts = await provider.send('eth_requestAccounts', []);
      const publicKey = accounts[0]; // Get the connected account address
      const signer = await provider.getSigner(publicKey);

      // 1. Get a message to sign from the backend
      const messageResponse = await fetch('/auth/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey }),
      });
      const { message } = await messageResponse.json();

      // const message = 'Pls sign';

      // The user's wallet will display the message and ask for confirmation
      const signature = await signer.signMessage(message);

      const verifyResponse = await fetch('/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network: 'Ethereum', message, signature, publicKey }),
      });
      apiResponse = await verifyResponse.json();
    } else if (window.solana) {
      const provider = window.solana;
      const publicKey = pubKey; //provider.publicKey.toString();

      // 1. Get a message to sign from the backend
      const messageResponse = await fetch('/auth/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey }),
      });
      const { message } = await messageResponse.json();
      console.log('Message resp:', message);

      // 2. Sign the message with the wallet
      statusDiv.textContent = 'Signing message with your wallet...';
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await provider.signMessage(encodedMessage);

      // 3. Verify the signature with the backend
      statusDiv.textContent = 'Sending signature for verification...';
      const verifyResponse = await fetch('/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          network: 'Solana',
          signature: bs58.default.encode(signedMessage.signature), //bs58 bundle
          publicKey,
        }),
      });

      const verificationResult = await verifyResponse.json();
      console.log('verification result:', verificationResult);
      apiResponse = await verificationResult;
    }

    if (apiResponse.success) {
      console.log('Authentication successful!');
      statusDiv.textContent = 'Successful';
      // // updateUI(publicKey);
      // updateUI(apiResponse);
      window.location.href = '/dashboard';
    } else {
      updateUI(null);
      statusDiv.textContent = 'Failed';
      console.error('Authentication failed:', apiResponse.message);
      alert(apiResponse.message);
      await provider.disconnect(); // Disconnect on failure
    }
  } catch (error) {
    statusDiv.textContent = 'Error';
    // Catch the error thrown by the wallet adapter or RPC node
    if (error.message.includes('User rejected the request') || error.message.includes('cancelled')) {
      // Specific error handling for user rejection
      console.error('Wallet error: User rejected the verification or transaction.');
      // Respond to the client with a specific error message
      // e.g., res.status(400).send({ error: 'User cancelled the transaction.' });
    } else if (error.message.includes('Signature verification failed') || error.message.includes('invalid signature')) {
      // This can happen if the transaction from the client is not properly signed
      console.error('Signature validation error:', error.message);
      // Respond to the client accordingly
    } else {
      // General error handling for other issues like RPC errors
      console.error('An unexpected error occurred:', error);
      // e.g., res.status(500).send({ error: 'Transaction failed due to network issues.' });
    }
    // console.error('Authentication error:', error);
    await provider.disconnect();
  }
};

// Close token accounts

async function closeButton(index, token) {
  console.log('click');
  console.log(index, token);

  const response = await fetch('/closeAccount', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // signature: bs58.default.encode(signedMessage.signature),
      publicKey: pubKey,
      tokenMintAddress: token.mintAddress,
    }),
  });

  const result = await response.json();
  console.log('CloseButton resp:', result);

  const { transaction: base64Tx } = result;
  console.log('btransaction:', base64Tx);

  // const transaction = solanaWeb3.Transaction.from(base64Tx);
  // console.log(transaction)

  // await provider.signTransaction(transaction);
  // signAndSendFromFrontend(result.message)
}

const closeAccountsDisplay = (verificationResult) => {
  const div = document.getElementById('closeAccounts-display');

  const { success, message, publicKey, tokenAccounts } = verificationResult;

  console.log('closeAccountsDisplay: ', message);

  div.appendChild(document.createTextNode(`message: ${message}`));

  if (tokenAccounts.length > 0) {
    tokenAccounts.forEach((token, index) => {
      console.log(`- Account Address: ${token.accountAddress}`);
      console.log(`-- Mint: ${token.mintAddress}, Balance: ${token.balance}`);
      console.log(`\n`);

      const text = `<br><b>Token</b>: ${token.mintAddress}<br>` + `<b>Account</b>: ${token.accountAddress}<br>` + `<b>Balance</b>: ${token.balance}<br>`;

      // const buttonId = `closeAccount-${index}`;
      // const buttonHtml = `<button id='${buttonId}'>CLOSE</button>`;
      const button = document.createElement('button');
      button.id = `closeAccount-${index}`;
      button.textContent = 'CLOSE';
      button.addEventListener('click', () => closeButton(index, token));

      // Insert the HTML string before the end of the target element (inside, after existing children)
      div.insertAdjacentHTML('beforeend', text);
      div.appendChild(button);
    });
  } else {
    div.insertAdjacentElement('beforeend', `No tokens found`);
  }
};

const updateUI = (verificationResult) => {
  console.log('updateUI');
  if (window.ethereum) {
  } else if (window.solana) {
    closeAccountsDisplay(verificationResult);
  }
};
