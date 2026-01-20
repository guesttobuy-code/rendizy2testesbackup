import React from 'react';

export interface StageApprovalRecord {
  approved?: boolean;
  rejected?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export function StageApproval() {
  return null;
}
