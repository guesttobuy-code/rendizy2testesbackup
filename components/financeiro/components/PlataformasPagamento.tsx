/**
 * RENDIZY - Configuração de Plataformas de Pagamento
 * Gerencia as integrações com plataformas de pagamento
 * 
 * @version v1.0.103.1300
 */

import React, { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { CreditCard, Plus, Trash2, Loader2, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

interface PlataformaPagamento {
  id: string;
  nome: string;
  tipo: 'cartao' | 'pix' | 'boleto' | 'outro';
  ativo: boolean;
  chaveApi?: string;
  chaveSecreta?: string;
}

export function PlataformasPagamento() {
  const [loading, setLoading] = useState(false);
  const [plataformas, setPlataformas] = useState<PlataformaPagamento[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'cartao' as 'cartao' | 'pix' | 'boleto' | 'outro',
    chaveApi: '',
    chaveSecreta: '',
  });

  const handleAdd = async () => {
    if (!formData.nome) {
      toast.error('Nome da plataforma é obrigatório');
      return;
    }

    try {
      setLoading(true);
      // TODO: Implementar quando backend tiver endpoint
      const novaPlataforma: PlataformaPagamento = {
        id: Date.now().toString(),
        nome: formData.nome,
        tipo: formData.tipo,
        ativo: true,
        chaveApi: formData.chaveApi || undefined,
        chaveSecreta: formData.chaveSecreta || undefined,
      };

      setPlataformas([...plataformas, novaPlataforma]);
      setFormData({ nome: '', tipo: 'cartao', chaveApi: '', chaveSecreta: '' });
      setIsAdding(false);
      toast.success('Plataforma adicionada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao adicionar plataforma:', err);
      toast.error('Erro ao adicionar plataforma');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setLoading(true);
      // TODO: Implementar quando backend tiver endpoint
      setPlataformas(plataformas.map(p => 
        p.id === id ? { ...p, ativo: !p.ativo } : p
      ));
      toast.success('Status atualizado!');
    } catch (err: any) {
      console.error('Erro ao atualizar plataforma:', err);
      toast.error('Erro ao atualizar plataforma');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta plataforma?')) {
      return;
    }

    try {
      setLoading(true);
      // TODO: Implementar quando backend tiver endpoint
      setPlataformas(plataformas.filter(p => p.id !== id));
      toast.success('Plataforma removida!');
    } catch (err: any) {
      console.error('Erro ao remover plataforma:', err);
      toast.error('Erro ao remover plataforma');
    } finally {
      setLoading(false);
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      cartao: 'Cartão de Crédito',
      pix: 'PIX',
      boleto: 'Boleto',
      outro: 'Outro',
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Plataformas de Pagamento
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure as integrações com plataformas de pagamento
          </p>
        </div>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          variant={isAdding ? 'outline' : 'default'}
        >
          {isAdding ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Plataforma
            </>
          )}
        </Button>
      </div>

      {/* Formulário de Adição */}
      {isAdding && (
        <Card className="p-6 border-2 border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold mb-4">Nova Plataforma de Pagamento</h4>
          <div className="space-y-4">
            <div>
              <Label>Nome da Plataforma</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Stripe, Mercado Pago, PagSeguro..."
              />
            </div>
            <div>
              <Label>Tipo de Pagamento</Label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="cartao">Cartão de Crédito</option>
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <Label>Chave API (opcional)</Label>
              <Input
                type="password"
                value={formData.chaveApi}
                onChange={(e) => setFormData({ ...formData, chaveApi: e.target.value })}
                placeholder="Chave pública da API"
              />
            </div>
            <div>
              <Label>Chave Secreta (opcional)</Label>
              <Input
                type="password"
                value={formData.chaveSecreta}
                onChange={(e) => setFormData({ ...formData, chaveSecreta: e.target.value })}
                placeholder="Chave secreta da API"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Adicionar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setFormData({ nome: '', tipo: 'cartao', chaveApi: '', chaveSecreta: '' });
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Lista de Plataformas */}
      {plataformas.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-2">Nenhuma plataforma configurada</p>
          <p className="text-sm text-gray-400">
            Clique em "Adicionar Plataforma" para começar
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {plataformas.map((plataforma) => (
            <Card key={plataforma.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h4 className="font-semibold">{plataforma.nome}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{getTipoLabel(plataforma.tipo)}</Badge>
                      <Badge variant={plataforma.ativo ? 'default' : 'secondary'}>
                        {plataforma.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(plataforma.id)}
                    disabled={loading}
                  >
                    {plataforma.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(plataforma.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

