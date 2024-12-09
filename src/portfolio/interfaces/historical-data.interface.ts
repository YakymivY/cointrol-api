interface HistoricalDataEntry {
  price: number;
  change: number;
}

export interface HistoricalData {
  [key: string]: HistoricalDataEntry;
}
