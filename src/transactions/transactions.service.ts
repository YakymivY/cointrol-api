import { PortfolioRepository } from './../portfolio/portfolio.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionsRepository } from './transactions.repository';
import { AddTransactionDto } from './dto/add-transaction.dto';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(TransactionsRepository)
    private transactionRepository: TransactionsRepository,
    @InjectRepository(PortfolioRepository)
    private portfolioRepository: PortfolioRepository,
  ) {}

  async addTransaction(
    addTransactionDto: AddTransactionDto,
    user: User,
  ): Promise<void> {
    this.transactionRepository.createTransaction(addTransactionDto, user);
    //update user portfolio data after transaction
    await this.updatePortfolio(
      user.id,
      addTransactionDto.asset,
      addTransactionDto.amount,
      addTransactionDto.price,
    );
  }

  async updatePortfolio(
    userId: string,
    asset: string,
    amount: number,
    price: number,
  ): Promise<void> {
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
        averateEntryPrice: price,
      });
    } else {
      //update amount
      portfolioAsset.amount =
        parseFloat(portfolioAsset.amount.toString()) +
        parseFloat(amount.toString());

      //ensure amount do not go negative
      if (portfolioAsset.amount < 0) {
        throw new Error('Insufficient assets to complete the transaction.');
      }

      //save updated asset info
      await this.portfolioRepository.save(portfolioAsset);
    }
  }
}
