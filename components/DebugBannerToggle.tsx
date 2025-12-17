import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface DebugBannerToggleProps {
  show: boolean;
  onToggle: () => void;
}

export function DebugBannerToggle({ show, onToggle }: DebugBannerToggleProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        console.log('🧪 Testando banner - alternando estado:', !show);
        onToggle();
      }}
      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
    >
      <AlertTriangle className="h-4 w-4 mr-2" />
      {show ? 'Ocultar' : 'Mostrar'} Banner
    </Button>
  );
}
