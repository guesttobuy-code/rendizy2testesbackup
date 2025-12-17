import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Calendar as CalendarIcon,
  Check 
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'ical'>('csv');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [includeFields, setIncludeFields] = useState({
    guest: true,
    property: true,
    dates: true,
    price: true,
    platform: true,
    status: true,
    notes: false
  });

  const handleExport = () => {
    const formatLabels = {
      csv: 'CSV (Excel)',
      pdf: 'PDF',
      ical: 'iCal (Calendário)'
    };

    toast.success('Exportação iniciada!', {
      description: `Seu arquivo ${formatLabels[exportFormat]} será baixado em instantes`
    });

    // Simulate download
    setTimeout(() => {
      const fileName = `reservas_${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
      toast.success('Download concluído!', {
        description: `Arquivo ${fileName} baixado com sucesso`
      });
      onClose();
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-500" />
            Exportar Dados
          </DialogTitle>
          <DialogDescription>
            Exporte suas reservas, propriedades e hóspedes em diferentes formatos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div>
            <h3 className="text-sm text-gray-700 mb-3">Formato de Exportação</h3>
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as any)}>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="csv" id="csv" />
                  <label htmlFor="csv" className="flex-1 cursor-pointer flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-medium">CSV (Excel)</div>
                      <div className="text-sm text-gray-600">
                        Planilha compatível com Excel, Google Sheets, etc
                      </div>
                    </div>
                  </label>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <label htmlFor="pdf" className="flex-1 cursor-pointer flex items-center gap-3">
                    <FileText className="w-5 h-5 text-red-600" />
                    <div>
                      <div className="font-medium">PDF</div>
                      <div className="text-sm text-gray-600">
                        Documento formatado pronto para impressão
                      </div>
                    </div>
                  </label>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="ical" id="ical" />
                  <label htmlFor="ical" className="flex-1 cursor-pointer flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-medium">iCal (Calendário)</div>
                      <div className="text-sm text-gray-600">
                        Importável no Google Calendar, Outlook, etc
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="border-t pt-6" />

          {/* Date Range */}
          <div>
            <h3 className="text-sm text-gray-700 mb-3">Período</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        format(dateRange.from, 'dd/MM/yyyy')
                      ) : (
                        <span className="text-gray-500">Selecione...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? (
                        format(dateRange.to, 'dd/MM/yyyy')
                      ) : (
                        <span className="text-gray-500">Selecione...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                      locale={ptBR}
                      disabled={(date) => dateRange.from ? date < dateRange.from : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Deixe em branco para exportar todas as reservas
            </p>
          </div>

          <div className="border-t pt-6" />

          {/* Fields Selection */}
          <div>
            <h3 className="text-sm text-gray-700 mb-3">Campos a Exportar</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'guest', label: 'Dados do Hóspede' },
                { key: 'property', label: 'Propriedade' },
                { key: 'dates', label: 'Datas (Check-in/out)' },
                { key: 'price', label: 'Valores' },
                { key: 'platform', label: 'Plataforma' },
                { key: 'status', label: 'Status' },
                { key: 'notes', label: 'Observações' }
              ].map(field => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.key}
                    checked={includeFields[field.key as keyof typeof includeFields]}
                    onCheckedChange={(checked) => 
                      setIncludeFields({ ...includeFields, [field.key]: checked })
                    }
                  />
                  <label
                    htmlFor={field.key}
                    className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {field.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-6" />

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="text-blue-900 font-medium">Resumo da Exportação</p>
                <ul className="text-blue-800 space-y-1">
                  <li>• Formato: {exportFormat.toUpperCase()}</li>
                  <li>• Período: {dateRange.from && dateRange.to 
                    ? `${format(dateRange.from, 'dd/MM/yyyy')} até ${format(dateRange.to, 'dd/MM/yyyy')}`
                    : 'Todas as reservas'
                  }</li>
                  <li>• Campos: {Object.values(includeFields).filter(Boolean).length} selecionados</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
