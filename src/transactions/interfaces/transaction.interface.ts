import { TransactionType } from 'src/shared/enums/transaction-type.enum';
import { Storage } from './storage.interface';

export interface TransactionInterface {
  id: string;
  type: TransactionType;
  timestamp: string;
  asset: string;
  price: number;
  amount: number;
  total: number;
  storage?: Storage;
}
