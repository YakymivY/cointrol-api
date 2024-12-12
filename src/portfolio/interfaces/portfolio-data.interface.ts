import { HistoricalData } from './historical-data.interface';

export interface PortfolioData {
  userId: string;
  currentPnl: number;
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
  allTimePnl: number;
  totalPnl: number;
  historicalData: HistoricalData;
}

export interface PortfolioAssetAmount {
  asset: string;
  amount: number;
  averageEntryPrice: number;
  allTimePnl: number;
}
