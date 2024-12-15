export interface WatchlistInterface {
  id: number;
  user_id: string;
  asset: string;
  price_threshold: number;
  threshold_direction: string;
  status: string;
}
