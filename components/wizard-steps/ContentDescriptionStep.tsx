/**
 * RENDIZY - Content Description Step (Step 6)
 * 
 * Sistema completo de descrição com:
 * - 6 campos fixos obrigatórios (sem emojis - Airbnb policy)
 * - Sistema multi-idioma (PT, EN, ES)
 * - Tradução automática (opcional)
 * - Campos personalizados configurados pelo admin nas Settings
 * 
 * @version 1.0.103.12
 * @date 2025-10-29
 */

import { useState, useEffect } from 'react';
import {
  FileText,
  Globe,
  Sparkles,
  AlertCircle,
  Check,
  Languages,
  ChevronDown,
  ChevronUp,
  Info,
  Smile,
  Ban
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

type Language = 'pt' | 'en' | 'es';

interface FixedField {
  id: string;
  label: {
    pt: string;
    en: string;
    es: string;
  };
  placeholder: {
    pt: string;
    en: string;
    es: string;
  };
  maxChars: number;
  required: boolean;
  allowEmojis: false;
}

interface ConfiguredCustomField {
  id: string;
  label: string;
  placeholder: {
    pt: string;
    en: string;
    es: string;
  };
  required: boolean;
  order: number;
}

interface CustomFieldValue {
  pt: string;
  en: string;
  es: string;
}

interface ContentDescriptionStepProps {
  value: {
    title?: string; // 🆕 Título do anúncio (máximo 50 caracteres)
    fixedFields?: {
      [key: string]: {
        pt: string;
        en: string;
        es: string;
      };
    };
    customFieldsValues?: {
      [fieldId: string]: CustomFieldValue;
    };
    autoTranslate?: boolean;
  };
  onChange: (data: any) => void;
  configuredCustomFields?: ConfiguredCustomField[];
}

// ============================================================================
// FIXED FIELDS CONFIGURATION
// ============================================================================

const FIXED_FIELDS: FixedField[] = [
  {
    id: 'generalNotes',
    label: {
      pt: 'Notas gerais',
      en: 'General notes',
      es: 'Notas generales'
    },
    placeholder: {
      pt: 'Informe detalhes adicionais que seus hóspedes devem saber sobre o seu espaço.',
      en: 'Inform additional details that your guests should know about your space.',
      es: 'Informe detalles adicionales que sus huéspedes deben saber sobre su espacio.'
    },
    maxChars: 5000,
    required: true,
    allowEmojis: false
  },
  {
    id: 'aboutSpace',
    label: {
      pt: 'Sobre o espaço',
      en: 'About the space',
      es: 'Sobre el espacio'
    },
    placeholder: {
      pt: 'O que torna seu espaço especial?\nO que contribuirá para que seus hóspedes se sintam confortáveis em sua acomodação?',
      en: 'What makes your space special?\nWhat will help your guests feel comfortable in your accommodation?',
      es: '¿Qué hace que su espacio sea especial?\n¿Qué contribuirá para que sus huéspedes se sientan cómodos en su alojamiento?'
    },
    maxChars: 5000,
    required: true,
    allowEmojis: false
  },
  {
    id: 'aboutAccess',
    label: {
      pt: 'Sobre o acesso ao espaço',
      en: 'About access to the space',
      es: 'Sobre el acceso al espacio'
    },
    placeholder: {
      pt: 'Seus hóspedes terão acesso liberado a todas as dependências da acomodação?\nSe for o caso, coloque também informações referentes à restrição do condomínio.',
      en: 'Will your guests have free access to all areas of the accommodation?\nIf applicable, also include information about condominium restrictions.',
      es: '¿Sus huéspedes tendrán acceso libre a todas las dependencias del alojamiento?\nSi es el caso, coloque también información referente a la restricción del condominio.'
    },
    maxChars: 5000,
    required: true,
    allowEmojis: false
  },
  {
    id: 'hostInteraction',
    label: {
      pt: 'Sobre interação com anfitrião',
      en: 'About host interaction',
      es: 'Sobre interacción con anfitrión'
    },
    placeholder: {
      pt: 'Como será a interação com o anfitrião durante a estada?\nHaverá contato em algum momento?',
      en: 'How will the interaction with the host be during the stay?\nWill there be contact at any time?',
      es: '¿Cómo será la interacción con el anfitrión durante la estadía?\n¿Habrá contacto en algún momento?'
    },
    maxChars: 5000,
    required: true,
    allowEmojis: false
  },
  {
    id: 'neighborhoodDescription',
    label: {
      pt: 'Descrição do bairro',
      en: 'Neighborhood description',
      es: 'Descripción del barrio'
    },
    placeholder: {
      pt: 'Como é o bairro ou os arredores do seu anúncio?\nColoque sugestões sobre o que os hóspedes podem fazer por arredores do local.',
      en: 'What is the neighborhood or surroundings of your listing like?\nProvide suggestions about what guests can do in the area.',
      es: '¿Cómo es el barrio o los alrededores de su anuncio?\nColoque sugerencias sobre lo que los huéspedes pueden hacer por los alrededores del local.'
    },
    maxChars: 5000,
    required: true,
    allowEmojis: false
  },
  {
    id: 'transportInfo',
    label: {
      pt: 'Informações sobre locomoção',
      en: 'Transportation information',
      es: 'Información sobre locomoción'
    },
    placeholder: {
      pt: 'Como chegar na propriedade?\nHá opções de transporte público? Estacionamento incluso no local ou nos arredores?\nQual a distância do seu anúncio em relação ao aeroporto ou às principais rodovias mais próximas?',
      en: 'How to get to the property?\nAre there public transportation options? Parking included on-site or nearby?\nWhat is the distance from your listing to the airport or nearest main highways?',
      es: '¿Cómo llegar a la propiedad?\n¿Hay opciones de transporte público? ¿Estacionamiento incluido en el local o en los alrededores?\n¿Cuál es la distancia de su anuncio en relación al aeropuerto o a las principales carreteras más cercanas?'
    },
    maxChars: 5000,
    required: true,
    allowEmojis: false
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function containsEmoji(text: string): boolean {
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(text);
}

function removeEmojis(text: string): string {
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
}

async function autoTranslate(text: string, from: Language, to: Language): Promise<string> {
  if (!text.trim()) return '';

  toast.info('Tradução automática disponível em breve!', {
    description: 'Integração com Google Translate será implementada.'
  });

  return `[${to.toUpperCase()}] ${text}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ContentDescriptionStep({
  value = {},
  onChange,
  configuredCustomFields = []
}: ContentDescriptionStepProps) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('pt');
  const [autoTranslate, setAutoTranslate] = useState(value.autoTranslate || false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['fixed']));

  // 🆕 Título do anúncio
  const [title, setTitle] = useState<string>(value.title || "");

  const [fixedFields, setFixedFields] = useState<{
    [key: string]: { pt: string; en: string; es: string };
  }>(value.fixedFields || {});

  const [customFieldsValues, setCustomFieldsValues] = useState<{
    [fieldId: string]: CustomFieldValue;
  }>(value.customFieldsValues || {});

  // ============================================================================
  // UPDATE PARENT
  // ============================================================================

  useEffect(() => {
    onChange({
      title, // 🆕 Incluir título
      fixedFields,
      customFieldsValues,
      autoTranslate
    });
  }, [title, fixedFields, customFieldsValues, autoTranslate]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFixedFieldChange = (fieldId: string, lang: Language, newValue: string) => {
    const sanitizedValue = removeEmojis(newValue);

    if (sanitizedValue !== newValue) {
      toast.warning('Emojis não são permitidos', {
        description: 'Campos fixos não podem conter emojis (política do Airbnb)'
      });
    }

    setFixedFields(prev => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        [lang]: sanitizedValue
      }
    }));
  };

  const handleCustomFieldValueChange = (fieldId: string, lang: Language, newValue: string) => {
    setCustomFieldsValues(prev => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        [lang]: newValue
      }
    }));
  };

  const handleAutoTranslateField = async (fieldId: string, fieldType: 'fixed' | 'custom') => {
    const ptText = fieldType === 'fixed'
      ? fixedFields[fieldId]?.pt || ''
      : customFieldsValues[fieldId]?.pt || '';

    if (!ptText.trim()) {
      toast.error('Preencha o texto em português primeiro');
      return;
    }

    try {
      const enText = await autoTranslate(ptText, 'pt', 'en');
      const esText = await autoTranslate(ptText, 'pt', 'es');

      if (fieldType === 'fixed') {
        setFixedFields(prev => ({
          ...prev,
          [fieldId]: { ...prev[fieldId], en: enText, es: esText }
        }));
      } else {
        setCustomFieldsValues(prev => ({
          ...prev,
          [fieldId]: { ...prev[fieldId], en: enText, es: esText }
        }));
      }

      toast.success('Tradução automática concluída!');
    } catch (error) {
      toast.error('Erro ao traduzir');
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // ============================================================================
  // STATS
  // ============================================================================

  const fixedFieldsCompleted = FIXED_FIELDS.filter(
    f => fixedFields[f.id]?.pt?.trim()
  ).length;

  const customFieldsCompleted = configuredCustomFields.filter(
    f => customFieldsValues[f.id]?.pt?.trim()
  ).length;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Descrição e Conteúdo</h2>
        <p className="text-muted-foreground">
          Descreva sua propriedade em 3 idiomas
        </p>
      </div>

      {/* 🆕 CAMPO: TÍTULO DO ANÚNCIO */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Título do Anúncio</span>
            <Badge variant={title.length > 50 ? "destructive" : "secondary"}>
              {title.length}/50
            </Badge>
          </CardTitle>
          <CardDescription>
            Título que aparecerá nos anúncios.{" "}
            <strong>Airbnb limita a 50 caracteres</strong> - o que passar será
            cortado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder="Ex: Apartamento aconchegante no centro da cidade"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={70} // Permitir digitar um pouco mais para mostrar o aviso
            className={
              title.length > 50 ? "border-red-500 focus:border-red-500 resize-none" : "resize-none"
            }
            rows={2}
          />
          {title.length > 50 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> O título ultrapassou 50 caracteres. No Airbnb, apenas os primeiros 50 caracteres serão exibidos.
              </AlertDescription>
            </Alert>
          )}
          {title.length > 0 && title.length <= 50 && (
            <p className="text-xs text-muted-foreground">
              ✓ Título dentro do limite do Airbnb ({title.length}/50 caracteres)
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {fixedFieldsCompleted}/{FIXED_FIELDS.length}
              </div>
              <div className="text-sm text-muted-foreground">Campos Fixos</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {customFieldsCompleted}/{configuredCustomFields.length}
              </div>
              <div className="text-sm text-muted-foreground">Campos Personalizados</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">3</div>
              <div className="text-sm text-muted-foreground">Idiomas</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Languages className="h-5 w-5 text-purple-600" />
              <div>
                <div className="font-medium text-purple-900">Tradução Automática</div>
                <div className="text-sm text-purple-700">
                  Traduza automaticamente de PT → EN e ES
                </div>
              </div>
            </div>
            <Switch checked={autoTranslate} onCheckedChange={setAutoTranslate} />
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Ban className="h-4 w-4" />
        <AlertDescription>
          <strong>Política do Airbnb:</strong> Emojis não são permitidos nos campos fixos.
          Você pode usar emojis apenas nos campos personalizados.
        </AlertDescription>
      </Alert>

      {/* FIXED FIELDS */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('fixed')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>Campos Fixos Obrigatórios</CardTitle>
                <CardDescription>
                  6 campos padrão para todas as plataformas (sem emojis)
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{fixedFieldsCompleted}/{FIXED_FIELDS.length}</Badge>
              {expandedSections.has('fixed') ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CardHeader>

        {expandedSections.has('fixed') && (
          <CardContent className="space-y-6">
            {FIXED_FIELDS.map((field) => (
              <div key={field.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    {field.label.pt}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {autoTranslate && (
                    <Button variant="outline" size="sm" onClick={() => handleAutoTranslateField(field.id, 'fixed')}>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Traduzir
                    </Button>
                  )}
                </div>

                <Tabs value={currentLanguage} onValueChange={(v) => setCurrentLanguage(v as Language)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="pt">🇧🇷 PT</TabsTrigger>
                    <TabsTrigger value="en">🇺🇸 EN</TabsTrigger>
                    <TabsTrigger value="es">🇪🇸 ES</TabsTrigger>
                  </TabsList>

                  {(['pt', 'en', 'es'] as Language[]).map((lang) => (
                    <TabsContent key={lang} value={lang} className="space-y-2">
                      <Textarea
                        placeholder={field.placeholder[lang]}
                        value={fixedFields[field.id]?.[lang] || ''}
                        onChange={(e) => handleFixedFieldChange(field.id, lang, e.target.value)}
                        rows={4}
                        maxLength={field.maxChars}
                        className="resize-none"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Ban className="h-3 w-3 text-red-500" />
                          <span>Emojis não permitidos</span>
                        </div>
                        <span>{fixedFields[field.id]?.[lang]?.length || 0}/{field.maxChars}</span>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
                <Separator />
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* CUSTOM FIELDS */}
      {configuredCustomFields.length > 0 && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('custom')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <div>
                  <CardTitle>Campos Personalizados</CardTitle>
                  <CardDescription>
                    Campos configurados pelo administrador (emojis permitidos ✅)
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-50">
                  {customFieldsCompleted}/{configuredCustomFields.length}
                </Badge>
                {expandedSections.has('custom') ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>

          {expandedSections.has('custom') && (
            <CardContent className="space-y-6">
              {configuredCustomFields.sort((a, b) => a.order - b.order).map((field) => (
                <div key={field.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Smile className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">Emojis permitidos</span>
                      {autoTranslate && (
                        <Button variant="outline" size="sm" onClick={() => handleAutoTranslateField(field.id, 'custom')}>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Traduzir
                        </Button>
                      )}
                    </div>
                  </div>

                  <Tabs value={currentLanguage} onValueChange={(v) => setCurrentLanguage(v as Language)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="pt">🇧🇷 PT</TabsTrigger>
                      <TabsTrigger value="en">🇺🇸 EN</TabsTrigger>
                      <TabsTrigger value="es">🇪🇸 ES</TabsTrigger>
                    </TabsList>

                    {(['pt', 'en', 'es'] as Language[]).map((lang) => (
                      <TabsContent key={lang} value={lang} className="space-y-2">
                        <Textarea
                          placeholder={field.placeholder[lang] || `Conteúdo em ${lang.toUpperCase()}...`}
                          value={customFieldsValues[field.id]?.[lang] || ''}
                          onChange={(e) => handleCustomFieldValueChange(field.id, lang, e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Smile className="h-3 w-3 text-green-500" />
                            <span>Emojis permitidos</span>
                          </div>
                          <span>{customFieldsValues[field.id]?.[lang]?.length || 0} caracteres</span>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                  <Separator />
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {configuredCustomFields.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Campos personalizados não configurados.</strong> Vá em{' '}
            <strong>Configurações → Locais & Anúncios</strong> para adicionar campos extras
            como GPS, Senhas, Instruções, etc.
          </AlertDescription>
        </Alert>
      )}

      {/* SUMMARY */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <div className="font-medium text-blue-900">Resumo do Conteúdo</div>
              <div className="text-sm text-blue-700 space-y-1">
                <div>✓ {fixedFieldsCompleted} de {FIXED_FIELDS.length} campos fixos preenchidos</div>
                <div>✓ {customFieldsCompleted} de {configuredCustomFields.length} campos personalizados preenchidos</div>
                <div>✓ Conteúdo disponível em 3 idiomas (PT, EN, ES)</div>
                {autoTranslate && (
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>Tradução automática habilitada</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
