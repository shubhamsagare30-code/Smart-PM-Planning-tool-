import { Resource, User } from '../types';
import { isFinancialRole } from './permissions';

export function stripResourceFinancials<T extends Partial<Resource>>(resource: T, user: User): T {
  if (isFinancialRole(user.role)) return resource;
  const { cost_per_day, ...rest } = resource;
  return rest as T;
}

export function stripResourcesFinancials<T extends Partial<Resource>>(resources: T[], user: User): T[] {
  return resources.map((r) => stripResourceFinancials(r, user));
}

export function omitFinancialFields<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  const out = { ...obj };
  for (const k of keys) delete out[k];
  return out;
}

export const PROJECT_FINANCIAL_KEYS = [
  'budget', 'monthly_rate', 'hourly_rate', 'software_cost', 'hardware_cost',
  'desk_cost', 'office_cost', 'planned_cost', 'actual_cost',
];
