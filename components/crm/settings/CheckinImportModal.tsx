/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║       IMPORTADOR DE CONFIGURAÇÕES DE CHECK-IN                             ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Permite importar configurações de check-in a partir de planilhas Excel.
 * Suporta o formato padrão e faz matching automático com imóveis cadastrados.
 * 
 * FORMATO ESPERADO DA PLANILHA:
 * Coluna A: Nome do imóvel (para matching)
 * Coluna B: Cidade
 * Coluna C: Tipo de check-in
 * Coluna D: Passo a passo / Instruções
 * 
 * @version 1.0.0
 * @date 2026-02-01
 */

import React, { useState, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  X,
  Download,
  RefreshCw,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/components/ui/utils';

// ============================================================================
// TYPES
// ============================================================================

interface ImportedRow {
  rowNumber: number;
  originalName: string;
  city: string;
  originalType: string;
  instructions: string;
  matchedPropertyId: string | null;
  matchedPropertyName: string | null;
  matchScore: number;
  mappedCategory: string | null;
  extractedConfig: Record<string, any>;
  status: 'matched' | 'partial' | 'not_found' | 'manual';
}

interface PropertyForMatch {
  id: string;
  name: string;
  city: string;
}

interface CheckinImportModalProps {
  open: boolean;
  onClose: () => void;
  properties: PropertyForMatch[];
  onImport: (updates: { propertyId: string; category: string; config: Record<string, any> }[]) => Promise<void>;
}

// ============================================================================
// MAPEAMENTO DE CATEGORIAS
// ============================================================================

const CATEGORY_PATTERNS = {
  normal: ['normal', 'simples', 'padrão'],
  grupo_whatsapp: ['grupo', 'wpp', 'whatsapp', 'whats', 'proprietário'],
  portaria_direta: ['portaria', 'porteiro', 'recepção', 'síndico', 'sindico'],
  email_portaria: ['email', 'e-mail', '@'],
  pessoa_especifica: ['comunicar', 'avisar', 'informar', 'enviar para'],
  aplicativo: ['aplicativo', 'app', 'prolarme', 'condfy', 'vida de síndico', 'organize'],
  formulario: ['formulário', 'formulario', 'ficha', 'cadastro'],
};

const CATEGORY_NAMES: Record<string, string> = {
  normal: 'Normal',
  grupo_whatsapp: 'Grupo WhatsApp',
  portaria_direta: 'Portaria Direta',
  email_portaria: 'Email Portaria',
  pessoa_especifica: 'Pessoa Específica',
  aplicativo: 'Aplicativo',
  formulario: 'Formulário',
};

// ============================================================================
// FUNÇÕES DE MATCHING E PARSING
// ============================================================================

function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, ' ') // Remove caracteres especiais
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(a: string, b: string): number {
  const normA = normalizeString(a);
  const normB = normalizeString(b);
  
  if (normA === normB) return 1;
  if (normA.includes(normB) || normB.includes(normA)) return 0.9;
  
  // Jaccard similarity com palavras
  const wordsA = new Set(normA.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(normB.split(' ').filter(w => w.length > 2));
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size;
}

function findBestMatch(searchName: string, properties: PropertyForMatch[], threshold = 0.5): { property: PropertyForMatch | null; score: number } {
  let bestMatch: PropertyForMatch | null = null;
  let bestScore = 0;
  
  for (const prop of properties) {
    const score = calculateSimilarity(searchName, prop.name);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = prop;
    }
  }
  
  return { property: bestMatch, score: bestScore };
}

function mapCategory(typeString: string): string | null {
  if (!typeString) return null;
  
  const normalized = typeString.toLowerCase();
  
  // Busca por padrões
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (normalized.includes(pattern)) {
        return category;
      }
    }
  }
  
  return null;
}

function extractConfig(instructions: string, typeString: string): Record<string, any> {
  const config: Record<string, any> = {};
  
  if (!instructions) return config;
  
  // Extrair emails
  const emails = instructions.match(/[\w.-]+@[\w.-]+\.\w+/g);
  if (emails) config.emails = [...new Set(emails)];
  
  // Extrair telefones
  const phones = instructions.match(/\+?55?\s*\d{2}\s*\d{4,5}[-\s]?\d{4}/g);
  if (phones) config.phones = [...new Set(phones)];
  
  // Detectar documentos necessários
  const docs: string[] = [];
  const lower = instructions.toLowerCase();
  if (lower.includes('nome')) docs.push('guest_name');
  if (lower.includes('cpf') || lower.includes('documento')) docs.push('document_number');
  if (lower.includes('foto') && (lower.includes('documento') || lower.includes('doc'))) docs.push('document_photo');
  if (lower.includes('placa') || lower.includes('veículo') || lower.includes('carro')) {
    docs.push('vehicle_plate');
    docs.push('vehicle_model');
  }
  if (lower.includes('todos os hóspedes') || lower.includes('todos hóspedes')) docs.push('all_guests');
  
  if (docs.length > 0) config.required_documents = [...new Set(docs)];
  
  // Detectar app específico
  const typeLower = (typeString || '').toLowerCase();
  if (lower.includes('prolarme') || typeLower.includes('prolarme')) config.app_type = 'prolarme';
  else if (lower.includes('condfy') || typeLower.includes('condfy')) config.app_type = 'condfy';
  else if (lower.includes('vida de síndico') || typeLower.includes('vida')) config.app_type = 'vida_sindico';
  else if (lower.includes('organize')) config.app_type = 'organize_condominio';
  
  // Salvar instruções originais
  config.import_instructions = instructions;
  
  return config;
}

function parseExcelData(data: string[][]): Omit<ImportedRow, 'matchedPropertyId' | 'matchedPropertyName' | 'matchScore' | 'status'>[] {
  const rows: Omit<ImportedRow, 'matchedPropertyId' | 'matchedPropertyName' | 'matchScore' | 'status'>[] = [];
  
  // Pular header (primeira linha)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue; // Pular linhas vazias
    
    const originalName = String(row[0] || '').trim();
    const city = String(row[1] || '').trim();
    const originalType = String(row[2] || '').trim();
    const instructions = String(row[3] || '').trim();
    
    if (!originalName) continue;
    
    rows.push({
      rowNumber: i + 1,
      originalName,
      city,
      originalType,
      instructions,
      mappedCategory: mapCategory(originalType),
      extractedConfig: extractConfig(instructions, originalType),
    });
  }
  
  return rows;
}

// ============================================================================
// COMPONENTE DE IMPORTAÇÃO
// ============================================================================

export function CheckinImportModal({ open, onClose, properties, onImport }: CheckinImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [importedRows, setImportedRows] = useState<ImportedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      // Usar SheetJS para ler o Excel
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      // Pegar primeira aba
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
      
      // Parsear dados
      const parsedRows = parseExcelData(data);
      
      // Fazer matching com propriedades
      const matchedRows: ImportedRow[] = parsedRows.map(row => {
        const { property, score } = findBestMatch(row.originalName, properties);
        
        return {
          ...row,
          matchedPropertyId: property?.id || null,
          matchedPropertyName: property?.name || null,
          matchScore: score,
          status: property 
            ? (score >= 0.8 ? 'matched' : 'partial') 
            : 'not_found',
        };
      });
      
      setImportedRows(matchedRows);
      setStep('preview');
      
      const matchedCount = matchedRows.filter(r => r.matchedPropertyId).length;
      toast.success(`${parsedRows.length} linhas encontradas, ${matchedCount} matches automáticos`);
      
    } catch (error) {
      console.error('Erro ao ler arquivo:', error);
      toast.error('Erro ao ler arquivo. Verifique se é um arquivo Excel válido.');
    }
    
    // Reset input
    event.target.value = '';
  }, [properties]);
  
  // Handle manual property selection
  const handlePropertyChange = (rowIndex: number, propertyId: string) => {
    setImportedRows(prev => prev.map((row, idx) => {
      if (idx !== rowIndex) return row;
      
      const property = properties.find(p => p.id === propertyId);
      return {
        ...row,
        matchedPropertyId: propertyId,
        matchedPropertyName: property?.name || null,
        matchScore: 1,
        status: 'manual',
      };
    }));
  };
  
  // Handle category change
  const handleCategoryChange = (rowIndex: number, category: string) => {
    setImportedRows(prev => prev.map((row, idx) => {
      if (idx !== rowIndex) return row;
      return { ...row, mappedCategory: category };
    }));
  };
  
  // Handle import
  const handleImport = async () => {
    const validRows = importedRows.filter(r => r.matchedPropertyId && r.mappedCategory);
    
    if (validRows.length === 0) {
      toast.error('Nenhuma linha válida para importar');
      return;
    }
    
    setImporting(true);
    setStep('importing');
    
    try {
      const updates = validRows.map(row => ({
        propertyId: row.matchedPropertyId!,
        category: row.mappedCategory!,
        config: row.extractedConfig,
      }));
      
      // Simular progresso
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(r => setTimeout(r, 100));
      }
      
      await onImport(updates);
      
      toast.success(`${validRows.length} configurações importadas com sucesso!`);
      onClose();
      
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao importar configurações');
    } finally {
      setImporting(false);
      setProgress(0);
      setStep('upload');
      setImportedRows([]);
    }
  };
  
  // Stats
  const stats = {
    total: importedRows.length,
    matched: importedRows.filter(r => r.status === 'matched').length,
    partial: importedRows.filter(r => r.status === 'partial').length,
    notFound: importedRows.filter(r => r.status === 'not_found').length,
    manual: importedRows.filter(r => r.status === 'manual').length,
    valid: importedRows.filter(r => r.matchedPropertyId && r.mappedCategory).length,
  };
  
  return (
    <Dialog open={open} onOpenChange={() => !importing && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Importar Configurações de Check-in
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload de uma planilha Excel com as configurações de check-in'}
            {step === 'preview' && 'Revise os dados antes de importar'}
            {step === 'importing' && 'Importando configurações...'}
          </DialogDescription>
        </DialogHeader>
        
        {step === 'upload' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-64 h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Arraste uma planilha aqui</p>
                <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Formato esperado da planilha:</p>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline">Col A: Nome do imóvel</Badge>
                <Badge variant="outline">Col B: Cidade</Badge>
                <Badge variant="outline">Col C: Tipo de check-in</Badge>
                <Badge variant="outline">Col D: Instruções</Badge>
              </div>
            </div>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Baixar modelo de planilha
            </Button>
          </div>
        )}
        
        {step === 'preview' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-5 gap-3 py-4">
              <Card className="p-3">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </Card>
              <Card className="p-3 border-green-200 bg-green-50">
                <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
                <div className="text-xs text-muted-foreground">Match exato</div>
              </Card>
              <Card className="p-3 border-amber-200 bg-amber-50">
                <div className="text-2xl font-bold text-amber-600">{stats.partial + stats.manual}</div>
                <div className="text-xs text-muted-foreground">Revisados</div>
              </Card>
              <Card className="p-3 border-red-200 bg-red-50">
                <div className="text-2xl font-bold text-red-600">{stats.notFound}</div>
                <div className="text-xs text-muted-foreground">Sem match</div>
              </Card>
              <Card className="p-3 border-blue-200 bg-blue-50">
                <div className="text-2xl font-bold text-blue-600">{stats.valid}</div>
                <div className="text-xs text-muted-foreground">Prontos</div>
              </Card>
            </div>
            
            {/* Table */}
            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-[200px]">Planilha</TableHead>
                    <TableHead className="w-[200px]">Imóvel Rendizy</TableHead>
                    <TableHead className="w-[150px]">Categoria</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importedRows.map((row, idx) => (
                    <TableRow key={idx} className={cn(
                      row.status === 'not_found' && 'bg-red-50',
                      row.status === 'matched' && 'bg-green-50/50'
                    )}>
                      <TableCell className="text-xs text-muted-foreground">{row.rowNumber}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium truncate max-w-[180px]" title={row.originalName}>
                          {row.originalName}
                        </div>
                        <div className="text-xs text-muted-foreground">{row.city}</div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.matchedPropertyId || ''}
                          onValueChange={(v) => handlePropertyChange(idx, v)}
                        >
                          <SelectTrigger className={cn(
                            "h-8 text-xs",
                            !row.matchedPropertyId && "border-red-300"
                          )}>
                            <SelectValue placeholder="Selecionar imóvel..." />
                          </SelectTrigger>
                          <SelectContent>
                            {properties.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {row.matchScore > 0 && row.matchScore < 1 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Match: {(row.matchScore * 100).toFixed(0)}%
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.mappedCategory || ''}
                          onValueChange={(v) => handleCategoryChange(idx, v)}
                        >
                          <SelectTrigger className={cn(
                            "h-8 text-xs",
                            !row.mappedCategory && "border-amber-300"
                          )}>
                            <SelectValue placeholder="Categoria..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CATEGORY_NAMES).map(([key, name]) => (
                              <SelectItem key={key} value={key} className="text-xs">
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {row.status === 'matched' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {row.status === 'partial' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        {row.status === 'not_found' && <X className="h-4 w-4 text-red-500" />}
                        {row.status === 'manual' && <CheckCircle className="h-4 w-4 text-blue-600" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        )}
        
        {step === 'importing' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-4">
            <RefreshCw className="h-12 w-12 text-primary animate-spin" />
            <p className="text-lg font-medium">Importando configurações...</p>
            <Progress value={progress} className="w-64" />
            <p className="text-sm text-muted-foreground">{progress}%</p>
          </div>
        )}
        
        <DialogFooter>
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => { setStep('upload'); setImportedRows([]); }}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={stats.valid === 0}>
                <Save className="h-4 w-4 mr-2" />
                Importar {stats.valid} configurações
              </Button>
            </>
          )}
          {step === 'upload' && (
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CheckinImportModal;
