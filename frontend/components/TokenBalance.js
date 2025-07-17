import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

export default function TokenBalance({ tokenAddress, tokenAbi, reloadTrigger }) {
  const [balance, setBalance] = useState(null);

  useEffect(() => {
  async function loadBalance() {

    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);

        const address = await signer.getAddress();


        try {
          const rawBalance = await tokenContract.balanceOf(address);
          const formattedBalance = ethers.formatEther(rawBalance);

          setBalance(formattedBalance);
        } catch (balanceErr) {
          console.error("❌ Error fetching token balance:", balanceErr);
        }
      } catch (err) {
        console.error("❌ Provider/signer error:", err);
      }
    } else {
      console.warn("⚠️ MetaMask not found");
    }
  }

  loadBalance();
}, [tokenAddress, tokenAbi, reloadTrigger]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-base font-semibold text-gray-700">Your Balance:</span>
        {balance !== null ? (
        <span className="text-base font-bold" style={{ color: '#e48a3a' }}>{balance} SOC</span>
        ) : (
        <span className="text-base text-gray-400">Loading...</span>
        )}
    </div>
  );
}