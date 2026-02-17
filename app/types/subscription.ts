// app/types/subscription.ts
export type Tier = 'free' | 'basic' | 'semipro' | 'pro';

export interface SubscriptionConfig {
  id: Tier;
  name: string;
  price: number;
  limit: number;
  description: string;
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionConfig> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 5,
    limit: 50,
    description: 'Casual forecasting. 50 gens/mo.',
  },
  semipro: {
    id: 'semipro',
    name: 'Semi-Pro',
    price: 10,
    limit: 150,
    description: 'Serious volume. 150 gens/mo.',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 20,
    limit: 500,
    description: 'Maximum alpha. 500 gens/mo.',
  }
};