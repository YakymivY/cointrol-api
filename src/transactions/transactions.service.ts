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
    const portfolioAsset = await this.portfolioRepository.findOne({
      where: { userId, asset },
    });

    if (!portfolioAsset) {
      if (amount < 0) {
        throw new NotFoundException(
          'Cannot sell asset that does not exist in the portfolio.',
        );
      }

      await this.portfolioRepository.save({
        userId,
        asset,
        amount,
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

      await this.portfolioRepository.save(portfolioAsset);
    }
  }
}
