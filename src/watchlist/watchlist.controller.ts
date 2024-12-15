import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { AddWatchlistDto } from './dto/add-watchlist.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { WatchlistInterface } from './interfaces/watchlist.interface';

@Controller('watchlist')
@UseGuards(AuthGuard())
export class WatchlistController {
  constructor(private watchlistService: WatchlistService) {}

  @Post('/new')
  addToWatchlist(
    @GetUser() user: User,
    @Body() addWatchlistDto: AddWatchlistDto,
  ): Promise<void> {
    return this.watchlistService.addNewWatchlist(addWatchlistDto, user.id);
  }

  @Get('')
  getUserWatchlist(@GetUser() user: User): Promise<WatchlistInterface[]> {
    return this.watchlistService.getWatchlist(user.id);
  }

  @Patch('/update-status/:id')
  updateWatchlistStatus(
    @GetUser() user: User,
    @Param('id') id: number,
  ): Promise<string> {
    return this.watchlistService.updateStatus(user.id, id);
  }
}
