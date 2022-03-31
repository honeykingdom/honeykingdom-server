import { Module } from '@nestjs/common';
import { Formula1Controller } from './formula1.controller';
import { Formula1Service } from './formula1.service';

@Module({
  controllers: [Formula1Controller],
  providers: [Formula1Service],
})
export class Formula1Module {}
