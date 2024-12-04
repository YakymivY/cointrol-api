export interface ExratePayload {
  time: Date;
  asset_id_base: string;
  asset_id_quote: string;
  rate_type: string;
  rate: number;
}
