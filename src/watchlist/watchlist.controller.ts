import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { AddWatchlistDto } from './dto/add-watchlist.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';

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
}
