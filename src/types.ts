export interface BillItem {
  id: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  assignedTo: string[]; // names of participants
}

export interface BillParticipant {
  id: string;
  name: string;
  avatar?: string;
  address?: string;
  itemsShare: number;
  taxAndServiceShare: number;
  totalFiat: number;
  totalUsdt: number;
  isPaid: boolean;
  paidAt?: string;
  txHash?: string;
  badge?: string;
}

export interface Bill {
  id: string;
  title: string;
  merchantName: string;
  date: string;
  currency: string;
  exchangeRate: number; // e.g. 16300 IDR per USDT
  items: BillItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  grandTotal: number;
  payerName: string;
  payerAddress: string;
  network: "BNB Chain (BSC)" | "BNB Testnet";
  participants: BillParticipant[];
  createdAt: string;
}

export interface UserOpDetail {
  sender: string;
  entryPoint: string;
  recipient: string;
  tokenContract: string;
  amount: number;
  nonce: number;
  paymasterAndData: string;
  paymasterSponsorship: {
    isSponsored: boolean;
    sponsorName: string;
    gasSavedBnb: string;
    gasSavedUsd: string;
    userBnbBalanceRequired: string;
  };
}

export interface SettlementResult {
  txHash: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  blockNumber: number;
  bscScanUrl: string;
  paidAt: string;
  awardedBadge: string;
  reputationScoreAdded: number;
}

export interface SmartWalletInfo {
  address: string;
  type: "ERC-4337 Smart Account" | "EOA (MetaMask / Trust)";
  bnbBalance: number;
  usdtBalance: number;
  isGaslessEnabled: boolean;
}
