/*
  Quotation commercial hardening.
  Keeps supplier cost and agency margin internal so quotes can be converted
  into bookings without losing the economics behind the sale.
*/
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS supplier_cost numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agency_margin numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'flight' CHECK (service_type IN ('flight','hotel','package','visa','insurance'));

CREATE INDEX IF NOT EXISTS idx_quotations_agent_status ON quotations(agent_id, status);
