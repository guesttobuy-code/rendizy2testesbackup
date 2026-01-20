/**
 * RENDIZY - Step 2: Seleção de Hóspede
 * Componente para buscar/selecionar/criar hóspede
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Search, Plus, Loader2 } from 'lucide-react';
import type { Guest } from '../../hooks/useReservationForm';

interface StepGuestProps {
  selectedGuest: Guest | null;
  guests: Guest[];
  loadingGuests: boolean;
  onSelectGuest: (guest: Guest) => void;
  onLoadGuests: () => Promise<Guest[]>;
  onCreateGuest: (data: { firstName: string; lastName: string; email: string; phone: string }) => Promise<Guest | null>;
  onNext: () => void;
  onBack: () => void;
}

export function StepGuest({
  selectedGuest,
  guests,
  loadingGuests,
  onSelectGuest,
  onLoadGuests,
  onCreateGuest,
  onNext,
  onBack
}: StepGuestProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // New guest form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Load guests on mount
  useEffect(() => {
    if (guests.length === 0) {
      onLoadGuests();
    }
  }, []);

  const filteredGuests = guests.filter(g =>
    g.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.phone.includes(searchTerm)
  );

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !email || !phone) {
      return;
    }

    setCreating(true);
    const newGuest = await onCreateGuest({ firstName, lastName, email, phone });
    setCreating(false);
    
    if (newGuest) {
      setShowNewForm(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900 font-medium">Buscar Hóspede</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewForm(!showNewForm)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Criar hóspede
        </Button>
      </div>

      {showNewForm ? (
        <form onSubmit={handleCreateGuest} className="p-4 border border-gray-200 rounded-lg space-y-4">
          <h4 className="text-gray-900 font-medium">Novo Hóspede</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Nome *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="João"
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Silva"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao@email.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              required
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewForm(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Hóspede'
              )}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={onLoadGuests}
              disabled={loadingGuests}
              className="w-32"
            >
              <Search className="h-4 w-4 mr-2" />
              {loadingGuests ? 'Pesquisando...' : 'Pesquisar'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Resultados:</Label>
            {loadingGuests ? (
              <div className="flex items-center justify-center p-8 border border-gray-200 rounded-lg">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Carregando...</span>
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="p-8 border border-gray-200 rounded-lg text-center text-gray-600">
                Nenhum hóspede encontrado.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-64 overflow-y-auto">
                {filteredGuests.map(guest => (
                  <button
                    key={guest.id}
                    onClick={() => onSelectGuest(guest)}
                    type="button"
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedGuest?.id === guest.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-gray-900 mb-1">{guest.fullName}</div>
                        <div className="text-sm text-gray-600">{guest.phone}</div>
                        <div className="text-sm text-gray-600">{guest.email}</div>
                      </div>
                      {selectedGuest?.id === guest.id && (
                        <div className="text-blue-600 font-medium">✓ Selecionado</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedGuest}
          className="flex-1"
        >
          Avançar para Confirmação
        </Button>
      </div>
    </div>
  );
}
