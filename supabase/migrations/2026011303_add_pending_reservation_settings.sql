-- ============================================================================
-- Add pending reservation settings (pré-reservas) columns to organizations
-- Similar to Stays.net "Pré-reservas" feature
-- ============================================================================

-- Add pending reservation configuration columns to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pending_reservation_enabled BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pending_reservation_timeout_hours INTEGER DEFAULT 24;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pending_reservation_auto_cancel BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pending_reservation_notify_guest BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pending_reservation_notify_admin BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pending_reservation_reminder_hours INTEGER DEFAULT 6;

-- Add payment_expires_at column to reservations for tracking expiration
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ;
-- Add cancellation_reason to track why reservation was cancelled
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Create index for efficient pending reservation queries
CREATE INDEX IF NOT EXISTS idx_reservations_pending_expires 
  ON reservations(organization_id, status, payment_expires_at) 
  WHERE status = 'pending' AND payment_status = 'pending';

-- Comments
COMMENT ON COLUMN organizations.pending_reservation_enabled IS 'Enables pre-reservation (pending) feature where calendar is blocked awaiting payment';
COMMENT ON COLUMN organizations.pending_reservation_timeout_hours IS 'Hours until pending reservation expires (default 24h)';
COMMENT ON COLUMN organizations.pending_reservation_auto_cancel IS 'Automatically cancel expired pending reservations';
COMMENT ON COLUMN organizations.pending_reservation_notify_guest IS 'Notify guest when pending reservation is about to expire';
COMMENT ON COLUMN organizations.pending_reservation_notify_admin IS 'Notify admin when pending reservation expires';
COMMENT ON COLUMN organizations.pending_reservation_reminder_hours IS 'Hours before expiration to send reminder (default 6h)';
COMMENT ON COLUMN reservations.payment_expires_at IS 'When this pending reservation expires if payment not received';
COMMENT ON COLUMN reservations.cancellation_reason IS 'Reason for cancellation: payment_timeout, guest_cancelled, admin_cancelled, etc';
