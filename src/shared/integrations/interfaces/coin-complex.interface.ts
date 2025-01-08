export interface CoinComplex {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  price: number;
  market_cap: number;
  market_cap_rank: number;
  usd_24h_change: number;
  usd_24h_vol: number;
  ath: number;
  high_24h: number;
  low_24h: number;
}
