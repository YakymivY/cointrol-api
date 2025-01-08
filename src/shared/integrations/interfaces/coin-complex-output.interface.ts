import { CoinComplex } from './coin-complex.interface';

export interface CoinComplexOutput {
  data: CoinComplex[];
  total: number;
  page: number;
  totalPages: number;
}
