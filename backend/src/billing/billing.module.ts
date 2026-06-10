import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { Subscription } from './entities/subscription.entity';
import { Merchant } from '../auth/entities/merchant.entity';
import { Plan } from '../plans/entities/plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Merchant, Plan]), HttpModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
