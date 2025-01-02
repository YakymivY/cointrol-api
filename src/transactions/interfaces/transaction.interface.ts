import { TransactionType } from 'src/shared/enums/transaction-type.enum';

export interface TransactionInterface {
  id: string;
  type: TransactionType;
  timestamp: string;
  asset: string;
  price: number;
  amount: number;
  total: number;
  storage?: string;
}
