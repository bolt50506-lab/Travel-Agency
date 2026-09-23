export type PortalModule = {
  key: string;
  label: string;
  description: string;
  route: string;
  domain: 'travel'|'crm'|'finance'|'operations'|'sales'|'admin';
  roles: Array<'customer'|'agent'|'admin'>;
  readOnly?: boolean;
};

export const MODULES: PortalModule[] = [
  {key:'customers',label:'Customers',description:'Customer profiles and contact records.',route:'/agent/customers',domain:'crm',roles:['agent','admin']},
  {key:'travelers',label:'Travelers',description:'Traveler identity and passport records.',route:'/agent/travelers',domain:'crm',roles:['agent','admin']},
  {key:'quotations',label:'Quotations',description:'Create and manage PKR travel quotations.',route:'/agent/quotations',domain:'sales',roles:['agent','admin']},
  {key:'bookings',label:'Bookings',description:'Booking requests, status and fulfillment.',route:'/agent/bookings',domain:'operations',roles:['agent','admin']},
  {key:'payments',label:'Payments',description:'Payment submissions and verification status.',route:'/agent/payments',domain:'finance',roles:['agent','admin'],readOnly:true},
  {key:'commissions',label:'Commissions',description:'Agent commission records and payout status.',route:'/agent/commissions',domain:'finance',roles:['agent','admin'],readOnly:true},
  {key:'admin-finance',label:'Finance',description:'Employee-only finance operations.',route:'/admin/finance',domain:'finance',roles:['admin']},
  {key:'admin-fulfillment',label:'Fulfillment',description:'Employee-only supplier fulfillment operations.',route:'/admin/fulfillment',domain:'operations',roles:['admin']},
];

export function getModule(key: string) {
  return MODULES.find(module => module.key === key);
}
