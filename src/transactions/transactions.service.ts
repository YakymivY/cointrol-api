import { HistoryRepository } from './../portfolio/repositories/history.repository';
import { PortfolioRepository } from './../portfolio/repositories/portfolio.repository';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionsRepository } from './repositories/transactions.repository';
import { AddTransactionDto } from './dto/add-transaction.dto';
import { User } from 'src/auth/entities/user.entity';
import { TransactionInterface } from './interfaces/transaction.interface';
import { TransactionType } from 'src/shared/enums/transaction-type.enum';
import { BalanceRepository } from 'src/portfolio/repositories/balance.repository';
import { Balance } from 'src/portfolio/entities/balance.entity';
import { StorageRepository } from './repositories/storage.repository';
import { Storage } from './entities/storage.entity';
import { History } from 'src/portfolio/entities/history.entity';

@Injectable()
export class TransactionsService {
  private logger = new Logger(TransactionsService.name);
  constructor(
    @InjectRepository(TransactionsRepository)
    private transactionRepository: TransactionsRepository,
    @InjectRepository(PortfolioRepository)
    private portfolioRepository: PortfolioRepository,
    @InjectRepository(BalanceRepository)
    private balanceRepository: BalanceRepository,
    @InjectRepository(StorageRepository)
    private storageRepository: StorageRepository,
    @InjectRepository(HistoryRepository)
    private historyRepository: HistoryRepository,
  ) {}

  async addTransaction(
    addTransactionDto: AddTransactionDto,
    user: User,
  ): Promise<void> {
    const { asset, amount, price, storage } = addTransactionDto;
    const total: number = amount * price;
    try {
      const userBalance: Balance =
        await this.balanceRepository.findBalanceOfUser(user.id);
      //insufficient balance to buy tokens
      if (amount > 0 && total > userBalance.balance) {
        this.logger.error(
          `Transaction denied: Insufficient balance. User balance: ${userBalance.balance}, Transaction cost: ${total}`,
        );
        throw new BadRequestException(
          `Insufficient balance. You need ${total} but only have ${userBalance.balance}.`,
        );
      }
      //get storage entity from db
      let storageObject = null;
      if (storage) {
        storageObject = await this.storageRepository.findOne({
          where: { name: storage },
        });
        if (!storageObject) {
          this.logger.warn('Failed to find the storage in database');
        }
      }
      //save tx in database
      await this.transactionRepository.createTransaction(
        asset,
        amount,
        price,
        user,
        storageObject,
      );
      this.logger.log(
        `Transaction created successfully for user ${user.id} - Asset: ${asset}, Amount: ${amount}, Price: ${price}.`,
      );

      //update user portfolio data after transaction
      await this.updatePortfolio(user.id, asset, amount, price, storageObject);
      this.logger.log(`Portfolio updated successfully for user ${user.id}.`);

      //update balance of user
      await this.updateBalance(user.id, amount * price);
      this.logger.log(`Balance updated successfully for user ${user.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to add transaction for user ${user.id}. Error: ${error.message}`,
      );
      //rethrow error if it's already a recognized exception
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'An error occured while processing the transaction.',
      );
    }
  }

  async updatePortfolio(
    userId: string,
    asset: string,
    amount: number,
    price: number,
    storage: Storage | null,
  ): Promise<void> {
    try {
      //get the asset used in the transaction
      const portfolioAsset = await this.portfolioRepository.findOne({
        where: { userId, asset },
        relations: ['storages'],
      });

      //there is no asset in the database for the user
      if (!portfolioAsset) {
        //no asset to sell
        if (amount < 0) {
          throw new NotFoundException(
            'Cannot sell asset that does not exist in the portfolio.',
          );
        }

        //create new history record and a new asset record for the user
        await this.historyRepository.manager.transaction(
          async (transactionalEntityManager) => {
            await transactionalEntityManager.save(History, {
              userId,
              asset,
            });
            await this.portfolioRepository.save({
              userId,
              asset,
              amount,
              averageEntryPrice: price,
              storages: [storage],
            });
          },
        );
      } else {
        if (amount > 0) {
          //user is buying
          //update average price
          const total: number =
            portfolioAsset.amount * portfolioAsset.averageEntryPrice;
          const updatedAverage: number =
            (total + amount * price) / (portfolioAsset.amount + amount);
          portfolioAsset.averageEntryPrice = updatedAverage;

          //update storages if needed
          if (storage) {
            //if new storage is not already in the list
            if (
              !portfolioAsset.storages.some((item) => item.id === storage.id)
            ) {
              portfolioAsset.storages.push(storage);
            }
          }
        } else {
          //user is selling
          //remove tokens storage
          if (storage) {
            //if there is such storage
            if (
              portfolioAsset.storages.some((item) => item.id === storage.id)
            ) {
              portfolioAsset.storages = portfolioAsset.storages.filter(
                (item) => item.id !== storage.id,
              );
            } else {
              this.logger.error(
                `Failed to remove storage of tokens. There is no such value: ${storage.name}`,
              );
              throw new Error(
                'Provided storage was not found and could not be removed',
              );
            }
          }

          // update all-time pnl in history
          const historyRecord = await this.historyRepository.findOne({
            where: { userId, asset },
          });
          const realizedPnl: number =
            Math.abs(amount) * (price - portfolioAsset.averageEntryPrice);
          historyRecord.allTimePnl = historyRecord.allTimePnl + realizedPnl;
          await this.historyRepository.save(historyRecord);
          this.logger.log(`History pnl successfully updated by ${realizedPnl}`);
        }

        //update amount
        portfolioAsset.amount = portfolioAsset.amount + amount;

        //ensure amount do not go negative
        if (portfolioAsset.amount < 0) {
          throw new Error('Insufficient assets to complete the transaction.');
        } else if (portfolioAsset.amount == 0) {
          //user sold all tokens
          //remove record from portfolio
          await this.portfolioRepository.remove(portfolioAsset);
          this.logger.log(`Asset was successfully deleted from portfolio`);
          return;
        }

        //save updated asset info
        await this.portfolioRepository.save(portfolioAsset);
      }
    } catch (error) {
      this.logger.error(
        `Failed to update portfolio for user ${userId}. Asset: ${asset}, Amount: ${amount}, Price: ${price}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'An error occurred while updating the portfolio.',
      );
    }
  }

  async updateBalance(userId: string, balanceChange: number): Promise<void> {
    try {
      const userBalance =
        await this.balanceRepository.findBalanceOfUser(userId);
      userBalance.balance = userBalance.balance - balanceChange;

      await this.balanceRepository.saveBalance(userBalance);
    } catch (error) {
      this.logger.error(
        `Failed to update balance for user ${userId}. Error: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'An error occured while updating the balance.',
      );
    }
  }

  async getAllTransactions(userId: string): Promise<TransactionInterface[]> {
    //creating initial array of txs
    const transactionsResponse: TransactionInterface[] = [];

    try {
      //fetch txs from database
      const transactions = await this.transactionRepository.find({
        where: { userId },
      });

      //modify and add some fields
      for (const tx of transactions) {
        const outputTx: TransactionInterface = {
          id: tx.id,
          type: tx.amount < 0 ? TransactionType.SELL : TransactionType.BUY,
          timestamp: tx.timestamp.toISOString(),
          asset: tx.asset,
          price: tx.price,
          amount: tx.amount,
          total: tx.amount * tx.price,
        };
        transactionsResponse.push(outputTx);
      }
    } catch (error) {
      this.logger.error(
        `Error getting transactions for user ${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to get user transactions');
    }

    return transactionsResponse;
  }
}
