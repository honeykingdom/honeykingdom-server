import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { API_BASE } from '../honey-votes.constants';
import { GamesService } from './games.service';
import { IgdbGame } from './igdb-game.entity';

@ApiTags('HoneyVotes - Games')
@Controller(`${API_BASE}/games`)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('/search')
  @ApiOkResponse({ description: 'Created', type: [IgdbGame] })
  @ApiBadRequestResponse({ description: 'Bad request' })
  searchGames(@Query('s') s: string): Promise<IgdbGame[]> {
    return this.gamesService.searchGames(s);
  }
}
