import Button from "@mui/material/Button";
import { ethers } from "ethers";
import { useState } from "react";

export default function App() {

  const [account, setAccount] = useState<string | null>(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum as any);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
      } catch (err) {
        alert("用户拒绝了连接请求");
      }
    } else {
      alert("请先安装 MetaMask 钱包");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">ACPay Demo</h1>
      <Button variant="contained" onClick={connectWallet}>
        {account ? `已连接: ${account.slice(0, 6)}...` : "连接钱包"}
      </Button>
    </div>
  );
}
