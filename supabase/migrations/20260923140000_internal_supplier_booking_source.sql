-- Keep supplier/API booking source explicit for internal fulfillment.
ALTER TABLE booking_items ADD COLUMN IF NOT EXISTS supplier_provider text;
ALTER TABLE booking_items ADD COLUMN IF NOT EXISTS supplier_api text;
CREATE INDEX IF NOT EXISTS idx_booking_items_supplier_api ON booking_items(supplier_api);
