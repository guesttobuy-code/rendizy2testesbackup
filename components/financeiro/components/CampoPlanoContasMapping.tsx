/**
 * RENDIZY - Componente de Mapeamento de Campos do Sistema para Plano de Contas
 * Permite amarrar visualmente campos do sistema (ex: taxa de limpeza) a contas do plano de contas
 * Similar a tags - interface visual de amarração
 * 
 * @version v1.0.103.1200
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/card';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Loader2, Link2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { financeiroApi } from '../../../utils/api';

interface CampoMapping {
  id?: string;
  modulo: string;
  campo_codigo: string;
  campo_nome: string;
  campo_tipo: 'receita' | 'despesa';
  categoria_id?: string;
  categoria_nome?: string;
  descricao?: string;
  ativo: boolean;
}

interface ContaContabil {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'receita' | 'despesa' | 'ativo' | 'passivo' | 'resultado';
  natureza: 'credora' | 'devedora';
}

interface CampoPlanoContasMappingProps {
  organizationId: string;
}

export function CampoPlanoContasMapping({ organizationId }: CampoPlanoContasMappingProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [campos, setCampos] = useState<CampoMapping[]>([]);
  const [categorias, setCategorias] = useState<ContaContabil[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      console.log('🔄 [CampoPlanoContasMapping] Carregando dados para organização:', organizationId);
      loadData();
    } else {
      console.warn('⚠️ [CampoPlanoContasMapping] organizationId não fornecido');
      setError('ID da organização não encontrado');
      setLoading(false);
    }
  }, [organizationId]);

  const loadData = async () => {
    if (!organizationId) {
      console.error('❌ [CampoPlanoContasMapping] organizationId não fornecido');
      setError('ID da organização não encontrado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [CampoPlanoContasMapping] Iniciando carregamento de dados...');
      
      // Carregar campos do sistema
      const camposResponse = await financeiroApi.campoMappings.list();
      console.log('📦 [CampoPlanoContasMapping] Resposta campos:', camposResponse);
      
      if (camposResponse.success && camposResponse.data) {
        // Se não houver campos, criar campos padrão
        if (camposResponse.data.length === 0) {
          console.log('⚠️ [CampoPlanoContasMapping] Nenhum campo encontrado. Criando campos padrão...');
          await criarCamposPadrao();
          // Recarregar após criar
          const retryResponse = await financeiroApi.campoMappings.list();
          if (retryResponse.success && retryResponse.data) {
            setCampos(retryResponse.data);
          }
        } else {
          setCampos(camposResponse.data);
        }
      } else {
        console.error('❌ [CampoPlanoContasMapping] Erro ao carregar campos:', camposResponse.error);
        // Tentar criar campos padrão mesmo assim
        await criarCamposPadrao();
      }

      // Carregar categorias do plano de contas
      const categoriasResponse = await financeiroApi.categorias.list();
      console.log('📦 [CampoPlanoContasMapping] Resposta categorias:', categoriasResponse);
      
      if (categoriasResponse.success && categoriasResponse.data) {
        setCategorias(categoriasResponse.data);
      } else {
        console.error('❌ [CampoPlanoContasMapping] Erro ao carregar categorias:', categoriasResponse.error);
      }
    } catch (err: any) {
      console.error('❌ [CampoPlanoContasMapping] Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar mapeamentos');
      toast.error('Erro ao carregar mapeamentos. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  };

  const criarCamposPadrao = async () => {
    try {
      const camposPadrao = [
        { modulo: 'reservas', campo_codigo: 'pricing.baseTotal', campo_nome: 'Receita Base (Diárias)', campo_tipo: 'receita' as const, descricao: 'Valor base das diárias da reserva' },
        { modulo: 'reservas', campo_codigo: 'pricing.cleaningFee', campo_nome: 'Taxa de Limpeza', campo_tipo: 'receita' as const, descricao: 'Taxa de limpeza cobrada do hóspede' },
        { modulo: 'reservas', campo_codigo: 'pricing.serviceFee', campo_nome: 'Taxa de Serviço', campo_tipo: 'receita' as const, descricao: 'Taxa de serviço cobrada do hóspede' },
        { modulo: 'reservas', campo_codigo: 'pricing.taxes', campo_nome: 'Impostos sobre Receita', campo_tipo: 'despesa' as const, descricao: 'Impostos calculados sobre a receita da reserva' },
        { modulo: 'reservas', campo_codigo: 'pricing.discount', campo_nome: 'Desconto Concedido', campo_tipo: 'despesa' as const, descricao: 'Desconto aplicado na reserva' },
      ];

      // Criar campos padrão (sem categoria_id inicialmente)
      for (const campo of camposPadrao) {
        try {
          await financeiroApi.campoMappings.create({
            organization_id: organizationId,
            ...campo,
            categoria_id: undefined, // Será definido depois pelo usuário
          });
        } catch (err: any) {
          // Ignorar erros de duplicata
          if (!err.message?.includes('duplicate') && !err.message?.includes('unique')) {
            console.warn(`⚠️ Erro ao criar campo ${campo.campo_codigo}:`, err);
          }
        }
      }
      
      console.log('✅ [CampoPlanoContasMapping] Campos padrão criados');
    } catch (err: any) {
      console.error('❌ [CampoPlanoContasMapping] Erro ao criar campos padrão:', err);
    }
  };

  const handleSaveMapping = async (campo: CampoMapping) => {
    if (!campo.categoria_id) {
      toast.error('Selecione uma conta do plano de contas');
      return;
    }

    try {
      setSaving(campo.campo_codigo);
      
      if (campo.id) {
        // Atualizar mapeamento existente
        const response = await financeiroApi.campoMappings.update(campo.id, {
          categoria_id: campo.categoria_id,
        });
        
        if (response.success) {
          toast.success(`Mapeamento de "${campo.campo_nome}" salvo!`);
          await loadData();
        } else {
          throw new Error(response.error || 'Erro ao salvar');
        }
      } else {
        // Criar novo mapeamento
        const response = await financeiroApi.campoMappings.create({
          organization_id: organizationId,
          modulo: campo.modulo,
          campo_codigo: campo.campo_codigo,
          campo_nome: campo.campo_nome,
          campo_tipo: campo.campo_tipo,
          categoria_id: campo.categoria_id,
          descricao: campo.descricao,
        });
        
        if (response.success) {
          toast.success(`Mapeamento de "${campo.campo_nome}" criado!`);
          await loadData();
        } else {
          throw new Error(response.error || 'Erro ao criar');
        }
      }
    } catch (err: any) {
      console.error('Erro ao salvar mapeamento:', err);
      toast.error(err.message || 'Erro ao salvar mapeamento');
    } finally {
      setSaving(null);
    }
  };

  const handleRemoveMapping = async (campo: CampoMapping) => {
    if (!campo.id || !campo.categoria_id) return;

    if (!confirm(`Tem certeza que deseja remover o mapeamento de "${campo.campo_nome}"?`)) {
      return;
    }

    try {
      setSaving(campo.campo_codigo);
      
      // Remover categoria_id (desvincular) ao invés de deletar o campo
      const response = await financeiroApi.campoMappings.update(campo.id, {
        categoria_id: null,
      });
      
      if (response.success) {
        toast.success(`✅ Mapeamento de "${campo.campo_nome}" removido!`);
        await loadData();
      } else {
        throw new Error(response.error || 'Erro ao remover');
      }
    } catch (err: any) {
      console.error('❌ [CampoPlanoContasMapping] Erro ao remover mapeamento:', err);
      toast.error(err.message || 'Erro ao remover mapeamento');
    } finally {
      setSaving(null);
    }
  };

  const updateCampoMapping = (campoCodigo: string, updates: Partial<CampoMapping>) => {
    setCampos(prev => prev.map(campo => 
      campo.campo_codigo === campoCodigo 
        ? { ...campo, ...updates }
        : campo
    ));
  };

  const getCategoriasFiltradas = (tipo: 'receita' | 'despesa') => {
    return categorias.filter(cat => {
      if (tipo === 'receita') {
        return cat.tipo === 'receita';
      } else {
        return cat.tipo === 'despesa';
      }
    });
  };

  const camposFiltrados = filtroTipo === 'todos' 
    ? campos 
    : campos.filter(c => c.campo_tipo === filtroTipo);

  if (!organizationId) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-red-500 mb-2">Erro: ID da organização não encontrado</p>
          <p className="text-sm text-gray-400">
            Por favor, faça login novamente ou contate o suporte.
          </p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Carregando mapeamentos...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-red-500 mb-2">Erro ao carregar mapeamentos</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <Button onClick={loadData} variant="outline" size="sm">
            Tentar Novamente
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Link2 className="h-5 w-5 text-green-600" />
          Mapeamento de Campos do Sistema
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Amarre campos do sistema (ex: Taxa de Limpeza, Taxa de Serviço) a contas do plano de contas.
          Quando uma reserva for criada, os valores serão automaticamente lançados nas contas mapeadas.
        </p>

        {/* Filtro por tipo */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={filtroTipo === 'todos' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltroTipo('todos')}
          >
            Todos
          </Button>
          <Button
            variant={filtroTipo === 'receita' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltroTipo('receita')}
          >
            Receitas
          </Button>
          <Button
            variant={filtroTipo === 'despesa' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltroTipo('despesa')}
          >
            Despesas
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {camposFiltrados.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              Nenhum campo encontrado.
            </p>
            <Button
              onClick={async () => {
                setLoading(true);
                await criarCamposPadrao();
                await loadData();
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando campos...
                </>
              ) : (
                'Criar Campos Padrão'
              )}
            </Button>
          </div>
        ) : (
          camposFiltrados.map((campo) => {
            const categoriasDisponiveis = getCategoriasFiltradas(campo.campo_tipo);
            const isSaving = saving === campo.campo_codigo;

            return (
              <div
                key={campo.campo_codigo}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {/* Campo do Sistema */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label className="font-semibold">{campo.campo_nome}</Label>
                    <Badge variant={campo.campo_tipo === 'receita' ? 'default' : 'destructive'}>
                      {campo.campo_tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {campo.modulo} • {campo.campo_codigo}
                  </p>
                  {campo.descricao && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {campo.descricao}
                    </p>
                  )}
                </div>

                {/* Seta de ligação */}
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-gray-400" />
                </div>

                {/* Conta do Plano de Contas */}
                <div className="flex-1">
                  <Select
                    value={campo.categoria_id || 'none'}
                    onValueChange={(value) => {
                      if (value !== 'none') {
                        updateCampoMapping(campo.campo_codigo, { categoria_id: value });
                      }
                    }}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione uma conta..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma conta selecionada</SelectItem>
                      {categoriasDisponiveis.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id}>
                          {categoria.codigo} - {categoria.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {campo.categoria_nome && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ {campo.categoria_nome}
                    </p>
                  )}
                </div>

                {/* Botões de ação */}
                <div className="flex gap-2">
                  <Button
                    variant={campo.categoria_id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSaveMapping(campo)}
                    disabled={isSaving || !campo.categoria_id}
                    title={!campo.categoria_id ? "Selecione uma conta primeiro" : "Salvar mapeamento"}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        {campo.categoria_id ? 'Salvar' : 'Salvar'}
                      </>
                    )}
                  </Button>
                  {campo.id && campo.categoria_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMapping(campo)}
                      disabled={isSaving}
                      title="Remover mapeamento"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

