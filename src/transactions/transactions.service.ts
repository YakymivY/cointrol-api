import { PortfolioRepository } from './../portfolio/repositories/portfolio.repository';
import {
  BadRequestException,
  Inject,
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
import { DataSource, ILike, QueryRunner } from 'typeorm';
import { TransactionOutput } from './interfaces/transaction-output.interface';
import { Portfolio } from 'src/portfolio/entities/portfolio.entity';
import { FixedPnl } from 'src/portfolio/entities/fixed-pnl.entity';
import { TransactionResponse } from './interfaces/transactino-response.interface';
import { Transaction } from './entities/transaction.entity';
import { Cache } from '@nestjs/cache-manager';

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
    private readonly dataSource: DataSource,
    @Inject('CACHE_MANAGER') private cacheManager: Cache,
  ) {}

  async addTransaction(
    addTransactionDto: AddTransactionDto,
    user: User,
  ): Promise<TransactionResponse> {
    const { asset, amount, price, storage } = addTransactionDto;
    const total: number = amount * price;

    //start a database transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
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
      } else if (
        amount < 0 &&
        !(await this.hasEnoughAsset(user.id, asset, Math.abs(amount)))
      ) {
        throw new BadRequestException(
          'Insufficient asset amount for the operation',
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
      const tx = this.transactionRepository.createTransactionEntity(
        asset,
        amount,
        price,
        user,
        storageObject,
      );
      const savedTx: Transaction = await queryRunner.manager.save(tx);
      const savedTxOutput = this.modifyTransactionsArray([savedTx]);

      //update user portfolio data after transaction
      await this.updatePortfolio(
        queryRunner,
        user.id,
        asset,
        amount,
        price,
        storageObject,
      );
      //delete cached assets data for user to update
      this.cacheManager.del(`portfolio:${user.id}`);
      this.logger.log(`Portfolio updated successfully for user ${user.id}.`);

      //update balance of user
      const updatedBalance = await this.updateBalance(
        queryRunner,
        user.id,
        total,
      );
      this.logger.log(`Balance updated successfully for user ${user.id}`);

      //commit the transaction
      await queryRunner.commitTransaction();
      this.logger.log(`Transaction completed successfully for user ${user.id}`);

      return {
        transaction: savedTxOutput[0],
        balance: {
          userId: updatedBalance.user.id,
          deposit: updatedBalance.deposit,
          withdraw: updatedBalance.withdraw,
          balance: updatedBalance.balance,
        },
      };
    } catch (error) {
      //rollback the transaction in case of failure
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Failed to add transaction for user ${user.id}. Error: ${error.message}`,
      );
      //rethrow error if it's already a recognized exception
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'An error occured while processing the transaction.',
      );
    } finally {
      //release the query runner
      await queryRunner.release();
    }
  }

  async updatePortfolio(
    queryRunner: QueryRunner,
    userId: string,
    asset: string,
    amount: number,
    price: number,
    storage: Storage | null,
  ): Promise<Portfolio> {
    try {
      //get the asset used in the transaction
      const portfolioAsset = await queryRunner.manager.findOne(Portfolio, {
        where: { userId, asset },
        relations: ['storages'],
      });

      //there is no asset in the database for the user
      if (!portfolioAsset) {
        //create new history record and a new asset record for the user
        const history = queryRunner.manager.create(History, { userId, asset });
        const portfolio: Portfolio = queryRunner.manager.create(Portfolio, {
          userId,
          asset,
          amount,
          averageEntryPrice: price,
          storages: storage ? [storage] : [],
        });
        await queryRunner.manager.save(history);
        await queryRunner.manager.save(portfolio);
        return portfolio;
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
              throw new BadRequestException(
                'Provided storage was not found and could not be removed',
              );
            }
          }

          //update asset and overall fixed pnl
          await this.updateFixedPnl(
            queryRunner,
            userId,
            asset,
            amount,
            price,
            portfolioAsset.averageEntryPrice,
          );
        }

        //update amount
        portfolioAsset.amount = portfolioAsset.amount + amount;

        //ensure amount do not go negative
        if (portfolioAsset.amount < 0) {
          throw new Error('Insufficient assets to complete the transaction.');
        } else if (portfolioAsset.amount == 0) {
          //user sold all tokens
          //remove record from portfolio
          await queryRunner.manager.remove(Portfolio, portfolioAsset);
          this.logger.log(`Asset was successfully deleted from portfolio`);
          return;
        }

        //save updated asset info
        await queryRunner.manager.save(Portfolio, portfolioAsset);
        return portfolioAsset;
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

  async updateFixedPnl(
    queryRunner: QueryRunner,
    userId: string,
    asset: string,
    amount: number,
    price: number,
    avgEntry: number,
  ): Promise<void> {
    // update asset's all-time pnl in history
    try {
      const historyRecord = await queryRunner.manager.findOne(History, {
        where: { userId, asset },
      });

      if (!historyRecord) {
        throw Error(
          `History record not found for user ${userId} and asset ${asset}`,
        );
      }

      const realizedPnl: number = Math.abs(amount) * (price - avgEntry);
      historyRecord.allTimePnl = (historyRecord.allTimePnl || 0) + realizedPnl;

      await queryRunner.manager.save(History, historyRecord);
      this.logger.log(`History pnl successfully updated by ${realizedPnl}`);

      //update overall user's fixed pnl
      let overallPnl: number;

      //find the latest fixed pnl record
      const latestRecord = await queryRunner.manager.findOne(FixedPnl, {
        where: { userId },
        order: { timestamp: 'DESC' },
        cache: true,
      });

      if (!latestRecord) {
        //calculate overall fixedPnlValue if no latest record exists
        const userPnls: History[] = await queryRunner.manager.find(History, {
          where: { userId },
        });

        overallPnl = userPnls.reduce(
          (total, item) => total + (item.allTimePnl || 0),
          0,
        );

        this.logger.debug(`Calculated overall fixed PnL: ${overallPnl}`);
      } else {
        overallPnl = latestRecord.fixedPnl;
      }

      //update overall pnl with current tx realised pnl
      overallPnl += realizedPnl;

      //compose an object
      const newRecord = queryRunner.manager.create(FixedPnl, {
        userId,
        fixedPnl: overallPnl,
      });

      //save the new record into database
      await queryRunner.manager.save(FixedPnl, newRecord);
      this.logger.log(`Overall fixed PnL record updated successfully.`);
    } catch (error) {
      this.logger.error(
        `Error updating fixed PnL for ${asset} in user's ${userId} portfolio: ${error}`,
      );
      throw new InternalServerErrorException(
        'An error occured while updating fixed PnL.',
      );
    }
  }

  async updateBalance(
    queryRunner: QueryRunner,
    userId: string,
    balanceChange: number,
  ): Promise<Balance> {
    try {
      const userBalance = await queryRunner.manager.findOne(Balance, {
        where: { user: { id: userId } },
      });

      if (!userBalance) {
        this.logger.error(`Balance record not found for user ${userId}`);
        throw new Error('Balance record not found.');
      }

      //update the balance
      userBalance.balance = userBalance.balance - balanceChange;

      return await queryRunner.manager.save(Balance, userBalance);
    } catch (error) {
      this.logger.error(
        `Failed to update balance for user ${userId}. Error: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'An error occured while updating the balance.',
      );
    }
  }

  async getAllTransactions(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<TransactionOutput> {
    page = page || 1; //default to 1 if not passed
    limit = limit || 10; //default to 10 if not passed

    //validate page and limit
    page = Math.max(page, 1);
    limit = Math.max(limit, 1);

    try {
      //calc offset
      const offset: number = (page - 1) * limit;

      //fetch txs from database
      const [transactions, total] =
        await this.transactionRepository.findAndCount({
          where: { userId },
          skip: offset,
          take: limit,
          order: {
            timestamp: 'DESC',
          },
        });

      //modify and add some fields
      const output = this.modifyTransactionsArray(transactions);

      const totalPages = Math.ceil(total / limit);
      return { data: output, total, page, totalPages };
    } catch (error) {
      this.logger.error(
        `Error getting transactions for user ${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to get user transactions');
    }
  }

  async getAllStorages(): Promise<string[]> {
    try {
      const result: Storage[] = await this.storageRepository.find();
      return result.map((item) => item.name);
    } catch (error) {
      this.logger.error('Failed to get list of storages:', error);
      throw new InternalServerErrorException('Failed to get list of storages');
    }
  }

  async isStorage(name: string): Promise<boolean> {
    name = name.toLowerCase();
    const storage: Storage = await this.storageRepository.findOne({
      where: { name: ILike(`${name}`) },
    });

    return storage ? true : false;
  }

  async hasEnoughAsset(
    userId: string,
    asset: string,
    amount: number,
  ): Promise<boolean> {
    try {
      //get the asset used in the transaction
      const portfolioAsset = await this.portfolioRepository.findOne({
        where: { userId, asset },
      });

      //check if asset exists and has sufficient amount
      return !!portfolioAsset && portfolioAsset.amount >= amount;
    } catch (error) {
      this.logger.error('Error fetching portfolio asset:', error);
      throw new Error('Could not verify asset avaliability.');
    }
  }

  private modifyTransactionsArray(
    transactions: Transaction[],
  ): TransactionInterface[] {
    //creating initial array of txs
    const transactionsResponse: TransactionInterface[] = [];

    //modify array
    for (const tx of transactions) {
      const outputTx: TransactionInterface = {
        id: tx.id,
        type: tx.amount < 0 ? TransactionType.SELL : TransactionType.BUY,
        timestamp: tx.timestamp.toISOString(),
        asset: tx.asset,
        price: tx.price,
        amount: tx.amount,
        total: tx.amount * tx.price,
        ...(tx.storage?.name && {
          storage: {
            name: tx.storage.name,
            url: tx.storage.link,
          },
        }),
      };
      transactionsResponse.push(outputTx);
    }

    return transactionsResponse;
  }
}
