import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, RotateCcw, Eye, Check, AlertCircle, Image as ImageIcon, Save, Settings as SettingsIcon, Zap, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { GlobalSettingsManager } from './GlobalSettingsManager';
import { useAuth } from '../src/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { cn } from './ui/utils';
import { toast } from 'sonner';
import StaysNetIntegration from './StaysNetIntegration';
import { BookingComIntegration } from './BookingComIntegration';

interface SettingsPanelProps {
  onLogoChange?: (logoUrl: string | null) => void;
}

export function SettingsPanel({ onLogoChange }: SettingsPanelProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number>(7); // h-7 padrão
  const [showPreview, setShowPreview] = useState(false);
  const [isDarkPreview, setIsDarkPreview] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados salvos (para comparar com mudanças)
  const [savedLogoUrl, setSavedLogoUrl] = useState<string | null>(null);
  const [savedLogoSize, setSavedLogoSize] = useState<number>(7);

  // Carregar logo salva do localStorage ao montar
  useEffect(() => {
    const savedLogo = localStorage.getItem('rendizy-logo');
    const savedSize = localStorage.getItem('rendizy-logo-size');
    
    if (savedLogo) {
      setLogoUrl(savedLogo);
      setSavedLogoUrl(savedLogo);
    }
    if (savedSize) {
      const size = parseInt(savedSize);
      setLogoSize(size);
      setSavedLogoSize(size);
    }
  }, []);

  // Detectar mudanças não salvas
  useEffect(() => {
    const hasChanges = logoUrl !== savedLogoUrl || logoSize !== savedLogoSize;
    setHasUnsavedChanges(hasChanges);
  }, [logoUrl, logoSize, savedLogoUrl, savedLogoSize]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    // Ler arquivo e converter para base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setLogoUrl(result);
      // Não salvar automaticamente - apenas após clicar em "Salvar e Aplicar"
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSizeChange = (value: number[]) => {
    const newSize = value[0];
    setLogoSize(newSize);
  };

  const handleSaveAndApply = () => {
    // Salvar no localStorage
    if (logoUrl) {
      localStorage.setItem('rendizy-logo', logoUrl);
    } else {
      localStorage.removeItem('rendizy-logo');
    }
    localStorage.setItem('rendizy-logo-size', logoSize.toString());
    
    // Atualizar estados salvos
    setSavedLogoUrl(logoUrl);
    setSavedLogoSize(logoSize);
    
    // Notificar componente pai
    if (onLogoChange) onLogoChange(logoUrl);
    
    // Disparar evento para sincronizar sidebar
    window.dispatchEvent(new Event('storage'));
    
    // Feedback visual
    toast.success('Logo salva e aplicada com sucesso!', {
      description: 'As alterações foram aplicadas ao sistema.',
      duration: 3000,
    });
  };

  const handleResetDefaults = () => {
    setLogoUrl(null);
    setLogoSize(7);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDiscardChanges = () => {
    setLogoUrl(savedLogoUrl);
    setLogoSize(savedLogoSize);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('Alterações descartadas', {
      description: 'As configurações foram revertidas.',
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2">Configurações</h1>
            <p className="text-gray-600">
              Personalize a aparência e configurações do sistema Rendizy
            </p>
          </div>
          {!hasUnsavedChanges && logoUrl && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">Tudo salvo</span>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="branding">Identidade Visual</TabsTrigger>
          <TabsTrigger value="policies">Políticas Globais</TabsTrigger>
          <TabsTrigger value="integrations">
            <Zap className="w-4 h-4 mr-2" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6 mt-6">
          <Card className={cn(hasUnsavedChanges && "border-orange-200")}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    Logo da Empresa
                    {hasUnsavedChanges && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs">
                        <AlertCircle className="h-3 w-3" />
                        Não salvo
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Faça upload da logo da sua empresa para personalizar o sistema. 
                    Recomendamos imagens PNG com fundo transparente.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Area */}
              <div className="space-y-4">
                <Label>Upload da Logo</Label>
                
                {!logoUrl ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8",
                      "flex flex-col items-center justify-center gap-4",
                      "cursor-pointer transition-colors",
                      "hover:border-purple-400 hover:bg-purple-50/50",
                      "border-gray-300 bg-gray-50"
                    )}
                  >
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-gray-700 mb-1">
                        Clique para fazer upload da logo
                      </p>
                      <p className="text-sm text-gray-500">
                        PNG, JPG ou SVG (máx. 2MB)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-6 bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 flex items-center justify-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <img
                          src={logoUrl}
                          alt="Logo preview"
                          className={cn("object-contain", getSizeClass())}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveLogo}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Trocar Logo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {showPreview ? 'Ocultar' : 'Ver'} Preview
                      </Button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Size Slider */}
              {logoUrl && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Tamanho da Logo</Label>
                    <span className="text-sm text-gray-500">
                      h-{logoSize}
                    </span>
                  </div>
                  <Slider
                    value={[logoSize]}
                    onValueChange={handleSizeChange}
                    min={4}
                    max={16}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Pequeno (h-4)</span>
                    <span>Médio (h-10)</span>
                    <span>Grande (h-16)</span>
                  </div>
                </div>
              )}

              {/* Preview */}
              {logoUrl && showPreview && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Preview no Menu Lateral</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Modo Escuro</span>
                      <Switch
                        checked={isDarkPreview}
                        onCheckedChange={setIsDarkPreview}
                      />
                    </div>
                  </div>
                  
                  <div className={cn(
                    "rounded-lg border-2 border-dashed border-purple-300 p-4",
                    "bg-gradient-to-br from-purple-50 to-blue-50"
                  )}>
                    <div className="max-w-xs mx-auto">
                      {/* Simulação da Sidebar */}
                      <div className={cn(
                        "rounded-lg shadow-lg overflow-hidden",
                        isDarkPreview ? "bg-gray-900" : "bg-white"
                      )}>
                        {/* Header com Logo */}
                        <div className={cn(
                          "px-4 py-3.5",
                          isDarkPreview ? "border-b border-gray-700" : "border-b border-gray-200"
                        )}>
                          <div className="flex items-center justify-between">
                            <img
                              src={logoUrl}
                              alt="Logo"
                              className={cn("object-contain", getSizeClass())}
                            />
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              isDarkPreview ? "bg-white/10" : "bg-gray-100"
                            )}>
                              <div className={cn(
                                "w-4 h-0.5 rounded",
                                isDarkPreview ? "bg-gray-400" : "bg-gray-600"
                              )} />
                            </div>
                          </div>
                        </div>
                        
                        {/* Menu Items Simulados */}
                        <div className="p-4 space-y-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg",
                                isDarkPreview ? "bg-white/5" : "bg-gray-100"
                              )}
                            >
                              <div className={cn(
                                "w-5 h-5 rounded",
                                isDarkPreview ? "bg-white/20" : "bg-gray-300"
                              )} />
                              <div className={cn(
                                "h-3 flex-1 rounded",
                                isDarkPreview ? "bg-white/20" : "bg-gray-300"
                              )} />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-3 text-center">
                        <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                          <Check className="h-3 w-3 text-green-600" />
                          Preview em tempo real
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Alert */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <span>Para melhores resultados:</span>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Use imagens PNG com fundo transparente</li>
                    <li>Resolução mínima recomendada: 200x50 pixels</li>
                    <li>Certifique-se de que a logo seja legível em diferentes tamanhos</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Reset Button */}
              {logoUrl && (
                <div className="pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={handleResetDefaults}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurar Logo Padrão
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Área de Ação - Salvar e Aplicar */}
          {hasUnsavedChanges && (
            <Card className="border-2 border-orange-200 bg-orange-50/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-orange-900 mb-1">
                      Você tem alterações não salvas
                    </h3>
                    <p className="text-sm text-orange-700 mb-4">
                      As alterações feitas na logo só serão aplicadas após clicar em "Salvar e Aplicar".
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleSaveAndApply}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Salvar e Aplicar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleDiscardChanges}
                        className="border-orange-300 hover:bg-orange-100"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Descartar Alterações
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="policies" className="mt-6">
          <GlobalSettingsManager organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6 mt-6">
          {/* App Store / Loja de Integrações */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Loja de Aplicativos</h2>
              <p className="text-muted-foreground">
                Conecte o RENDIZY com outros sistemas e plataformas para sincronizar reservas, tarifas e disponibilidade
              </p>
            </div>

            {/* Grid de Integrações */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stays.net PMS */}
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Stays.net PMS
                          <Badge className="bg-blue-600 text-white">NOVO</Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Property Management System avançado
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Integre com o Stays.net para sincronizar propriedades, reservas, tarifas e disponibilidade em tempo real.
                  </p>
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    onClick={() => {
                      // Scroll para a seção do Stays.net
                      document.getElementById('staysnet-integration')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Configurar Integração
                  </Button>
                </CardContent>
              </Card>

              {/* Booking.com */}
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Booking.com
                          <Badge variant="outline">OTA</Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Canal de distribuição global
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Conecte com o Booking.com para receber reservas e sincronizar calendário automaticamente.
                  </p>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      document.getElementById('bookingcom-integration')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Configurar Integração
                  </Button>
                </CardContent>
              </Card>

              {/* Airbnb - Em breve */}
              <Card className="overflow-hidden opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-pink-500 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Airbnb
                          <Badge variant="secondary">Em breve</Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Plataforma de aluguel por temporada
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sincronize suas propriedades e reservas com o Airbnb. Disponível em breve.
                  </p>
                  <Button variant="outline" className="w-full" disabled>
                    Em desenvolvimento
                  </Button>
                </CardContent>
              </Card>

              {/* VRBO - Em breve */}
              <Card className="overflow-hidden opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          VRBO
                          <Badge variant="secondary">Em breve</Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Vacation Rentals by Owner
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Conecte com VRBO para ampliar seu alcance. Disponível em breve.
                  </p>
                  <Button variant="outline" className="w-full" disabled>
                    Em desenvolvimento
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-8" />

            {/* Stays.net Integration Component */}
            <div id="staysnet-integration">
              <StaysNetIntegration />
            </div>

            <Separator className="my-8" />

            {/* Booking.com Integration Component */}
            <div id="bookingcom-integration">
              <BookingComIntegration />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
              <CardDescription>
                Ajuste preferências gerais do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo Escuro</Label>
                  <p className="text-sm text-gray-500">
                    Em desenvolvimento - Em breve
                  </p>
                </div>
                <Switch disabled />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações Desktop</Label>
                  <p className="text-sm text-gray-500">
                    Em desenvolvimento - Em breve
                  </p>
                </div>
                <Switch disabled />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Som de Alertas</Label>
                  <p className="text-sm text-gray-500">
                    Em desenvolvimento - Em breve
                  </p>
                </div>
                <Switch disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
