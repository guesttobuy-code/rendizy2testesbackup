import React, { useState, useEffect } from 'react';
import {
  User,
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Star,
  X,
  Edit,
  Trash2,
  History,
  Upload,
  Download,
  Filter,
  SlidersHorizontal,
  Loader2
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';
import { guestsApi, type Guest as ApiGuest, type CreateGuestDTO } from '../utils/guestsApi';
import { useLanguage } from '../contexts/LanguageContext';
import { useDebounce } from '../hooks/useDebounce';

// ============================================
// TYPES
// ============================================

// Use API type
export type Guest = ApiGuest;

interface GuestFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cpf?: string;
  passport?: string;
  rg?: string;
  nationality?: string;
  birthDate?: string;
  notes?: string;
  // Address fields (simplified for now)
  city?: string;
  country?: string;
}

// No mock data - using real API

// ============================================
// GUEST CARD COMPONENT
// ============================================

interface GuestCardProps {
  guest: Guest;
  onEdit: (guest: Guest) => void;
  onDelete: (guestId: string) => void;
  onViewHistory: (guest: Guest) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const GuestCard: React.FC<GuestCardProps> = ({ guest, onEdit, onDelete, onViewHistory, t }) => {
  const getRatingStars = (rating?: number) => {
    if (!rating) return null;
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {getInitials(guest.fullName)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-gray-900 dark:text-white truncate">
                  {guest.fullName}
                </h3>
                {guest.stats.averageRating && (
                  <div className="flex items-center gap-1 mt-1">
                    {getRatingStars(guest.stats.averageRating)}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onViewHistory(guest)}
                >
                  <History className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(guest)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600"
                  onClick={() => onDelete(guest.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Contact */}
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Mail className="h-3 w-3" />
                <span className="truncate">{guest.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Phone className="h-3 w-3" />
                <span>{guest.phone}</span>
              </div>
              {guest.address && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="h-3 w-3" />
                  <span>{guest.address.city}, {guest.address.country}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="mt-3 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  {t('guests.reservations', { count: guest.stats.totalReservations })}
                </span>
              </div>
              <Separator orientation="vertical" className="h-3" />
              <div className="text-gray-600 dark:text-gray-400">
                R$ {(guest.stats.totalSpent / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              {guest.stats.lastStayDate && (
                <>
                  <Separator orientation="vertical" className="h-3" />
                  <div className="text-gray-600 dark:text-gray-400">
                    {t('guests.lastStay')}: {new Date(guest.stats.lastStayDate).toLocaleDateString('pt-BR')}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// GUEST FORM MODAL
// ============================================

interface GuestFormModalProps {
  open: boolean;
  onClose: () => void;
  guest?: Guest | null;
  onSave: (data: GuestFormData) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const GuestFormModal: React.FC<GuestFormModalProps> = ({ open, onClose, guest, onSave, t }) => {
  const [formData, setFormData] = useState<GuestFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cpf: '',
    passport: '',
    rg: '',
    nationality: '',
    country: '',
    city: '',
    birthDate: '',
    notes: ''
  });

  useEffect(() => {
    if (guest) {
      setFormData({
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone,
        cpf: guest.cpf || '',
        passport: guest.passport || '',
        rg: guest.rg || '',
        nationality: guest.nationality || '',
        country: guest.address?.country || '',
        city: guest.address?.city || '',
        birthDate: guest.birthDate || '',
        notes: guest.notes || ''
      });
    } else {
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        cpf: '',
        passport: '',
        rg: '',
        nationality: '',
        country: '',
        city: '',
        birthDate: '',
        notes: ''
      });
    }
  }, [guest, open]);

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error(t('guests.fillRequired'));
      return;
    }

    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {guest ? t('guests.editGuest') : t('guests.newGuest')}
          </DialogTitle>
          <DialogDescription>
            {guest
              ? t('guests.updateInfo')
              : t('guests.registerNew')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações Básicas */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {t('guestForm.basicInfo')}
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">{t('guestForm.firstName')} *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="João"
                />
              </div>

              <div>
                <Label htmlFor="lastName">{t('guestForm.lastName')} *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Silva"
                />
              </div>

              <div>
                <Label htmlFor="email">{t('guestForm.email')} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="joao@email.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">{t('guestForm.phone')} *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+55 11 98765-4321"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Documentação */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {t('guestForm.documentation')}
            </h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="cpf">{t('guestForm.cpf')}</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="123.456.789-00"
                />
              </div>

              <div>
                <Label htmlFor="rg">{t('guestForm.rg')}</Label>
                <Input
                  id="rg"
                  value={formData.rg}
                  onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                  placeholder="12.345.678-9"
                />
              </div>

              <div>
                <Label htmlFor="passport">{t('guestForm.passport')}</Label>
                <Input
                  id="passport"
                  value={formData.passport}
                  onChange={(e) => setFormData({ ...formData, passport: e.target.value })}
                  placeholder="AB123456"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="birthDate">{t('guestForm.birthDate')}</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="nationality">{t('guestForm.nationality')}</Label>
                <Input
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  placeholder="Brasileiro"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Endereço */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {t('guestForm.address')}
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="city">{t('guestForm.city')}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="São Paulo"
                />
              </div>

              <div>
                <Label htmlFor="country">{t('guestForm.country')}</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Brasil"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('guestForm.addressComingSoon')}
            </p>
          </div>

          <Separator />

          {/* Observações */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {t('guestForm.notes')}
            </h4>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('guestForm.notesPlaceholder')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit}>
            {guest ? t('common.save') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export function GuestsManager() {
  const { t } = useLanguage();
  
  // State
  const [guests, setGuests] = useState<Guest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [guestForHistory, setGuestForHistory] = useState<Guest | null>(null);
  const [historyReservations, setHistoryReservations] = useState<any[]>([]);

  // Load guests on mount
  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    setIsLoading(true);
    try {
      const result = await guestsApi.list();
      if (result.success && result.data) {
        setGuests(result.data);
      } else {
        toast.error(t('guests.loadError'), {
          description: result.error
        });
      }
    } catch (error) {
      console.error('Error loading guests:', error);
      toast.error(t('guests.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search para melhor performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Filtros
  const filteredGuests = guests.filter(guest => {
    const searchLower = debouncedSearchQuery.toLowerCase();
    return (
      guest.fullName.toLowerCase().includes(searchLower) ||
      guest.email.toLowerCase().includes(searchLower) ||
      guest.phone.includes(debouncedSearchQuery) ||
      guest.cpf?.includes(debouncedSearchQuery) ||
      guest.address?.city?.toLowerCase().includes(searchLower)
    );
  });

  // Handlers
  const handleCreate = () => {
    setSelectedGuest(null);
    setShowFormModal(true);
  };

  const handleEdit = (guest: Guest) => {
    setSelectedGuest(guest);
    setShowFormModal(true);
  };

  const handleDelete = async (guestId: string) => {
    if (!confirm(t('guests.deleteConfirm'))) {
      return;
    }

    try {
      const result = await guestsApi.delete(guestId);
      if (result.success) {
        setGuests(guests.filter(g => g.id !== guestId));
        toast.success(t('guests.deleteSuccess'));
      } else {
        toast.error(t('guests.deleteError'), {
          description: result.error
        });
      }
    } catch (error) {
      console.error('Error deleting guest:', error);
      toast.error(t('guests.deleteError'));
    }
  };

  const handleViewHistory = async (guest: Guest) => {
    setGuestForHistory(guest);
    setShowHistoryModal(true);
    
    // Load history
    try {
      const result = await guestsApi.getHistory(guest.id);
      if (result.success && result.data) {
        setHistoryReservations(result.data.reservations);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleSave = async (data: GuestFormData) => {
    try {
      if (selectedGuest) {
        // Update existing guest
        const result = await guestsApi.update(selectedGuest.id, {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          cpf: data.cpf,
          passport: data.passport,
          rg: data.rg,
          nationality: data.nationality,
          birthDate: data.birthDate,
          notes: data.notes,
        });

        if (result.success && result.data) {
          setGuests(guests.map(g => g.id === selectedGuest.id ? result.data! : g));
          toast.success(t('guests.updateSuccess'));
        } else {
          toast.error(t('guests.updateError'), {
            description: result.error
          });
        }
      } else {
        // Create new guest
        const createData: CreateGuestDTO = {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          cpf: data.cpf,
          passport: data.passport,
          rg: data.rg,
          nationality: data.nationality,
          birthDate: data.birthDate,
          notes: data.notes,
        };

        const result = await guestsApi.create(createData);
        
        if (result.success && result.data) {
          setGuests([...guests, result.data]);
          toast.success(t('guests.createSuccess'));
        } else {
          toast.error(t('guests.createError'), {
            description: result.error
          });
        }
      }
    } catch (error) {
      console.error('Error saving guest:', error);
      toast.error(selectedGuest ? t('guests.updateError') : t('guests.createError'));
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl text-gray-900 dark:text-white">
              {t('guests.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('guests.subtitle')}
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('guests.new')}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('guests.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="text-gray-600 dark:text-gray-400">
            {t('guests.total')}: <span className="text-gray-900 dark:text-white">{guests.length}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="text-gray-600 dark:text-gray-400">
            {t('guests.filtered')}: <span className="text-gray-900 dark:text-white">{filteredGuests.length}</span>
          </div>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredGuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <User className="h-12 w-12 mb-2 opacity-50" />
            <p>{t('guests.noResults')}</p>
            {searchQuery && (
              <Button
                variant="link"
                onClick={() => setSearchQuery('')}
                className="mt-2"
              >
                {t('guests.clearSearch')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredGuests.map(guest => (
              <GuestCard
                key={guest.id}
                guest={guest}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewHistory={handleViewHistory}
                t={t}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Form Modal */}
      <GuestFormModal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        guest={selectedGuest}
        onSave={handleSave}
        t={t}
      />

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('history.title')}</DialogTitle>
            <DialogDescription>
              {guestForHistory?.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {historyReservations.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                {t('history.noReservations')}
              </p>
            ) : (
              <div className="space-y-3">
                {historyReservations.map((reservation) => (
                  <Card key={reservation.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {reservation.code}
                            </Badge>
                            <Badge className={
                              reservation.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }>
                              {reservation.status === 'confirmed' && t('history.status.confirmed')}
                              {reservation.status === 'pending' && t('history.status.pending')}
                              {reservation.status === 'cancelled' && t('history.status.cancelled')}
                            </Badge>
                          </div>
                          <div className="text-sm space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-gray-500" />
                              <span>
                                {new Date(reservation.checkIn).toLocaleDateString('pt-BR')} - {new Date(reservation.checkOut).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="text-gray-500">({t('history.nights', { count: reservation.nights })})</span>
                            </div>
                            {reservation.propertyName && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-gray-500" />
                                <span>{reservation.propertyName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-900 dark:text-white">
                            R$ {(reservation.pricing?.totalAmount / 100 || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {reservation.platform || 'Direct'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
