import { ethers } from 'ethers';

// Contract ABI - minimal interface for escrow contract
export const ESCROW_ABI = [
  {
    "inputs": [{"name": "_seller", "type": "address"}, {"name": "_metadata", "type": "string"}],
    "name": "createAndFundTrade",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"name": "tradeId", "type": "uint256"}],
    "name": "confirmDelivery",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "tradeId", "type": "uint256"}, {"name": "reason", "type": "string"}],
    "name": "raiseDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "tradeId", "type": "uint256"}],
    "name": "getTrade",
    "outputs": [
      {"name": "buyer", "type": "address"},
      {"name": "seller", "type": "address"},
      {"name": "amount", "type": "uint256"},
      {"name": "state", "type": "uint8"},
      {"name": "createdAt", "type": "uint256"},
      {"name": "timeoutAt", "type": "uint256"},
      {"name": "metadata", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export const ESCROW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || '';
export const MUMBAI_CHAIN_ID = 80001;

export interface MetaMaskError extends Error {
  code: number;
  data?: any;
}

export class Web3Service {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private contract: ethers.Contract | null = null;

  async connectWallet(): Promise<string> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Initialize provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      // Check if we're on the correct network
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== MUMBAI_CHAIN_ID) {
        await this.switchToMumbai();
      }

      // Initialize contract
      if (ESCROW_CONTRACT_ADDRESS) {
        this.contract = new ethers.Contract(
          ESCROW_CONTRACT_ADDRESS,
          ESCROW_ABI,
          this.signer
        );
      }

      return accounts[0];
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      throw new Error(error.message || 'Failed to connect wallet');
    }
  }

  async switchToMumbai(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${MUMBAI_CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${MUMBAI_CHAIN_ID.toString(16)}`,
                chainName: 'Polygon Mumbai Testnet',
                nativeCurrency: {
                  name: 'MATIC',
                  symbol: 'MATIC',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
                blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
              },
            ],
          });
        } catch (addError) {
          throw new Error('Failed to add Mumbai network to MetaMask');
        }
      } else {
        throw new Error('Failed to switch to Mumbai network');
      }
    }
  }

  async getAccount(): Promise<string | null> {
    if (!this.provider) {
      return null;
    }

    try {
      const accounts = await this.provider.listAccounts();
      return accounts.length > 0 ? accounts[0].address : null;
    } catch (error) {
      console.error('Error getting account:', error);
      return null;
    }
  }

  async getBalance(address?: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const targetAddress = address || await this.getAccount();
    if (!targetAddress) {
      throw new Error('No address provided');
    }

    const balance = await this.provider.getBalance(targetAddress);
    return ethers.formatEther(balance);
  }

  async createAndFundTrade(
    sellerAddress: string,
    amountEth: string,
    metadata: any
  ): Promise<{ txHash: string; tradeId?: number }> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      const amountWei = ethers.parseEther(amountEth);
      const metadataString = JSON.stringify(metadata);

      const tx = await this.contract.createAndFundTrade(
        sellerAddress,
        metadataString,
        { value: amountWei }
      );

      const receipt = await tx.wait();
      
      // Extract trade ID from events
      let tradeId: number | undefined;
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = this.contract.interface.parseLog({
              topics: log.topics,
              data: log.data
            });
            if (parsedLog?.name === 'EscrowCreated') {
              tradeId = Number(parsedLog.args.tradeId);
              break;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }

      return {
        txHash: tx.hash,
        tradeId
      };
    } catch (error: any) {
      console.error('Error creating and funding trade:', error);
      throw new Error(this.parseErrorMessage(error));
    }
  }

  async confirmDelivery(tradeId: number): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.confirmDelivery(tradeId);
      await tx.wait();
      return tx.hash;
    } catch (error: any) {
      console.error('Error confirming delivery:', error);
      throw new Error(this.parseErrorMessage(error));
    }
  }

  async raiseDispute(tradeId: number, reason: string): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.raiseDispute(tradeId, reason);
      await tx.wait();
      return tx.hash;
    } catch (error: any) {
      console.error('Error raising dispute:', error);
      throw new Error(this.parseErrorMessage(error));
    }
  }

  async getTradeDetails(tradeId: number): Promise<any> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await this.contract.getTrade(tradeId);
      return {
        buyer: result[0],
        seller: result[1],
        amount: ethers.formatEther(result[2]),
        state: Number(result[3]),
        createdAt: Number(result[4]),
        timeoutAt: Number(result[5]),
        metadata: result[6]
      };
    } catch (error: any) {
      console.error('Error getting trade details:', error);
      throw new Error(this.parseErrorMessage(error));
    }
  }

  private parseErrorMessage(error: any): string {
    if (error.code === 4001) {
      return 'Transaction rejected by user';
    }
    
    if (error.code === -32603) {
      return 'Internal JSON-RPC error';
    }

    if (error.reason) {
      return error.reason;
    }

    if (error.message) {
      // Extract revert reason from error message
      const revertMatch = error.message.match(/revert (.+?)"/);
      if (revertMatch) {
        return revertMatch[1];
      }
      return error.message;
    }

    return 'Transaction failed';
  }

  weiToEth(wei: string | number): string {
    return ethers.formatEther(wei.toString());
  }

  ethToWei(eth: string | number): string {
    return ethers.parseEther(eth.toString()).toString();
  }

  isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  getPolygonscanUrl(txHash: string): string {
    return `https://mumbai.polygonscan.com/tx/${txHash}`;
  }

  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.contract = null;
  }
}

// Global instance
export const web3Service = new Web3Service();

// MetaMask detection
export const isMetaMaskInstalled = (): boolean => {
  return typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;
};

// Utility functions
export const formatEther = (wei: string | number): string => {
  return ethers.formatEther(wei.toString());
};

export const parseEther = (eth: string | number): string => {
  return ethers.parseEther(eth.toString()).toString();
};

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}
