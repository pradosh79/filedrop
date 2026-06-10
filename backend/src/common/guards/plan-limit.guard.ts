import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from '../../auth/entities/merchant.entity';
import { Subscription, SubscriptionStatus } from '../../billing/entities/subscription.entity';
import { Plan } from '../../plans/entities/plan.entity';

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const merchant: Merchant = request.user;

    const subscription = await this.subscriptionRepo.findOne({
      where: {
        merchantId: merchant.id,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      // Use free plan limits
      const freePlan = await this.planRepo.findOne({ where: { name: 'free' as any } });
      if (freePlan && merchant.monthlyUploads >= freePlan.uploadsPerMonth) {
        throw new ForbiddenException(
          'Monthly upload limit reached. Please upgrade your plan.',
        );
      }
      return true;
    }

    const plan = subscription.plan;
    // -1 means unlimited
    if (plan.uploadsPerMonth !== -1 && merchant.monthlyUploads >= plan.uploadsPerMonth) {
      throw new ForbiddenException(
        `Monthly upload limit of ${plan.uploadsPerMonth} reached. Please upgrade your plan.`,
      );
    }

    // Check storage
    if (merchant.storageUsedBytes >= plan.storageBytes) {
      throw new ForbiddenException(
        'Storage limit reached. Please upgrade your plan.',
      );
    }

    return true;
  }
}
