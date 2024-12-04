export interface exrateMessage {
  type: string;
  heartbeat: boolean;
  subscribe_data_type: string[];
  subscribe_filter_asset_id: string[];
  subscribe_update_limit_ms_exrate: number;
}
