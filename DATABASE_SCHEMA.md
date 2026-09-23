# Database Schema

Core: profiles, roles, agencies, agents, customers, travelers.

Booking: bookings, booking_items, booking_status_history, fulfillment_tasks, fulfillment_notes.

Payments: payments, payment_transactions, payment_proofs, refunds, refund_transactions.

Inventory/provider: flight_searches, flight_offers, flight_segments, flight_legs, flight_fares, flight_baggage, flight_bookings, flight_passengers, hotels, hotel_offers, hotel_rooms, hotel_rates, hotel_bookings, hotel_guests, providers, provider_credentials, provider_settings, provider_logs.

Commercial: pricing_rules, markup rules, discounts, coupons, currency_rates, quotations, quotation_items, packages, package_items, commissions, supplier_payables, accounting_entries, expenses.

Pakistan services: visa_applications, visa_documents, umrah_packages, umrah_bookings, umrah_pilgrims, hajj_packages, insurance_products, insurance_policies.

CRM/operations: leads, followups, reissue_requests, notifications, audit_logs, system_settings, feature_flags, b2b_agencies.

All financial and fulfillment state changes should be auditable.
