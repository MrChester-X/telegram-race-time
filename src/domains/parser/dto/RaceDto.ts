import { IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DriverDto } from './DriverDto';
import { Type } from 'class-transformer';

export class RaceDto {
  @ApiProperty({
    description: 'Array of karts in pitlane at end of race',
    required: false,
    example: ['4', '2'],
  })
  @IsArray()
  @IsOptional()
  pitlane?: string[];

  @ApiProperty({
    description: 'All drivers in race',
    type: [DriverDto],
  })
  @IsArray()
  @Type(() => DriverDto)
  drivers: DriverDto[];
}
