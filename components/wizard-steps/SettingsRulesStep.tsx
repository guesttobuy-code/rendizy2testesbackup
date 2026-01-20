/**
 * RENDIZY - Wizard Step: Regras de Hospedagem
 * 
 * Step do Wizard de Edição de Propriedades
 * Configurações e regras de hospedagem
 * 
 * @version 1.0.103.110
 * @date 2025-10-30
 * 
 * 🆕 v1.0.103.110:
 * - Número de Registro (movido do Passo 1)
 * - Texto atualizado conforme solicitação do usuário
 */

import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { FileText } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface FormData {
  registrationNumber?: string;
  // Outras regras virão aqui...
}

interface SettingsRulesStepProps {
  data: FormData;
  onChange: (data: FormData) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SettingsRulesStep({ data, onChange }: SettingsRulesStepProps) {
  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleChange = (field: keyof FormData, value: any) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-8 max-w-3xl">
      {/* NÚMERO DE REGISTRO */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Número de registro</h3>
          <p className="text-sm text-muted-foreground">
            Digite o número oficial de registro, caso seu país ou localidade, exija.
          </p>
        </div>

        <Input
          id="registrationNumber"
          placeholder="Digite o número de registro"
          value={data.registrationNumber || ''}
          onChange={(e) => handleChange('registrationNumber', e.target.value)}
        />
      </div>

      {/* Placeholder para outras regras de hospedagem */}
      <Card className="border-2 border-dashed border-muted">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="p-4 bg-muted rounded-full">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Regras de Hospedagem</h3>
            <p className="text-sm text-muted-foreground">
              Outras regras e políticas serão implementadas aqui
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsRulesStep;
