/**
 * Modal para criar usuário a partir de um Contato
 * Transforma contato (ex: proprietário) em usuário com acesso ao sistema
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Checkbox } from '../../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Alert, AlertDescription } from '../../ui/alert';
import { toast } from 'sonner';
import { Loader2, UserPlus, Mail, AlertTriangle, Check } from 'lucide-react';
import { CrmContact } from '../../../src/utils/api-crm-contacts';

interface CreateUserFromContactModalProps {
  contact: CrmContact | null;
  onClose: () => void;
  onSuccess: () => void;
}

const USER_ROLES = [
  { value: 'proprietario', label: 'Proprietário', description: 'Acesso limitado aos seus imóveis e relatórios' },
  { value: 'colaborador', label: 'Colaborador', description: 'Acesso de leitura geral' },
  { value: 'gestor', label: 'Gestor', description: 'Acesso completo (sem admin)' },
];

export function CreateUserFromContactModal({
  contact,
  onClose,
  onSuccess,
}: CreateUserFromContactModalProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('proprietario');
  const [sendInvite, setSendInvite] = useState(true);

  // Quando o modal abre, preencher email do contato
  React.useEffect(() => {
    if (contact?.email) {
      setEmail(contact.email);
    }
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    if (!contact) return;

    setLoading(true);
    try {
      // Chamar API para criar usuário a partir do contato
      // TODO: Implementar endpoint no backend
      const response = await fetch('/api/users/from-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contact.id,
          email,
          role,
          send_invite: sendInvite,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar usuário');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  if (!contact) return null;

  return (
    <Dialog open={!!contact} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Criar Acesso ao Sistema
          </DialogTitle>
          <DialogDescription>
            Transformar <strong>{contact.full_name}</strong> em usuário do Rendizy
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Alerta informativo */}
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              Ao criar um usuário, este contato poderá acessar o sistema Rendizy
              com as permissões definidas abaixo.
            </AlertDescription>
          </Alert>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email de acesso *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
            />
            {contact.email && contact.email !== email && (
              <p className="text-xs text-amber-600">
                ⚠️ Email diferente do cadastro do contato ({contact.email})
              </p>
            )}
          </div>

          {/* Perfil/Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Perfil de acesso *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o perfil" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    <div>
                      <span className="font-medium">{r.label}</span>
                      <p className="text-xs text-gray-500">{r.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Enviar convite */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendInvite"
              checked={sendInvite}
              onCheckedChange={(checked) => setSendInvite(checked as boolean)}
            />
            <Label htmlFor="sendInvite" className="text-sm cursor-pointer">
              Enviar email de convite para definir senha
            </Label>
          </div>

          {!sendInvite && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Sem o email de convite, você precisará definir uma senha manualmente
                ou o usuário não conseguirá acessar o sistema.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {sendInvite ? 'Criar e Enviar Convite' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
