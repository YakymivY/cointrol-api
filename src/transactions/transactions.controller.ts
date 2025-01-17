import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';
import { AddTransactionDto } from './dto/add-transaction.dto';
import { AuthGuard } from '@nestjs/passport';
import { TransactionOutput } from './interfaces/transaction-output.interface';
import { TransactionResponse } from './interfaces/transactino-response.interface';

@Controller('transactions')
@UseGuards(AuthGuard())
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Post('new')
  //create a new transaction
  async addTransaction(
    @GetUser() user: User,
    @Body() addTransactionDto: AddTransactionDto,
  ): Promise<TransactionResponse> {
    return this.transactionsService.addTransaction(addTransactionDto, user);
  }

  @Get()
  //get all user transactions
  getAllTransactions(
    @GetUser() user: User,
    @Query('limit') limit: number,
    @Query('page') page: number,
  ): Promise<TransactionOutput> {
    return this.transactionsService.getAllTransactions(user.id, page, limit);
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
