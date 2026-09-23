import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/server';

export type PricingContext = {
  product: 'flight' | 'hotel' | 'package' | 'visa' | 'insurance';
  supplier?: string | null;
  airline?: string | null;
  route?: string | null;
  airport?: string | null;
  hotelCategory?: string | null;
  agentId?: string | null;
};

export type PricingResult = {
  supplierCost: number;
  markup: number;
  taxes: number;
  fees: number;
  discount: number;
  customerPrice: number;
  agencyMargin: number;
  appliedRuleIds: string[];
};

const round = (value: number) => Math.round(value * 100) / 100;

function pricingSecret() {
  const secret = process.env.LOCAL_AUTH_SECRET || process.env.POSTGREST_JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('PRICING_SECRET_REQUIRED');
  return crypto.createHash('sha256').update(secret).digest();
}

function sealPricingSnapshot(snapshot: { supplierCost: number; taxes: number; customerPrice: number; expiresAt: number }) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', pricingSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(snapshot), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function openPricingSnapshot(token: string) {
  try {
    const raw = Buffer.from(token, 'base64url');
    if (raw.length < 28) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', pricingSecret(), iv);
    decipher.setAuthTag(tag);
    const snapshot = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')) as {
      supplierCost: number; taxes: number; customerPrice: number; expiresAt: number;
    };
    if (!snapshot.expiresAt || snapshot.expiresAt < Date.now()) return null;
    return snapshot;
  } catch {
    return null;
  }
}

export async function getActivePricingRules() {
  const { data, error } = await supabaseAdmin
    .from('pricing_rules')
    .select('id,rule_type,scope,scope_value,value,is_active,priority,effective_from,effective_to')
    .order('priority', { ascending: false })
    .limit(500);
  if (error) throw error;
  return data || [];
}

function matches(rule: any, context: PricingContext) {
  if (!rule.is_active) return false;
  if (rule.effective_from && new Date(rule.effective_from) > new Date()) return false;
  if (rule.effective_to && new Date(rule.effective_to) < new Date()) return false;
  if (rule.scope === 'global') return true;
  const value = String(rule.scope_value || '').trim().toLowerCase();
  if (!value) return false;
  switch (rule.scope) {
    case 'supplier': return String(context.supplier || '').toLowerCase() === value;
    case 'airline': return String(context.airline || '').toLowerCase() === value;
    case 'route': return String(context.route || '').toLowerCase() === value;
    case 'airport': return String(context.airport || '').toLowerCase() === value;
    case 'hotel': return context.product === 'hotel' && String(context.supplier || '').toLowerCase() === value;
    case 'hotel_category': return String(context.hotelCategory || '').toLowerCase() === value;
    case 'agent': return String(context.agentId || '').toLowerCase() === value;
    case 'customer': return false;
    default: return false;
  }
}

export async function calculateAgencyPrice(input: {
  supplierCost: number;
  taxes?: number;
  fees?: number;
  discount?: number;
  context: PricingContext;
  requestedCustomerPrice?: number;
  rules?: any[];
}): Promise<PricingResult> {
  const supplierCost = round(Number(input.supplierCost));
  const taxes = round(Math.max(0, Number(input.taxes || 0)));
  const fees = round(Math.max(0, Number(input.fees || 0)));
  const discount = round(Math.max(0, Number(input.discount || 0)));
  if (!Number.isFinite(supplierCost) || supplierCost < 0) throw new Error('INVALID_SUPPLIER_COST');

  const rules = input.rules || await getActivePricingRules();
  const applicable = rules.filter((rule: any) => matches(rule, input.context));
  if (!applicable.length) applicable.push({ id: 'built-in-default-12', rule_type: 'percentage_markup', scope: 'global', value: 12, priority: -1 });
  const percentage = applicable
    .filter((r: any) => r.rule_type === 'percentage_markup')
    .sort((a: any, b: any) => Number(b.priority) - Number(a.priority))[0];
  const fixed = applicable
    .filter((r: any) => r.rule_type === 'fixed_markup')
    .sort((a: any, b: any) => Number(b.priority) - Number(a.priority))[0];
  const minimumRules = applicable.filter((r: any) => r.rule_type === 'minimum_margin');
  const minimumMargin = minimumRules.length
    ? Math.max(...minimumRules.map((r: any) => Number(r.value) || 0))
    : 0;

  const percentageMarkup = supplierCost * Math.max(0, Number(percentage?.value || 0)) / 100;
  const fixedMarkup = Math.max(0, Number(fixed?.value || 0));
  const markup = round(Math.max(percentageMarkup + fixedMarkup, minimumMargin));

  const floorPrice = round(supplierCost + markup + taxes + fees - discount);
  const customerPrice = round(Math.max(floorPrice, Number(input.requestedCustomerPrice ?? floorPrice)));
  const agencyMargin = round(customerPrice - supplierCost - taxes - fees + discount);

  return {
    supplierCost,
    markup: round(customerPrice - supplierCost - taxes - fees + discount),
    taxes,
    fees,
    discount,
    customerPrice,
    agencyMargin,
    appliedRuleIds: applicable
      .filter((r: any) => [percentage?.id, fixed?.id, ...minimumRules.map((r: any) => r.id)].includes(r.id))
      .map((r: any) => r.id),
  };
}


export async function priceFlightOffer(offer: any, rules?: any[]) {
  const supplierCost = Number(offer.basePrice?.amount || 0);
  const taxes = Number(offer.taxesAndFees?.amount || 0);
  const pricing = await calculateAgencyPrice({
    supplierCost,
    taxes,
    context: {
      product: 'flight',
      supplier: offer.provider,
      airline: offer.segments?.[0]?.airline?.code,
      route: offer.segments?.[0]?.origin?.code && offer.segments?.[0]?.destination?.code
        ? `${offer.segments[0].origin.code}-${offer.segments[0].destination.code}`
        : undefined,
    },
    rules,
  });
  return {
    ...offer,
    totalPrice: { amount: pricing.customerPrice, currency: 'PKR' },
    pricingToken: sealPricingSnapshot({ supplierCost: pricing.supplierCost, taxes: pricing.taxes, customerPrice: pricing.customerPrice, expiresAt: Date.now() + 15 * 60 * 1000 }),
  };
}

export async function priceHotelRoom(room: any, hotel: any, rules?: any[]) {
  const taxes = Number(room.taxesAndFees?.amount || 0);
  const supplierCost = Math.max(0, Number(room.totalPrice?.amount || 0) - taxes);
  const pricing = await calculateAgencyPrice({
    supplierCost,
    taxes,
    context: {
      product: 'hotel',
      supplier: hotel?.provider,
      hotelCategory: hotel?.starRating ? `${hotel.starRating}_star` : undefined,
    },
    rules,
  });
  const supplierTotal = Math.max(1, Number(room.totalPrice?.amount || 0));
  const ratio = pricing.customerPrice / supplierTotal;
  return {
    ...room,
    pricePerNight: { ...room.pricePerNight, amount: round(Number(room.pricePerNight?.amount || 0) * ratio) },
    totalPrice: { amount: pricing.customerPrice, currency: 'PKR' },
    taxesAndFees: { amount: pricing.taxes, currency: 'PKR' },
    pricingToken: sealPricingSnapshot({ supplierCost: pricing.supplierCost, taxes: pricing.taxes, customerPrice: pricing.customerPrice, expiresAt: Date.now() + 15 * 60 * 1000 }),
  };
}
