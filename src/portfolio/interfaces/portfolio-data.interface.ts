import { HistoricalData } from './historical-data.interface';

export interface PortfolioData {
  userId: string;
  portfolioValue: number;
  currentPnl: ValueChange;
  fixedPnl: number;
  totalPnl: number;
  invested: number;
  bestPerformer: number | null;
  worstPerformer: number | null;
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

export interface ValueChange {
  value: number;
  change: number;
}
