import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';
import { AddTransactionDto } from './dto/add-transaction.dto';
import { AuthGuard } from '@nestjs/passport';
import { TransactionInterface } from './interfaces/transaction.interface';

@Controller('transactions')
@UseGuards(AuthGuard())
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Post('new')
  //create a new transaction
  async addTransaction(
    @GetUser() user: User,
    @Body() addTransactionDto: AddTransactionDto,
  ): Promise<void> {
    return this.transactionsService.addTransaction(addTransactionDto, user);
  }

  @Get()
  //get all user transactions
  getAllTransactions(@GetUser() user: User): Promise<TransactionInterface[]> {
    return this.transactionsService.getAllTransactions(user.id);
  }

  @Get('storages')
  //get storage list
  getStorageList(): Promise<string[]> {
    return this.transactionsService.getAllStorages();
  }

  @Get('/validate-storage')
  //check storage existance
  validateStorage(@Query('name') name: string): Promise<boolean> {
    return this.transactionsService.isStorage(name);
  }
}
