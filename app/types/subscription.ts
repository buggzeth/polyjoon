// app/types/subscription.ts
export type PackageId = 'starter' | 'pro' | 'whale';

export interface CreditPackage {
  id: PackageId;
  name: string;
  price: number;
  credits: number;
  description: string;
}

export const CREDIT_PACKAGES: Record<string, CreditPackage> = {
  starter: {
    id: 'starter',
    name: 'Starter Pack',
    price: 5,
    credits: 50,
    description: 'Entry level. 50 generations.',
  },
  pro: {
    id: 'pro',
    name: 'Pro Stack',
    price: 15, // Better value
    credits: 200,
    description: 'Serious volume. 200 generations.',
  },
  whale: {
    id: 'whale',
    name: 'Whale Vault',
    price: 50,
    credits: 1000,
    description: 'Maximum alpha. 1000 generations.',
  }
};