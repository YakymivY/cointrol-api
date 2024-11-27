import { PortfolioRepository } from './../portfolio/repositories/portfolio.repository';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionsRepository } from './transactions.repository';
import { AddTransactionDto } from './dto/add-transaction.dto';
import { User } from 'src/auth/entities/user.entity';
import { TransactionInterface } from './interfaces/transaction.interface';
import { TransactionType } from 'src/shared/enums/transaction-type.enum';
import { BalanceRepository } from 'src/portfolio/repositories/balance.repository';
import { Balance } from 'src/portfolio/entities/balance.entity';

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
  ) {}

  async addTransaction(
    addTransactionDto: AddTransactionDto,
    user: User,
  ): Promise<void> {
    const { asset, amount, price } = addTransactionDto;
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
      //save tx in database
      await this.transactionRepository.createTransaction(
        addTransactionDto,
        user,
      );
      this.logger.log(
        `Transaction created successfully for user ${user.id} - Asset: ${asset}, Amount: ${amount}, Price: ${price}.`,
      );

      //update user portfolio data after transaction
      await this.updatePortfolio(user.id, asset, amount, price);
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
  ): Promise<void> {
    try {
      //get the asset used in the transaction
      const portfolioAsset = await this.portfolioRepository.findOne({
        where: { userId, asset },
      });

      //there is no asset in the database for the user
      if (!portfolioAsset) {
        if (amount < 0) {
          throw new NotFoundException(
            'Cannot sell asset that does not exist in the portfolio.',
          );
        }

        //create a new asset record fot the user
        await this.portfolioRepository.save({
          userId,
          asset,
          amount,
          averageEntryPrice: price,
        });
      } else {
        //update average price
        this.logger.debug(typeof amount, typeof price);
        if (amount > 0) {
          const total: number =
            portfolioAsset.amount * portfolioAsset.averageEntryPrice;
          const updatedAverage: number =
            total + (amount * price) / (portfolioAsset.amount + amount);
          portfolioAsset.averageEntryPrice = updatedAverage;
        }

        //update amount
        portfolioAsset.amount = portfolioAsset.amount + amount;

        //ensure amount do not go negative
        if (portfolioAsset.amount < 0) {
          throw new Error('Insufficient assets to complete the transaction.');
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
