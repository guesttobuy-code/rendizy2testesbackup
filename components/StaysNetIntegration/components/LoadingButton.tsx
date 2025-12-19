/**
 * StaysNet Integration - Loading Button Component
 * Safe button component that handles loading states without DOM reconciliation issues
 */

import React from 'react';
import { Button } from '../../ui/button';

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  isLoading: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * CSS Spinner - Pure CSS spinner to avoid lucide-react issues in Portal
 */
const Spinner = () => (
  <svg
    className="w-4 h-4 mr-2 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * LoadingButton - A button that safely handles loading states
 * 
 * CRITICAL: Uses unique keys to force React to completely unmount/remount
 * instead of reconciling. This prevents DOM errors in Dialog Portal + Tabs.
 */
export function LoadingButton({
  isLoading,
  loadingText,
  icon,
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  // Render idle button with unique key
  if (!isLoading) {
    return (
      <Button key="idle" disabled={disabled} {...props}>
        {icon}
        {children}
      </Button>
    );
  }

  // Render loading button with unique key (forces remount)
  return (
    <Button key="loading" disabled {...props}>
      <Spinner />
      {loadingText || children}
    </Button>
  );
}
