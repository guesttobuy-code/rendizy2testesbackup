"use client";

/**
 * ACCOMMODATION RULES FORM - Regras da Acomodação (v1.0.80)
 * 
 * Formulário completo de regras com:
 * - Ocupação máxima (automática pelas camas)
 * - Crianças (2-12 anos) - multilíngue
 * - Bebês (0-2 anos) - berços
 * - Pets com cobrança (fluxo condicional)
 * - Fumar, eventos, horário de silêncio
 * - Regras adicionais (multilíngue)
 */

import { useState, useEffect } from 'react';
import { Users, Baby, Dog, Cigarette, PartyPopper, Volume2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// TYPES
// ============================================================================

type PetsPolicy = 'no' | 'yes_free' | 'yes_chargeable' | 'upon_request';
type SmokingPolicy = 'yes' | 'no' | 'outdoor_only';
type EventsPolicy = 'yes' | 'no' | 'on_request';

interface AccommodationRules {
  id: string;
  listingId: string;
  maxAdults: number;
  minAge: number;
  
  acceptsChildren: boolean;
  maxChildren: number;
  childrenRules?: {
    pt: string;
    en: string;
    es: string;
  };
  
  acceptsBabies: boolean;
  maxBabies: number;
  providesCribs: boolean;
  maxCribs: number;
  babiesRules?: {
    pt: string;
    en: string;
    es: string;
  };
  
  allowsPets: PetsPolicy;
  petFee?: number;
  maxPets?: number;
  petRules?: {
    pt: string;
    en: string;
    es: string;
  };
  
  smokingAllowed: SmokingPolicy;
  eventsAllowed: EventsPolicy;
  quietHours: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  
  additionalRules?: {
    pt: string;
    en: string;
    es: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AccommodationRulesForm({ listingId }: { listingId: string }) {
  const [rules, setRules] = useState<AccommodationRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentLang, setCurrentLang] = useState<'pt' | 'en' | 'es'>('pt');

  // ============================================================================
  // FETCH RULES
  // ============================================================================

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/listings/${listingId}/rules`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch rules');
      }

      const data = await response.json();
      
      if (data.success) {
        setRules(data.data);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast.error('Erro ao carregar regras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listingId) {
      fetchRules();
    }
  }, [listingId]);

  // ============================================================================
  // SAVE RULES
  // ============================================================================

  const handleSave = async () => {
    if (!rules) return;

    try {
      setSaving(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/listings/${listingId}/rules`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(rules)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update rules');
      }

      toast.success('Regras atualizadas com sucesso!');
      await fetchRules();
    } catch (error: any) {
      console.error('Error saving rules:', error);
      toast.error(error.message || 'Erro ao salvar regras');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando regras...</div>
      </div>
    );
  }

  if (!rules) {
    return (
      <div className="text-center text-destructive">
        Erro ao carregar regras
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Regras da Acomodação</h2>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* LANGUAGE SELECTOR */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={currentLang === 'pt' ? 'default' : 'outline'}
          onClick={() => setCurrentLang('pt')}
        >
          🇧🇷 Português
        </Button>
        <Button
          size="sm"
          variant={currentLang === 'en' ? 'default' : 'outline'}
          onClick={() => setCurrentLang('en')}
        >
          🇺🇸 English
        </Button>
        <Button
          size="sm"
          variant={currentLang === 'es' ? 'default' : 'outline'}
          onClick={() => setCurrentLang('es')}
        >
          🇪🇸 Español
        </Button>
      </div>

      {/* ========================================
          1. OCUPAÇÃO MÁXIMA
      ======================================== */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Ocupação Máxima</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Quantidade máxima de adultos</Label>
            <Input
              type="number"
              value={rules.maxAdults}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Definido automaticamente pela configuração de camas
            </p>
          </div>

          <div>
            <Label>Idade mínima para reservar</Label>
            <Input
              type="number"
              value={rules.minAge}
              onChange={(e) => setRules({ ...rules, minAge: parseInt(e.target.value) })}
              min="18"
              max="99"
            />
          </div>
        </div>
      </Card>

      {/* ========================================
          2. CRIANÇAS (2-12 ANOS)
      ======================================== */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Baby className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Crianças (2 a 12 anos)</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rules.acceptsChildren}
              onChange={(e) => setRules({ ...rules, acceptsChildren: e.target.checked })}
              className="w-4 h-4"
            />
            <Label>Aceita crianças?</Label>
          </div>

          {rules.acceptsChildren && (
            <>
              <div>
                <Label>Número máximo de crianças</Label>
                <Input
                  type="number"
                  value={rules.maxChildren}
                  onChange={(e) => setRules({ ...rules, maxChildren: parseInt(e.target.value) })}
                  min="0"
                  max="10"
                />
              </div>

              <div>
                <Label>Regras sobre crianças ({currentLang.toUpperCase()})</Label>
                <Textarea
                  value={rules.childrenRules?.[currentLang] || ''}
                  onChange={(e) => setRules({
                    ...rules,
                    childrenRules: {
                      ...rules.childrenRules,
                      pt: rules.childrenRules?.pt || '',
                      en: rules.childrenRules?.en || '',
                      es: rules.childrenRules?.es || '',
                      [currentLang]: e.target.value
                    }
                  })}
                  placeholder="Detalhes adicionais sobre política de crianças..."
                  rows={3}
                />
              </div>
            </>
          )}
        </div>
      </Card>

      {/* ========================================
          3. BEBÊS (0-2 ANOS)
      ======================================== */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Baby className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Bebês (0 a 2 anos)</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rules.acceptsBabies}
              onChange={(e) => setRules({ ...rules, acceptsBabies: e.target.checked })}
              className="w-4 h-4"
            />
            <Label>Aceita bebês?</Label>
          </div>

          {rules.acceptsBabies && (
            <>
              <div>
                <Label>Número máximo de bebês</Label>
                <Input
                  type="number"
                  value={rules.maxBabies}
                  onChange={(e) => setRules({ ...rules, maxBabies: parseInt(e.target.value) })}
                  min="0"
                  max="5"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.providesCribs}
                  onChange={(e) => setRules({ ...rules, providesCribs: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label>Fornece berços?</Label>
              </div>

              {rules.providesCribs && (
                <div>
                  <Label>Número máximo de berços</Label>
                  <Input
                    type="number"
                    value={rules.maxCribs}
                    onChange={(e) => setRules({ ...rules, maxCribs: parseInt(e.target.value) })}
                    min="0"
                    max="5"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* ========================================
          4. ANIMAIS DE ESTIMAÇÃO
      ======================================== */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Dog className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Animais de Estimação</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Política de pets</Label>
            <select
              value={rules.allowsPets}
              onChange={(e) => setRules({ 
                ...rules, 
                allowsPets: e.target.value as PetsPolicy,
                // Limpar petFee se não for 'yes_chargeable'
                petFee: e.target.value === 'yes_chargeable' ? rules.petFee : undefined
              })}
              className="w-full p-2 border rounded-md"
            >
              <option value="no">Não aceita pets</option>
              <option value="yes_free">Aceita pets grátis</option>
              <option value="yes_chargeable">Aceita pets COM cobrança</option>
              <option value="upon_request">Mediante solicitação</option>
            </select>
          </div>

          {/* CAMPO CONDICIONAL: SÓ APARECE SE allowsPets === 'yes_chargeable' */}
          {rules.allowsPets === 'yes_chargeable' && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  A taxa de pet é cobrada <strong>uma única vez por reserva</strong>, não por dia.
                  Compatível apenas com Airbnb.
                </AlertDescription>
              </Alert>

              <div>
                <Label>Taxa por pet (R$)</Label>
                <Input
                  type="number"
                  value={rules.petFee ? rules.petFee / 100 : ''}
                  onChange={(e) => setRules({ 
                    ...rules, 
                    petFee: Math.round(parseFloat(e.target.value) * 100) 
                  })}
                  placeholder="Ex: 50.00"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Valor cobrado uma única vez por reserva
                </p>
              </div>

              <div>
                <Label>Número máximo de pets</Label>
                <Input
                  type="number"
                  value={rules.maxPets || 0}
                  onChange={(e) => setRules({ ...rules, maxPets: parseInt(e.target.value) })}
                  min="1"
                  max="5"
                />
              </div>
            </>
          )}
        </div>
      </Card>

      {/* ========================================
          5. OUTRAS REGRAS
      ======================================== */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Outras Regras</h3>

        <div className="space-y-4">
          {/* FUMAR */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Cigarette className="h-4 w-4 text-muted-foreground" />
              <Label>É permitido fumar?</Label>
            </div>
            <select
              value={rules.smokingAllowed}
              onChange={(e) => setRules({ ...rules, smokingAllowed: e.target.value as SmokingPolicy })}
              className="w-full p-2 border rounded-md"
            >
              <option value="no">Não permitido</option>
              <option value="yes">Permitido</option>
              <option value="outdoor_only">Apenas áreas externas</option>
            </select>
          </div>

          {/* EVENTOS */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PartyPopper className="h-4 w-4 text-muted-foreground" />
              <Label>Permite eventos?</Label>
            </div>
            <select
              value={rules.eventsAllowed}
              onChange={(e) => setRules({ ...rules, eventsAllowed: e.target.value as EventsPolicy })}
              className="w-full p-2 border rounded-md"
            >
              <option value="no">Não permitido</option>
              <option value="yes">Permitido</option>
              <option value="on_request">Sob consulta</option>
            </select>
          </div>

          {/* HORÁRIO DE SILÊNCIO */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={rules.quietHours}
                onChange={(e) => setRules({ ...rules, quietHours: e.target.checked })}
                className="w-4 h-4"
              />
              <Label>Há regras de silêncio?</Label>
            </div>

            {rules.quietHours && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label className="text-xs">Início</Label>
                  <Input
                    type="time"
                    value={rules.quietHoursStart || '22:00'}
                    onChange={(e) => setRules({ ...rules, quietHoursStart: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Término</Label>
                  <Input
                    type="time"
                    value={rules.quietHoursEnd || '08:00'}
                    onChange={(e) => setRules({ ...rules, quietHoursEnd: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* REGRAS ADICIONAIS */}
          <div>
            <Label>Regras adicionais ({currentLang.toUpperCase()})</Label>
            <Textarea
              value={rules.additionalRules?.[currentLang] || ''}
              onChange={(e) => setRules({
                ...rules,
                additionalRules: {
                  ...rules.additionalRules,
                  pt: rules.additionalRules?.pt || '',
                  en: rules.additionalRules?.en || '',
                  es: rules.additionalRules?.es || '',
                  [currentLang]: e.target.value
                }
              })}
              placeholder="Detalhes adicionais sobre a política da acomodação..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-1">
              O Airbnb aceita apenas um idioma. Será enviado o conteúdo em português.
            </p>
          </div>
        </div>
      </Card>

      {/* FOOTER */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? 'Salvando...' : 'Salvar Regras'}
        </Button>
      </div>
    </div>
  );
}
