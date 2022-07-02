import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class IgdbCover {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional()
  image_id?: string;
}

class IgdbGenre {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional()
  name?: string;
}

export class IgdbGame {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  first_release_date?: number;

  @ApiPropertyOptional()
  slug?: string;

  @ApiPropertyOptional()
  cover?: IgdbCover;

  @ApiPropertyOptional({ type: [IgdbGenre] })
  genres?: IgdbGenre[];

  @ApiPropertyOptional({ type: [Number] })
  release_dates?: number[];
}
