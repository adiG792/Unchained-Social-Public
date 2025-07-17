import { useState } from 'react';

export default function WalletConnect({ setAccount }) {
  const [localAccount, setLocalAccount] = useState(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        if (accounts.length > 0) {
          setLocalAccount(accounts[0]);
          setAccount(accounts[0]); // Update parent state
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      alert('MetaMask not found');
    }
  };

  return (
    <div>
      {localAccount ? (
        <p>Connected: {localAccount}</p>
      ) : (
        <button
          onClick={connectWallet}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
}