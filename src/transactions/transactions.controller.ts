import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';
import { AddTransactionDto } from './dto/add-transaction.dto';
import { AuthGuard } from '@nestjs/passport';

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
}
