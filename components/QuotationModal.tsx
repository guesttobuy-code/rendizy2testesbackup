import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Calendar, DollarSign, User, Mail, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Property } from '../App';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  startDate: Date;
  endDate: Date;
}

export function QuotationModal({
  isOpen,
  onClose,
  property,
  startDate,
  endDate
}: QuotationModalProps) {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [validityDays, setValidityDays] = useState('7');
  const [notes, setNotes] = useState('');
  const [paymentOption, setPaymentOption] = useState('full');
  const [linkCopied, setLinkCopied] = useState(false);

  const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Mock price calculation
  const pricePerNight = 415.37;
  const totalPrice = pricePerNight * nights;
  const deposit = totalPrice * 0.3;
  const installmentValue = (totalPrice - deposit) / 2;

  const quotationLink = `https://reservas.sistema.com/cotacao/${Math.random().toString(36).substr(2, 9)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(quotationLink);
      setLinkCopied(true);
      toast.success('Link copiado!', {
        description: 'O link da cotação foi copiado para a área de transferência'
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      // Fallback para seleção manual
      const textArea = document.createElement('textarea');
      textArea.value = quotationLink;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setLinkCopied(true);
        toast.success('Link copiado!', {
          description: 'O link da cotação foi copiado para a área de transferência'
        });
        setTimeout(() => setLinkCopied(false), 2000);
      } catch (e) {
        toast.error('Não foi possível copiar. Selecione e copie manualmente.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSendQuotation = () => {
    const quotationData = {
      property,
      startDate,
      endDate,
      nights,
      totalPrice,
      guest: {
        name: guestName,
        email: guestEmail,
        phone: guestPhone
      },
      validityDays: parseInt(validityDays),
      paymentOption,
      notes,
      link: quotationLink
    };

    console.log('Cotação criada:', quotationData);
    
    toast.success('Cotação criada com sucesso!', {
      description: `Link enviado para ${guestEmail}`
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-500" />
            Fazer Cotação
          </DialogTitle>
          <DialogDescription>
            Crie uma pré-reserva e envie uma cotação para o hóspede
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Property & Period Summary */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-lg border border-yellow-200">
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 text-gray-900">
                  <span>📍</span>
                  <span className="font-medium">{property.name}</span>
                </div>
                <div className="text-sm text-gray-600 ml-6">{property.location}</div>
              </div>
              
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="w-4 h-4" />
                <span>
                  {startDate.toLocaleDateString('pt-BR')} → {endDate.toLocaleDateString('pt-BR')}
                </span>
                <span className="text-gray-500">({nights} {nights === 1 ? 'noite' : 'noites'})</span>
              </div>

              <div className="pt-2 border-t border-yellow-200">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl text-gray-900">
                    R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm text-gray-600">
                    (R$ {pricePerNight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/noite)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6" />

          {/* Guest Information */}
          <div>
            <h3 className="flex items-center gap-2 text-gray-900 mb-4">
              <User className="w-4 h-4" />
              Dados do Hóspede
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="guest-name">Nome completo *</Label>
                <Input
                  id="guest-name"
                  placeholder="Ex: Maria Silva"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-email">E-mail *</Label>
                <Input
                  id="guest-email"
                  type="email"
                  placeholder="maria@email.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-phone">Telefone</Label>
                <Input
                  id="guest-phone"
                  type="tel"
                  placeholder="+55 21 99999-9999"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6" />

          {/* Payment Options */}
          <div>
            <h3 className="text-gray-900 mb-4">💳 Opções de Pagamento</h3>
            <RadioGroup value={paymentOption} onValueChange={setPaymentOption}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="full" id="full" className="mt-1" />
                  <label htmlFor="full" className="flex-1 cursor-pointer">
                    <div className="font-medium">À vista</div>
                    <div className="text-sm text-gray-600">
                      R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </label>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="installment" id="installment" className="mt-1" />
                  <label htmlFor="installment" className="flex-1 cursor-pointer">
                    <div className="font-medium">Parcelado</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>• Entrada: R$ {deposit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (30%)</div>
                      <div>• 2x de R$ {installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} sem juros</div>
                    </div>
                  </label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="border-t pt-6" />

          {/* Validity */}
          <div>
            <Label htmlFor="validity">Validade da cotação (dias)</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="validity"
                type="number"
                min="1"
                max="30"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-gray-600">
                Válido até {new Date(Date.now() + parseInt(validityDays) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          <div className="border-t pt-6" />

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Ex: Desconto especial de 10% para pagamento à vista"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>

          <div className="border-t pt-6" />

          {/* Generated Link */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-medium">
                <Mail className="w-4 h-4" />
                Link da Cotação
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={quotationLink}
                  readOnly
                  className="bg-white flex-1 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-blue-700">
                Este link será enviado automaticamente por e-mail para o hóspede
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <span className="text-xl">💡</span>
              <div className="space-y-2 text-sm text-yellow-900">
                <p className="font-medium">Como funciona a cotação?</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-800">
                  <li>O hóspede recebe um link exclusivo por e-mail</li>
                  <li>Ele pode visualizar detalhes e fotos do imóvel</li>
                  <li>Se aceitar, a reserva é criada automaticamente</li>
                  <li>O período fica bloqueado temporariamente até a validade</li>
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
          <Button 
            onClick={handleSendQuotation}
            disabled={!guestName || !guestEmail}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            <Mail className="w-4 h-4 mr-2" />
            Criar e Enviar Cotação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
