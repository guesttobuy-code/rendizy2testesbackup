import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Calendar as CalendarPicker } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { CancelReservationModal, CancelReservationData } from './CancelReservationModal';
import {
  Calendar,
  User,
  CreditCard,
  MessageSquare,
  FileText,
  Clock,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Link2,
  Receipt,
  History,
  Users,
  Save,
  X,
  Copy,
  ExternalLink,
  Printer,
  RefreshCw,
  Ban,
  Check
} from 'lucide-react';
import { Reservation } from '../App';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReservationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation?: Reservation;
  onEdit?: (reservation: Reservation) => void;
  onCancelReservation?: (reservationId: string) => void;
}

const platformColors: Record<string, string> = {
  airbnb: 'bg-red-100 text-red-700 border-red-200',
  booking: 'bg-blue-100 text-blue-700 border-blue-200',
  direct: 'bg-green-100 text-green-700 border-green-200',
  decolar: 'bg-orange-100 text-orange-700 border-orange-200'
};

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  checked_in: 'bg-blue-100 text-blue-700',
  checked_out: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  blocked: 'bg-gray-100 text-gray-700',
  maintenance: 'bg-orange-100 text-orange-700'
};

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendente',
  checked_in: 'Check-in Feito',
  checked_out: 'Check-out Feito',
  cancelled: 'Cancelada',
  blocked: 'Bloqueada',
  maintenance: 'Manutenção'
};

export function ReservationDetailsModal({
  isOpen,
  onClose,
  reservation,
  onEdit,
  onCancelReservation
}: ReservationDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [newNote, setNewNote] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Edição de datas
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editCheckIn, setEditCheckIn] = useState<Date | undefined>(undefined);
  const [editCheckOut, setEditCheckOut] = useState<Date | undefined>(undefined);

  // Status do pagamento
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'partial' | 'paid' | 'refunded'>('paid');
  const [showPaymentLink, setShowPaymentLink] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');

  useEffect(() => {
    if (reservation) {
      setEditCheckIn(reservation.checkIn);
      setEditCheckOut(reservation.checkOut);
    }
  }, [reservation]);

  if (!reservation) return null;

  const handleCancelReservation = (data: CancelReservationData) => {
    console.log('Cancelamento processado:', data);

    // Chama a função do App.tsx para atualizar o estado
    if (onCancelReservation && reservation) {
      onCancelReservation(reservation.id);
    }

    toast.success('Reserva cancelada com sucesso', {
      description: `Reembolso: R$ ${data.refundAmount?.toFixed(2) || '0,00'}`
    });

    setCancelModalOpen(false);
    onClose();
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      toast.success('Mensagem enviada', {
        description: `Mensagem enviada para ${reservation.guestName}`
      });
      setNewMessage('');
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      toast.success('Observação adicionada');
      setNewNote('');
    }
  };

  const handleSaveDates = () => {
    if (editCheckIn && editCheckOut) {
      toast.success('Datas atualizadas com sucesso');
      setIsEditingDates(false);
      // Aqui você chamaria a API para atualizar as datas
    }
  };

  const handleGeneratePaymentLink = () => {
    const link = `https://pay.rendizy.com/${reservation.id}`;
    setPaymentLink(link);
    setShowPaymentLink(true);
    toast.success('Link de pagamento gerado!');
  };

  const handleCopyPaymentLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink);
      toast.success('Link copiado para a área de transferência!');
    } catch (err) {
      // Fallback para seleção manual
      const textArea = document.createElement('textarea');
      textArea.value = paymentLink;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Link copiado para a área de transferência!');
      } catch (e) {
        toast.error('Não foi possível copiar. Selecione e copie manualmente.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSendPaymentLink = () => {
    toast.success('Link de pagamento enviado por e-mail e WhatsApp!');
    setShowPaymentLink(false);
  };

  const handleExportPDF = () => {
    toast.success('Fatura exportada em PDF');
  };

  const handlePrintInvoice = () => {
    toast.success('Imprimindo fatura...');
  };

  const handleResendConfirmation = () => {
    toast.success('E-mail de confirmação reenviado!');
  };

  const handleChangeStatus = (newStatus: string) => {
    toast.success(`Status alterado para: ${statusLabels[newStatus]}`);
  };

  const nights = Math.ceil((reservation.checkOut.getTime() - reservation.checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const pricePerNight = reservation.price / nights;
  const cleaningFee = 150;
  const serviceFee = Math.round(reservation.price * 0.05);
  const totalAmount = reservation.price + cleaningFee;
  const platformCommission = Math.round(totalAmount * 0.15);
  const netAmount = totalAmount - platformCommission;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[96vw] w-[1600px] h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-3 mb-2">
                <span>Reserva #{reservation.id.slice(0, 8).toUpperCase()}</span>
                <Badge className={statusColors[reservation.status]}>
                  {statusLabels[reservation.status]}
                </Badge>
                <Badge variant="outline" className={platformColors[reservation.platform]}>
                  {reservation.platform === 'airbnb' && 'Airbnb'}
                  {reservation.platform === 'booking' && 'Booking.com'}
                  {reservation.platform === 'direct' && 'Reserva Direta'}
                  {reservation.platform === 'decolar' && 'Decolar'}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Criada em {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit?.(reservation)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5 shrink-0">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="guest">Hóspede</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="invoice">Fatura</TabsTrigger>
            <TabsTrigger value="timeline">Histórico</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 px-1 pb-6">
            {/* TAB: VISÃO GERAL */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* TOP INFO - 3 Colunas Principais */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Propriedade */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Propriedade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <div className="font-medium mb-2">Arraial Novo - Barra da Tijuca RJ</div>
                      <div className="text-sm text-gray-600">Casa • 4 quartos • 6 hóspedes</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        Barra da Tijuca, RJ
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Período */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Período</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setIsEditingDates(true)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!isEditingDates ? (
                      <div className="space-y-2.5">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500">Check-in</div>
                            <div className="text-sm font-medium truncate">
                              {format(reservation.checkIn, "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                            <div className="text-xs text-gray-600">14h</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500">Check-out</div>
                            <div className="text-sm font-medium truncate">
                              {format(reservation.checkOut, "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                            <div className="text-xs text-gray-600">12h</div>
                          </div>
                        </div>
                        <div className="pt-2 border-t flex items-center justify-between">
                          <span className="text-xs text-gray-500">Duração</span>
                          <span className="text-sm font-medium">{nights} {nights === 1 ? 'noite' : 'noites'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Check-in</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full justify-start mt-1">
                                <Calendar className="mr-2 h-3 w-3" />
                                <span className="text-xs">{editCheckIn ? format(editCheckIn, 'dd/MM/yyyy') : 'Selecione'}</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CalendarPicker
                                mode="single"
                                selected={editCheckIn}
                                onSelect={setEditCheckIn}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label className="text-xs">Check-out</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full justify-start mt-1">
                                <Calendar className="mr-2 h-3 w-3" />
                                <span className="text-xs">{editCheckOut ? format(editCheckOut, 'dd/MM/yyyy') : 'Selecione'}</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CalendarPicker
                                mode="single"
                                selected={editCheckOut}
                                onSelect={setEditCheckOut}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex gap-1 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingDates(false)}
                            className="flex-1"
                          >
                            <X className="w-3 h-3 mr-1" />
                            <span className="text-xs">Cancelar</span>
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleSaveDates}
                            className="flex-1"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            <span className="text-xs">Salvar</span>
                          </Button>
                        </div>
                        <Alert className="mt-2">
                          <AlertCircle className="h-3 w-3" />
                          <AlertDescription className="text-xs">
                            Alterações de datas podem afetar o preço da reserva.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Resumo Financeiro */}
                <Card className="min-w-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Resumo Financeiro</CardTitle>
                  </CardHeader>
                  <CardContent className="min-w-0">
                    <div className="space-y-2.5">
                      {/* Valor Total em Destaque */}
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-2.5">
                        <div className="text-xs uppercase tracking-wide text-gray-600 mb-1">
                          Valor total
                        </div>
                        <div className="text-base font-bold text-gray-900 min-w-0 break-words">
                          R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Detalhamento Compacto */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs text-gray-600">Diárias ({nights}x)</span>
                          <span className="text-xs font-medium text-gray-900 text-right">
                            R$ {reservation.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs text-gray-600">Taxa de limpeza</span>
                          <span className="text-xs font-medium text-gray-900 text-right">
                            R$ {cleaningFee.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs text-gray-600">Desconto</span>
                          <span className="text-xs font-medium text-green-600 text-right">
                            - R$ 0,00
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* SECONDARY INFO - Grid 2 colunas */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Payment Status */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Status do Pagamento</CardTitle>
                        <Select value={paymentStatus} onValueChange={(val: any) => setPaymentStatus(val)}>
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="partial">Parcial</SelectItem>
                            <SelectItem value="paid">Pago</SelectItem>
                            <SelectItem value="refunded">Reembolsado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {paymentStatus === 'paid' && (
                        <div className="flex items-center gap-2 p-3 border border-green-200 bg-green-50 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <div>
                            <div className="font-medium text-green-900">Pagamento Confirmado</div>
                            <div className="text-sm text-green-700">Recebido em 21 out 2025</div>
                          </div>
                        </div>
                      )}

                      {paymentStatus === 'pending' && (
                        <>
                          <Alert className="border-yellow-200 bg-yellow-50">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-900">
                              Aguardando confirmação de pagamento
                            </AlertDescription>
                          </Alert>

                          <div className="space-y-2">
                            <Button
                              className="w-full"
                              onClick={handleGeneratePaymentLink}
                              variant="default"
                            >
                              <Link2 className="w-4 h-4 mr-2" />
                              Gerar Link de Pagamento
                            </Button>

                            {showPaymentLink && (
                              <Card className="border-blue-200 bg-blue-50">
                                <CardContent className="pt-4 space-y-2">
                                  <Label className="text-sm font-medium">Link de Pagamento</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      value={paymentLink}
                                      readOnly
                                      className="bg-white"
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCopyPaymentLink}
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="flex-1"
                                      onClick={handleSendPaymentLink}
                                    >
                                      <Send className="w-4 h-4 mr-2" />
                                      Enviar por E-mail/WhatsApp
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(paymentLink, '_blank')}
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </>
                      )}

                      {paymentStatus === 'partial' && (
                        <Alert className="border-blue-200 bg-blue-50">
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-900">
                            <div className="font-medium mb-1">Pagamento Parcial</div>
                            <div className="text-sm">
                              R$ 500,00 de R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebido
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {paymentStatus === 'refunded' && (
                        <Alert className="border-red-200 bg-red-50">
                          <Ban className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-900">
                            Pagamento reembolsado em 23 out 2025
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>

                  {/* Change Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Alterar Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={reservation.status}
                        onValueChange={handleChangeStatus}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="confirmed">Confirmada</SelectItem>
                          <SelectItem value="checked_in">Check-in Feito</SelectItem>
                          <SelectItem value="checked_out">Check-out Feito</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Placeholder for future cards */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Hóspedes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Adultos</span>
                          <span className="font-medium">2</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Crianças</span>
                          <span className="font-medium">1</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Pets</span>
                          <span className="font-medium">0</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total</span>
                          <span className="font-medium">3 pessoas</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Observações Internas
                  </CardTitle>
                  <CardDescription>
                    Notas visíveis apenas para a equipe
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm font-medium text-yellow-900">Maria Silva</span>
                      <span className="text-xs text-yellow-700">22 out, 10:30</span>
                    </div>
                    <p className="text-sm text-yellow-800">
                      Hóspede solicitou check-in antecipado. Confirmar com equipe de limpeza.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      placeholder="Adicionar nova observação interna..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                        <FileText className="w-4 h-4 mr-2" />
                        Adicionar Observação
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: HÓSPEDE */}
            <TabsContent value="guest" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Guest Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Informa��ões Pessoais</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xl">
                          {reservation.guestName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-lg">{reservation.guestName}</div>
                          <div className="text-sm text-gray-600">Hóspede Principal</div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-xs text-gray-500">E-mail</div>
                            <span className="text-sm">juliana.aparecida@email.com</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-xs text-gray-500">Telefone</div>
                            <span className="text-sm">+55 21 98765-4321</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-xs text-gray-500">Localização</div>
                            <span className="text-sm">São Paulo, SP - Brasil</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Documents */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Documentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <div>
                              <div className="text-sm font-medium">RG</div>
                              <div className="text-xs text-gray-500">12.345.678-9</div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <div>
                              <div className="text-sm font-medium">CPF</div>
                              <div className="text-xs text-gray-500">123.456.789-00</div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Guest History */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Histórico</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total de reservas</span>
                          <span className="font-medium">3</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total de noites</span>
                          <span className="font-medium">12</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Valor total gasto</span>
                          <span className="font-medium">R$ 4.500,00</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Status</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Hóspede Confiável
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  {/* Messages */}
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Mensagens
                      </CardTitle>
                      <CardDescription>
                        Comunicação direta com o hóspede
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <div className="flex-1 border rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto mb-4">
                        {/* Message thread */}
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <div className="flex-1 bg-gray-100 rounded-lg p-3">
                              <div className="text-sm font-medium mb-1">Juliana Aparecida</div>
                              <div className="text-sm text-gray-700">
                                Olá! Gostaria de saber se é possível fazer check-in mais cedo?
                              </div>
                              <div className="text-xs text-gray-500 mt-1">21 out, 14:20</div>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end">
                            <div className="flex-1 max-w-md bg-blue-100 rounded-lg p-3">
                              <div className="text-sm font-medium mb-1">Você</div>
                              <div className="text-sm text-gray-700">
                                Olá Juliana! Sim, podemos fazer check-in a partir das 12h. Aguardamos você!
                              </div>
                              <div className="text-xs text-gray-500 mt-1">21 out, 14:35</div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <div className="flex-1 bg-gray-100 rounded-lg p-3">
                              <div className="text-sm font-medium mb-1">Juliana Aparecida</div>
                              <div className="text-sm text-gray-700">
                                Perfeito! Muito obrigada 😊
                              </div>
                              <div className="text-xs text-gray-500 mt-1">21 out, 14:37</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* New message */}
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Digite sua mensagem..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          rows={3}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            Usar Template
                          </Button>
                          <Button size="sm" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                            <Send className="w-4 h-4 mr-2" />
                            Enviar Mensagem
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB: FINANCEIRO */}
            <TabsContent value="financial" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Price Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Detalhamento de Valores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg divide-y">
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-700">Diárias ({nights} noites)</span>
                          <span className="font-medium">R$ {reservation.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-700">Valor por noite</span>
                          <span className="text-gray-600">R$ {pricePerNight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-700">Taxa de limpeza</span>
                          <span className="font-medium">R$ {cleaningFee.toFixed(2)}</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-700">Taxa de serviço</span>
                          <span className="font-medium">R$ {serviceFee.toFixed(2)}</span>
                        </div>
                        <div className="p-3 flex justify-between text-green-700">
                          <span>Desconto (Semanal)</span>
                          <span className="font-medium">- R$ 0,00</span>
                        </div>
                        <div className="p-3 flex justify-between bg-gray-50">
                          <span className="font-medium">Subtotal</span>
                          <span className="font-medium text-lg">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Commission */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Comissões e Taxas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg divide-y">
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-700">Comissão {reservation.platform} (15%)</span>
                          <span className="font-medium text-red-600">- R$ {platformCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-700">Taxa de processamento</span>
                          <span className="font-medium text-red-600">- R$ 0,00</span>
                        </div>
                        <div className="p-3 flex justify-between bg-green-50">
                          <span className="font-medium text-green-900">Valor líquido</span>
                          <span className="font-medium text-green-900 text-lg">R$ {netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  {/* Payment History */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Histórico de Pagamentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="font-medium text-green-900">Pagamento Recebido</span>
                            </div>
                            <span className="text-sm text-green-700">21 out 2025</span>
                          </div>
                          <div className="text-sm text-green-800">
                            R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-green-700 mt-1">
                            Cartão de crédito •••• 4321 • Visa
                          </div>
                        </div>

                        <div className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-5 h-5 text-blue-600" />
                              <span className="font-medium">Reserva Criada</span>
                            </div>
                            <span className="text-sm text-gray-600">20 out 2025</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Confirmação recebida via {reservation.platform}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Methods */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Formas de Pagamento Aceitas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <CreditCard className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">Cartão de Crédito</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <CreditCard className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">Cartão de Débito</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">PIX</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">Transferência Bancária</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB: FATURA */}
            <TabsContent value="invoice" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Fatura da Reserva</CardTitle>
                      <CardDescription>
                        Fatura #{reservation.id.slice(0, 8).toUpperCase()} • Emitida em {format(new Date(), 'dd/MM/yyyy')}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExportPDF}>
                        <Download className="w-4 h-4 mr-2" />
                        Baixar PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Invoice Header */}
                  <div className="border rounded-lg p-6 space-y-6 bg-white">
                    {/* Company Info */}
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-medium text-lg mb-2">Rendizy Gestão de Imóveis</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>CNPJ: 12.345.678/0001-90</div>
                          <div>Av. das Américas, 3000 - Barra da Tijuca</div>
                          <div>Rio de Janeiro - RJ, 22640-000</div>
                          <div>contato@rendizy.com</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 space-y-1">
                          <div><strong>Data de Emissão:</strong> {format(new Date(), 'dd/MM/yyyy')}</div>
                          <div><strong>Nº da Fatura:</strong> #{reservation.id.slice(0, 8).toUpperCase()}</div>
                          <div><strong>Status:</strong> <Badge className="bg-green-100 text-green-700">Paga</Badge></div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Guest Info */}
                    <div>
                      <h4 className="font-medium mb-2">Dados do Cliente</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div><strong>Nome:</strong> {reservation.guestName}</div>
                        <div><strong>E-mail:</strong> juliana.aparecida@email.com</div>
                        <div><strong>Telefone:</strong> +55 21 98765-4321</div>
                        <div><strong>CPF:</strong> 123.456.789-00</div>
                      </div>
                    </div>

                    <Separator />

                    {/* Reservation Details */}
                    <div>
                      <h4 className="font-medium mb-2">Detalhes da Reserva</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div><strong>Propriedade:</strong> Arraial Novo - Barra da Tijuca RJ</div>
                        <div><strong>Check-in:</strong> {format(reservation.checkIn, "dd/MM/yyyy 'às 14h00'")}</div>
                        <div><strong>Check-out:</strong> {format(reservation.checkOut, "dd/MM/yyyy 'às 12h00'")}</div>
                        <div><strong>Noites:</strong> {nights}</div>
                        <div><strong>Hóspedes:</strong> 3 pessoas (2 adultos, 1 criança)</div>
                      </div>
                    </div>

                    <Separator />

                    {/* Items Table */}
                    <div>
                      <h4 className="font-medium mb-3">Itens</h4>
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr className="text-left">
                            <th className="pb-2">Descrição</th>
                            <th className="pb-2 text-right">Qtd</th>
                            <th className="pb-2 text-right">Valor Unit.</th>
                            <th className="pb-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-600">
                          <tr className="border-b">
                            <td className="py-2">Diária</td>
                            <td className="py-2 text-right">{nights}</td>
                            <td className="py-2 text-right">R$ {pricePerNight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="py-2 text-right">R$ {reservation.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2">Taxa de limpeza</td>
                            <td className="py-2 text-right">1</td>
                            <td className="py-2 text-right">R$ {cleaningFee.toFixed(2)}</td>
                            <td className="py-2 text-right">R$ {cleaningFee.toFixed(2)}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2">Taxa de serviço</td>
                            <td className="py-2 text-right">1</td>
                            <td className="py-2 text-right">R$ {serviceFee.toFixed(2)}</td>
                            <td className="py-2 text-right">R$ {serviceFee.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <Separator />

                    {/* Totals */}
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal:</span>
                          <span>R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>Desconto:</span>
                          <span>- R$ 0,00</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium text-lg">
                          <span>Total:</span>
                          <span>R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Payment Info */}
                    <div className="bg-green-50 border border-green-200 rounded p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-900">Pagamento Confirmado</span>
                      </div>
                      <div className="text-sm text-green-800">
                        Pago em 21/10/2025 via Cartão de Crédito •••• 4321
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="text-xs text-gray-500 space-y-1 pt-4 border-t">
                      <div><strong>Observações:</strong></div>
                      <div>• Check-in a partir das 14h00</div>
                      <div>• Check-out até as 12h00</div>
                      <div>• Documento de identidade obrigatório no check-in</div>
                      <div>• Em caso de dúvidas, entre em contato: (21) 98765-4321</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: HISTÓRICO/TIMELINE */}
            <TabsContent value="timeline" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Linha do Tempo da Reserva
                  </CardTitle>
                  <CardDescription>
                    Histórico completo de todas as ações e eventos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Timeline items */}
                    {[
                      { date: '22 out 2025, 10:30', icon: FileText, color: 'blue', title: 'Observação adicionada', desc: 'Maria Silva adicionou uma observação sobre check-in antecipado', user: 'Maria Silva' },
                      { date: '21 out 2025, 14:37', icon: MessageSquare, color: 'green', title: 'Mensagem recebida', desc: 'Juliana confirmou horário de check-in', user: 'Juliana Aparecida' },
                      { date: '21 out 2025, 14:35', icon: MessageSquare, color: 'blue', title: 'Mensagem enviada', desc: 'Você respondeu sobre o check-in', user: 'Você' },
                      { date: '21 out 2025, 14:20', icon: MessageSquare, color: 'green', title: 'Mensagem recebida', desc: 'Juliana perguntou sobre check-in antecipado', user: 'Juliana Aparecida' },
                      { date: '21 out 2025, 09:15', icon: CheckCircle, color: 'green', title: 'Pagamento confirmado', desc: `Pagamento de R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebido via Cartão de Crédito`, user: 'Sistema' },
                      { date: '21 out 2025, 09:00', icon: Link2, color: 'purple', title: 'Link de pagamento enviado', desc: 'Link de pagamento enviado por e-mail e WhatsApp', user: 'Sistema' },
                      { date: '20 out 2025, 18:45', icon: Calendar, color: 'purple', title: 'Reserva confirmada', desc: 'Confirmação automática via Airbnb', user: 'Sistema' },
                      { date: '20 out 2025, 18:40', icon: Calendar, color: 'gray', title: 'Reserva criada', desc: 'Nova reserva recebida de Juliana Aparecida', user: 'Sistema' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center 
                            ${item.color === 'blue' ? 'bg-blue-100' : ''}
                            ${item.color === 'green' ? 'bg-green-100' : ''}
                            ${item.color === 'purple' ? 'bg-purple-100' : ''}
                            ${item.color === 'gray' ? 'bg-gray-100' : ''}
                          `}>
                            <item.icon className={`w-5 h-5 
                              ${item.color === 'blue' ? 'text-blue-600' : ''}
                              ${item.color === 'green' ? 'text-green-600' : ''}
                              ${item.color === 'purple' ? 'text-purple-600' : ''}
                              ${item.color === 'gray' ? 'text-gray-600' : ''}
                            `} />
                          </div>
                          {idx < 7 && <div className="w-0.5 flex-1 bg-gray-200 my-1 min-h-8" />}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <span className="font-medium">{item.title}</span>
                              <span className="text-xs text-gray-500 ml-2">por {item.user}</span>
                            </div>
                            <span className="text-sm text-gray-500">{item.date}</span>
                          </div>
                          <p className="text-sm text-gray-600">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t mt-4 shrink-0 px-2">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
            {reservation.status !== 'cancelled' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (onEdit) {
                      onEdit(reservation);
                    }
                  }}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Reserva
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setCancelModalOpen(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar Reserva
                </Button>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleResendConfirmation}>
              <Mail className="w-4 h-4 mr-2" />
              Reenviar Confirmação
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
              <Receipt className="w-4 h-4 mr-2" />
              Imprimir Fatura
            </Button>
          </div>
        </div>
      </DialogContent>

      <CancelReservationModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        reservation={reservation}
        onCancel={handleCancelReservation}
      />
    </Dialog>
  );
}
