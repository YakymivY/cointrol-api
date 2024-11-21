export interface PortfolioData {
  userId: string;
  assets?: PortfolioAsset[];
}

export interface PortfolioAsset {
  asset: string;
  amount: number;
  price: number;
  total: number;
}

export interface PortfolioAssetAmount {
  asset: string;
  amount: number;
}
