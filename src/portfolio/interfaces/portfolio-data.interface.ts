export interface PortfolioData {
  userId: string;
  assets?: PortfolioAsset[];
}

export interface PortfolioAsset {
  asset: string;
  amount: number;
  price: number;
  total: number;
  average: number;
  totalSpent: number;
  pnl: number;
  pnlPercent: number;
  historicalData: { [key: string]: number };
}

export interface PortfolioAssetAmount {
  asset: string;
  amount: number;
  averageEntryPrice: number;
}
