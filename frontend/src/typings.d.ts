// src/typings.d.ts
interface EthereumProvider {
    isMetaMask?: boolean;
    request?: (...args: any[]) => Promise<any>;
    on?: (...args: any[]) => void;
    // 你可以根据需要扩展更多属性
  }
  
  interface Window {
    ethereum?: EthereumProvider;
  }