# Storage Setup

The migrations create a private Supabase Storage bucket named `travel-documents`.

Allowed agency documents include PDF, JPG and PNG. Keep the bucket private. Customers should receive signed/authorized access only to documents marked customer-visible and belonging to their booking.

Never expose the Supabase service-role key in browser code.
