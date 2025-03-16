import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ParserGetRaceDto {
  @ApiProperty({
    description: 'URL of race',
    example: 'https://timing.batyrshin.name/tracks/premium/heats/75818',
    // examples: [
    //   'https://timing.batyrshin.name/tracks/premium/heats/75818',
    //   'https://timing.batyrshin.name/tracks/premium/heats',
    // ],
  })
  @IsString()
  url: string;

  @ApiProperty({
    description: 'Start pitlane (split by whitespace)',
    example: '11 6',
    required: false,
  })
  @IsString()
  @IsOptional()
  pitlane?: string;
}
