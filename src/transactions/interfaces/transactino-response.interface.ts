import { TransactionInterface } from './transaction.interface';
import { BalanceResponse } from 'src/portfolio/interfaces/balance-response.interface';

export interface TransactionResponse {
  transaction: TransactionInterface;
  balance: BalanceResponse;
}
