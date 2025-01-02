import { TransactionInterface } from './transaction.interface';

export interface TransactionOutput {
  data: TransactionInterface[];
  total: number;
  page: number;
  totalPages: number;
}
