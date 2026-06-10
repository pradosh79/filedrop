import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { Plan, PlanName } from '../plans/entities/plan.entity';
import { Merchant } from '../auth/entities/merchant.entity';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Subscription) private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(Merchant) private readonly merchantRepo: Repository<Merchant>,
  ) {}

  async getAllPlans() {
    return this.planRepo.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } });
  }

  async getCurrentPlan(merchantId: string) {
    const sub = await this.subRepo.findOne({
      where: { merchantId, status: SubscriptionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
    const plan = sub
      ? await this.planRepo.findOne({ where: { id: sub.planId } })
      : await this.planRepo.findOne({ where: { name: PlanName.FREE } });
    return { subscription: sub, plan };
  }

  async createSubscription(merchant: Merchant, planName: PlanName, returnUrl: string) {
    const plan = await this.planRepo.findOne({ where: { name: planName } });
    if (!plan) throw new NotFoundException(`Plan ${planName} not found`);

    if (plan.monthlyPrice === 0) {
      return this.activateFreePlan(merchant.id);
    }

    // Build Shopify billing URL
    const chargeUrl = `https://${merchant.shopDomain}/admin/charges/app_subscriptions/new?` +
      `name=${encodeURIComponent(plan.displayName)}&` +
      `price=${plan.monthlyPrice}&` +
      `return_url=${encodeURIComponent(returnUrl)}&` +
      `test=true`;

    return { confirmationUrl: chargeUrl, plan };
  }

  async activateSubscription(merchantId: string, chargeId: string) {
    const sub = await this.subRepo.findOne({ where: { merchantId, status: SubscriptionStatus.PENDING } });
    if (sub) {
      await this.subRepo.update(sub.id, {
        status: SubscriptionStatus.ACTIVE,
        shopifyChargeId: chargeId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }
    return { success: true };
  }

  async activateFreePlan(merchantId: string) {
    const plan = await this.planRepo.findOne({ where: { name: PlanName.FREE } });
    if (!plan) throw new NotFoundException('Free plan not found');

    await this.subRepo.update(
      { merchantId, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.CANCELLED },
    );

    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const sub = this.subRepo.create({
      merchantId,
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE,
      trialStartsAt: new Date(),
      trialEndsAt: trialEnd,
    });
    return this.subRepo.save(sub);
  }

  async cancelSubscription(merchantId: string) {
    await this.subRepo.update(
      { merchantId, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
    );
    return { success: true };
  }
}
