/**
 * RENDIZY - Mapeamento Visual de Campos do Sistema x Plano de Contas
 * Interface visual com dois painéis: campos do sistema (esquerda) e contas (direita)
 * Funciona similar a tags - busca e amarração visual
 * 
 * @version v1.0.103.1400
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Separator } from '../../ui/separator';
import { Checkbox } from '../../ui/checkbox';
import { Loader2, Search, Link2, X, CheckCircle2, AlertCircle, Check, Edit2, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../ui/alert-dialog';
import { toast } from 'sonner';
import { financeiroApi } from '../../../utils/api';

interface SistemaCampo {
  id: string;
  modulo: string;
  campo_codigo: string;
  campo_nome: string;
  campo_tipo: 'receita' | 'despesa';
  descricao?: string;
  categoria_id?: string;
  categoria_nome?: string;
  categoria_codigo?: string;
}

interface ContaContabil {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'receita' | 'despesa' | 'ativo' | 'passivo' | 'resultado';
  natureza: 'credora' | 'devedora';
  parentId?: string;
  nivel?: number;
}

interface CampoPlanoContasMappingVisualProps {
  organizationId: string;
}

/**
 * Lista completa de campos financeiros do sistema
 */
const CAMPOS_SISTEMA: Omit<SistemaCampo, 'categoria_id' | 'categoria_nome' | 'categoria_codigo'>[] = [
  // ========== RESERVAS ==========
  {
    id: 'reservas.pricing.baseTotal',
    modulo: 'reservas',
    campo_codigo: 'pricing.baseTotal',
    campo_nome: 'Receita Base (Diárias)',
    campo_tipo: 'receita',
    descricao: 'Valor base das diárias da reserva',
  },
  {
    id: 'reservas.pricing.pricePerNight',
    modulo: 'reservas',
    campo_codigo: 'pricing.pricePerNight',
    campo_nome: 'Preço por Noite',
    campo_tipo: 'receita',
    descricao: 'Valor cobrado por noite',
  },
  {
    id: 'reservas.pricing.cleaningFee',
    modulo: 'reservas',
    campo_codigo: 'pricing.cleaningFee',
    campo_nome: 'Taxa de Limpeza',
    campo_tipo: 'receita',
    descricao: 'Taxa de limpeza cobrada do hóspede',
  },
  {
    id: 'reservas.pricing.serviceFee',
    modulo: 'reservas',
    campo_codigo: 'pricing.serviceFee',
    campo_nome: 'Taxa de Serviço',
    campo_tipo: 'receita',
    descricao: 'Taxa de serviço cobrada do hóspede',
  },
  {
    id: 'reservas.pricing.taxes',
    modulo: 'reservas',
    campo_codigo: 'pricing.taxes',
    campo_nome: 'Impostos sobre Receita',
    campo_tipo: 'despesa',
    descricao: 'Impostos calculados sobre a receita da reserva',
  },
  {
    id: 'reservas.pricing.discount',
    modulo: 'reservas',
    campo_codigo: 'pricing.discount',
    campo_nome: 'Desconto Concedido',
    campo_tipo: 'despesa',
    descricao: 'Desconto aplicado na reserva',
  },
  {
    id: 'reservas.pricing.total',
    modulo: 'reservas',
    campo_codigo: 'pricing.total',
    campo_nome: 'Total da Reserva',
    campo_tipo: 'receita',
    descricao: 'Valor total final da reserva',
  },
  
  // ========== PROPRIEDADES ==========
  {
    id: 'propriedades.pricing.basePrice',
    modulo: 'propriedades',
    campo_codigo: 'pricing.basePrice',
    campo_nome: 'Preço Base da Propriedade',
    campo_tipo: 'receita',
    descricao: 'Preço base por noite da propriedade',
  },
  {
    id: 'propriedades.pricing.cleaningFee',
    modulo: 'propriedades',
    campo_codigo: 'pricing.cleaningFee',
    campo_nome: 'Taxa de Limpeza (Propriedade)',
    campo_tipo: 'receita',
    descricao: 'Taxa de limpeza configurada na propriedade',
  },
  {
    id: 'propriedades.pricing.extraGuestFee',
    modulo: 'propriedades',
    campo_codigo: 'pricing.extraGuestFee',
    campo_nome: 'Taxa por Hóspede Extra',
    campo_tipo: 'receita',
    descricao: 'Taxa cobrada por hóspede adicional',
  },
  {
    id: 'propriedades.pricing.weeklyDiscount',
    modulo: 'propriedades',
    campo_codigo: 'pricing.weeklyDiscount',
    campo_nome: 'Desconto Semanal',
    campo_tipo: 'despesa',
    descricao: 'Percentual de desconto para estadias semanais',
  },
  {
    id: 'propriedades.pricing.monthlyDiscount',
    modulo: 'propriedades',
    campo_codigo: 'pricing.monthlyDiscount',
    campo_nome: 'Desconto Mensal',
    campo_tipo: 'despesa',
    descricao: 'Percentual de desconto para estadias mensais',
  },
  
  // ========== AIRBNB / PLATAFORMAS ==========
  {
    id: 'reservas.platform.airbnb',
    modulo: 'reservas',
    campo_codigo: 'platform.airbnb',
    campo_nome: 'Reserva Airbnb',
    campo_tipo: 'receita',
    descricao: 'Receita proveniente de reservas do Airbnb',
  },
  {
    id: 'reservas.platform.booking',
    modulo: 'reservas',
    campo_codigo: 'platform.booking',
    campo_nome: 'Reserva Booking.com',
    campo_tipo: 'receita',
    descricao: 'Receita proveniente de reservas do Booking.com',
  },
  {
    id: 'reservas.platform.direct',
    modulo: 'reservas',
    campo_codigo: 'platform.direct',
    campo_nome: 'Reserva Direta',
    campo_tipo: 'receita',
    descricao: 'Receita proveniente de reservas diretas',
  },
  
  // ========== PAGAMENTOS ==========
  {
    id: 'reservas.payment.commission',
    modulo: 'reservas',
    campo_codigo: 'payment.commission',
    campo_nome: 'Comissão da Plataforma',
    campo_tipo: 'despesa',
    descricao: 'Comissão cobrada pela plataforma (Airbnb, Booking, etc)',
  },
  {
    id: 'reservas.payment.refund',
    modulo: 'reservas',
    campo_codigo: 'payment.refund',
    campo_nome: 'Reembolso',
    campo_tipo: 'despesa',
    descricao: 'Valor reembolsado ao hóspede',
  },
];

export function CampoPlanoContasMappingVisual({ organizationId }: CampoPlanoContasMappingVisualProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [campos, setCampos] = useState<SistemaCampo[]>([]);
  const [categorias, setCategorias] = useState<ContaContabil[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [filtroModulo, setFiltroModulo] = useState<string>('todos');
  const [campoFixado, setCampoFixado] = useState<string | null>(null); // Campo fixado para mapeamento
  const [showModalBusca, setShowModalBusca] = useState(false); // Modal de busca de conta
  const [buscaConta, setBuscaConta] = useState(''); // Texto de busca no modal
  const [contaSelecionadaModal, setContaSelecionadaModal] = useState<string | null>(null); // Conta selecionada no modal
  const [showConfirmacaoEdicao, setShowConfirmacaoEdicao] = useState(false); // Modal de dupla confirmação para edição
  const [campoParaEditar, setCampoParaEditar] = useState<SistemaCampo | null>(null); // Campo que será editado

  useEffect(() => {
    loadData();
  }, [organizationId]);

  // ✅ Filtrar apenas subcategorias (não raízes mãe)
  // Subcategorias: nivel >= 2 ou parentId IS NOT NULL
  const subcategorias = useMemo(() => {
    const filtered = categorias.filter(cat => 
      (cat.nivel && cat.nivel >= 2) || 
      (cat.parentId !== null && cat.parentId !== undefined)
    );
    console.log('🔍 [MappingVisual] Total categorias:', categorias.length);
    console.log('🔍 [MappingVisual] Subcategorias filtradas:', filtered.length);
    console.log('🔍 [MappingVisual] Exemplo de categoria:', categorias[0]);
    return filtered;
  }, [categorias]);

  const loadData = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // ✅ NOVO: Buscar campos dinamicamente do banco (inclui campos do sistema registrados)
      const camposResponse = await financeiroApi.campoMappings.list();
      console.log('📦 [MappingVisual] Campos do banco:', camposResponse);

      if (camposResponse.success && camposResponse.data) {
        // Converter campos do banco para formato SistemaCampo
        const camposDoBanco: SistemaCampo[] = camposResponse.data.map((m: any) => ({
          id: m.id || `${m.modulo}.${m.campo_codigo}`,
          modulo: m.modulo,
          campo_codigo: m.campo_codigo,
          campo_nome: m.campo_nome,
          campo_tipo: m.campo_tipo,
          descricao: m.descricao,
          categoria_id: m.categoria_id,
          categoria_nome: m.categoria_nome,
          categoria_codigo: m.categoria_codigo,
        }));

        // ✅ Mesclar com campos hardcoded (fallback para compatibilidade)
        // Se um campo do CAMPOS_SISTEMA não estiver no banco, adicionar
        const camposHardcodedNaoNoBanco = CAMPOS_SISTEMA.filter(campoHardcoded => 
          !camposDoBanco.some(campoBanco => 
            campoBanco.modulo === campoHardcoded.modulo && 
            campoBanco.campo_codigo === campoHardcoded.campo_codigo
          )
        ).map(campo => ({
          ...campo,
          categoria_id: undefined,
          categoria_nome: undefined,
          categoria_codigo: undefined,
        }));

        const todosCampos = [...camposDoBanco, ...camposHardcodedNaoNoBanco];
        setCampos(todosCampos);
        console.log('✅ [MappingVisual] Total campos carregados:', todosCampos.length);
        
        // ✅ DEBUG: Log campos de integracoes
        const camposIntegracoes = todosCampos.filter(c => c.modulo === 'integracoes');
        console.log('🔍 [MappingVisual] Campos de integracoes encontrados:', camposIntegracoes.length);
        if (camposIntegracoes.length > 0) {
          camposIntegracoes.forEach(c => {
            console.log(`  ✅ ${c.campo_codigo}: ${c.campo_nome} (${c.campo_tipo})`);
          });
        } else {
          console.warn('⚠️ [MappingVisual] Nenhum campo de integracoes encontrado!');
        }
      } else {
        // Fallback: usar apenas campos hardcoded se API falhar
        console.warn('⚠️ [MappingVisual] API falhou, usando campos hardcoded como fallback');
        const camposFallback: SistemaCampo[] = CAMPOS_SISTEMA.map(campo => ({
          ...campo,
          categoria_id: undefined,
          categoria_nome: undefined,
          categoria_codigo: undefined,
        }));
        setCampos(camposFallback);
      }

      // Carregar categorias do plano de contas
      const categoriasResponse = await financeiroApi.categorias.list();
      console.log('📦 [MappingVisual] Categorias Response:', categoriasResponse);
      console.log('📦 [MappingVisual] Success:', categoriasResponse.success);
      console.log('📦 [MappingVisual] Data:', categoriasResponse.data);
      console.log('📦 [MappingVisual] Data length:', categoriasResponse.data?.length);
      
      if (categoriasResponse.success && categoriasResponse.data) {
        console.log('✅ [MappingVisual] Definindo categorias:', categoriasResponse.data.length, 'categorias');
        setCategorias(categoriasResponse.data);
      } else {
        console.error('❌ [MappingVisual] Erro ao carregar categorias:', categoriasResponse.error);
        console.error('❌ [MappingVisual] Response completa:', categoriasResponse);
        toast.error(`Erro ao carregar categorias: ${categoriasResponse.error || 'Erro desconhecido'}`);
      }
    } catch (err: any) {
      console.error('❌ [MappingVisual] Erro ao carregar dados:', err);
      toast.error('Erro ao carregar mapeamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleMapCampo = async (campo: SistemaCampo, categoriaId: string, isEdit: boolean = false) => {
    if (!organizationId) return;

    try {
      setSaving(campo.id);
      console.log('🔗 [handleMapCampo] Iniciando mapeamento:', { campo: campo.campo_nome, categoriaId, isEdit });

      const categoria = categorias.find(c => c.id === categoriaId);
      if (!categoria) {
        throw new Error('Categoria não encontrada');
      }

      // ✅ CORREÇÃO: Sempre buscar mapeamento existente na API primeiro
      const mappingsResponse = await financeiroApi.campoMappings.list();
      console.log('📦 [handleMapCampo] Mapeamentos da API:', mappingsResponse);
      
      const existingMapping = mappingsResponse.data?.find(
        (m: any) => m.modulo === campo.modulo && m.campo_codigo === campo.campo_codigo
      );

      console.log('🔍 [handleMapCampo] Mapeamento existente encontrado:', existingMapping);

      let response;
      if (existingMapping?.id) {
        // ✅ Atualizar mapeamento existente
        console.log('🔄 [handleMapCampo] Atualizando mapeamento existente:', existingMapping.id);
        response = await financeiroApi.campoMappings.update(existingMapping.id, {
          categoria_id: categoriaId,
        });
      } else {
        // ✅ Criar novo mapeamento
        console.log('➕ [handleMapCampo] Criando novo mapeamento');
        response = await financeiroApi.campoMappings.create({
          organization_id: organizationId,
          modulo: campo.modulo,
          campo_codigo: campo.campo_codigo,
          campo_nome: campo.campo_nome,
          campo_tipo: campo.campo_tipo,
          categoria_id: categoriaId,
          descricao: campo.descricao,
        });
      }

      console.log('📥 [handleMapCampo] Resposta da API:', response);

      if (response.success) {
        // Atualizar estado local
        setCampos(prev => prev.map(c => 
          c.id === campo.id 
            ? { 
                ...c, 
                categoria_id: categoriaId,
                categoria_nome: categoria.nome,
                categoria_codigo: categoria.codigo,
              }
            : c
        ));
        toast.success(
          isEdit 
            ? `✅ "${campo.campo_nome}" atualizado para "${categoria.nome}"`
            : `✅ "${campo.campo_nome}" mapeado para "${categoria.nome}"`
        );
        // Recarregar dados para garantir sincronização
        await loadData();
      } else {
        console.error('❌ [handleMapCampo] Erro na resposta:', response);
        throw new Error(response.error || 'Erro ao salvar');
      }
    } catch (err: any) {
      console.error('❌ [handleMapCampo] Erro ao mapear campo:', err);
      toast.error(err.message || 'Erro ao mapear campo');
    } finally {
      setSaving(null);
    }
  };

  const handleUnmapCampo = async (campo: SistemaCampo) => {
    if (!campo.categoria_id) return;

    try {
      setSaving(campo.id);

      // Buscar ID do mapeamento
      const mappingsResponse = await financeiroApi.campoMappings.list();
      const existingMapping = mappingsResponse.data?.find(
        (m: any) => m.modulo === campo.modulo && m.campo_codigo === campo.campo_codigo
      );

      if (existingMapping?.id) {
        const response = await financeiroApi.campoMappings.update(existingMapping.id, {
          categoria_id: null,
        });

        if (response.success) {
          setCampos(prev => prev.map(c => 
            c.id === campo.id 
              ? { ...c, categoria_id: undefined, categoria_nome: undefined, categoria_codigo: undefined }
              : c
          ));
          toast.success(`✅ Mapeamento de "${campo.campo_nome}" removido`);
        }
      }
    } catch (err: any) {
      console.error('Erro ao remover mapeamento:', err);
      toast.error('Erro ao remover mapeamento');
    } finally {
      setSaving(null);
    }
  };

  // ✅ Funcionalidade similar a tags de fotos: clicar no campo fixa ele e abre modal de busca
  const handleClickCampo = (campoId: string) => {
    console.log('🔍 [handleClickCampo] Campo clicado:', campoId);
    const campo = campos.find(c => c.id === campoId);
    if (!campo) {
      console.warn('⚠️ [handleClickCampo] Campo não encontrado:', campoId);
      return;
    }

    console.log('📋 [handleClickCampo] Campo encontrado:', campo.campo_nome, 'Mapeado:', !!campo.categoria_id);

    // Se já está mapeado, permite editar (abre modal para trocar conta)
    if (campo.categoria_id) {
      console.log('ℹ️ [handleClickCampo] Campo já mapeado, abrindo modal de edição');
      setCampoParaEditar(campo);
      setShowConfirmacaoEdicao(true);
      return;
    }

    // Fixar campo e abrir modal de busca
    console.log('✅ [handleClickCampo] Fixando campo e abrindo modal...');
    setCampoFixado(campoId);
    setBuscaConta('');
    setContaSelecionadaModal(null);
    setShowModalBusca(true);
    console.log('✅ [handleClickCampo] Modal deve estar aberto agora. showModalBusca:', true);
  };

  // Fechar modal e desfixar campo
  const handleCancelarModal = () => {
    setShowModalBusca(false);
    setCampoFixado(null);
    setBuscaConta('');
    setContaSelecionadaModal(null);
  };

  // Confirmar mapeamento
  const handleConfirmarMapeamento = async () => {
    if (!campoFixado || !contaSelecionadaModal) {
      toast.error('Selecione uma conta para mapear');
      return;
    }

    const campo = campos.find(c => c.id === campoFixado);
    const categoria = subcategorias.find(c => c.id === contaSelecionadaModal);

    if (!campo || !categoria) {
      toast.error('Campo ou conta não encontrados');
      return;
    }

    // Verificar compatibilidade de tipo
    const isCompatible = campo.campo_tipo === categoria.tipo || 
                        categoria.tipo === 'resultado' ||
                        (campo.campo_tipo === 'receita' && categoria.tipo === 'receita') ||
                        (campo.campo_tipo === 'despesa' && categoria.tipo === 'despesa');

    if (!isCompatible) {
      toast.error(`Tipo incompatível: Campo de ${campo.campo_tipo} não pode ser mapeado para categoria de ${categoria.tipo}.`);
      return;
    }

    // Verificar se é edição (campo já mapeado)
    const isEdit = !!campo.categoria_id;

    // Fazer o mapeamento
    await handleMapCampo(campo, categoria.id, isEdit);
    
    // Fechar modal e limpar
    handleCancelarModal();
  };

  // Confirmar edição após dupla confirmação
  const handleConfirmarEdicao = () => {
    if (!campoParaEditar) return;
    
    // Fechar modal de confirmação
    setShowConfirmacaoEdicao(false);
    
    // Fixar campo e abrir modal de busca
    setCampoFixado(campoParaEditar.id);
    setBuscaConta('');
    setContaSelecionadaModal(null);
    setShowModalBusca(true);
    setCampoParaEditar(null);
  };

  // Filtrar campos
  const camposFiltrados = useMemo(() => {
    return campos.filter(campo => {
      const matchTipo = filtroTipo === 'todos' || campo.campo_tipo === filtroTipo;
      const matchModulo = filtroModulo === 'todos' || campo.modulo === filtroModulo;
      return matchTipo && matchModulo;
    });
  }, [campos, filtroTipo, filtroModulo]);

  // Filtrar subcategorias por busca (no modal)
  const subcategoriasFiltradas = useMemo(() => {
    if (!buscaConta.trim()) return subcategorias;

    const term = buscaConta.toLowerCase();
    return subcategorias.filter(cat => 
      cat.codigo.toLowerCase().includes(term) ||
      cat.nome.toLowerCase().includes(term)
    );
  }, [subcategorias, buscaConta]);

  // Filtrar subcategorias por tipo (compatível com o campo fixado)
  const subcategoriasCompatíveis = useMemo(() => {
    if (!campoFixado) return subcategoriasFiltradas;

    const campo = campos.find(c => c.id === campoFixado);
    if (!campo) return subcategoriasFiltradas;

    return subcategoriasFiltradas.filter(cat => 
      campo.campo_tipo === cat.tipo || 
      cat.tipo === 'resultado' ||
      (campo.campo_tipo === 'receita' && cat.tipo === 'receita') ||
      (campo.campo_tipo === 'despesa' && cat.tipo === 'despesa')
    );
  }, [subcategoriasFiltradas, campoFixado, campos]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Carregando campos e contas...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as any)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="todos">Todos os Tipos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        <select
          value={filtroModulo}
          onChange={(e) => setFiltroModulo(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="todos">Todos os Módulos</option>
          <option value="reservas">Reservas</option>
          <option value="propriedades">Propriedades</option>
          <option value="integracoes">Integrações</option>
          <option value="plataformas">Plataformas</option>
          <option value="pagamentos">Pagamentos</option>
        </select>
      </div>

      {/* Layout de Dois Painéis */}
      <div className="grid grid-cols-2 gap-6">
        {/* PAINEL ESQUERDO: Campos do Sistema */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" />
            Campos do Sistema ({camposFiltrados.length})
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {camposFiltrados.map((campo) => {
              const isMapped = !!campo.categoria_id;
              const isSaving = saving === campo.id;
              
              // Contar subcategorias compatíveis
              const subcategoriasCompatíveisCount = subcategorias.filter(
                c => (c.tipo === campo.campo_tipo || 
                c.tipo === 'resultado' ||
                (campo.campo_tipo === 'receita' && c.tipo === 'receita') ||
                (campo.campo_tipo === 'despesa' && c.tipo === 'despesa'))
              ).length;

              return (
                <div
                  key={campo.id}
                  className={`
                    p-3 border rounded-lg transition-all cursor-pointer
                    ${isMapped ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'}
                    ${isSaving ? 'opacity-50' : ''}
                  `}
                  onClick={() => handleClickCampo(campo.id)}
                  style={{
                    borderColor: campoFixado === campo.id ? '#3b82f6' : undefined,
                    borderWidth: campoFixado === campo.id ? '2px' : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{campo.campo_nome}</span>
                        <Badge variant={campo.campo_tipo === 'receita' ? 'default' : 'destructive'} className="text-xs">
                          {campo.campo_tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {campo.modulo}
                        </Badge>
                        {!isMapped && subcategoriasCompatíveisCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {subcategoriasCompatíveisCount} subcategoria{subcategoriasCompatíveisCount > 1 ? 's' : ''} disponível{subcategoriasCompatíveisCount > 1 ? 'eis' : ''}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {campo.campo_codigo}
                      </p>
                      {campo.descricao && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {campo.descricao}
                        </p>
                      )}
                      {isMapped && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                                Conta Vinculada:
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-400 font-mono">
                                {campo.categoria_codigo}
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-400">
                                {campo.categoria_nome}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClickCampo(campo.id);
                              }}
                              disabled={isSaving}
                              className="h-6 px-2 text-blue-600 hover:text-blue-700"
                              title="Editar mapeamento"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {!isMapped && campoFixado === campo.id && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-semibold">
                          ✓ Campo fixado - Busque e selecione uma conta no modal
                        </p>
                      )}
                      {!isMapped && campoFixado !== campo.id && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          💡 Clique para fixar este campo e buscar uma conta
                        </p>
                      )}
                    </div>
                    {isMapped && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnmapCampo(campo);
                        }}
                        disabled={isSaving}
                        className="h-6 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* PAINEL DIREITO: Instruções */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">
            Instruções
          </h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>
              <strong>Como mapear:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Clique em um campo do sistema (lado esquerdo)</li>
              <li>O campo será fixado e abrirá um modal de busca</li>
              <li>Digite o nome ou código da conta no campo de busca</li>
              <li>Selecione a conta desejada</li>
              <li>Clique em "Confirmar" para mapear</li>
            </ol>
            <p className="mt-4 text-xs text-gray-500">
              <strong>Nota:</strong> Apenas subcategorias (não raízes mãe) podem ser selecionadas para mapeamento.
            </p>
          </div>
        </Card>
      </div>

      {/* MODAL DE BUSCA DE CONTA (similar a tags de fotos) */}
      <Dialog open={showModalBusca} onOpenChange={setShowModalBusca}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {campoFixado ? (
                <>
                  Mapear: <span className="text-blue-600">{campos.find(c => c.id === campoFixado)?.campo_nome}</span>
                </>
              ) : (
                'Selecionar Conta do Plano de Contas'
              )}
            </DialogTitle>
          </DialogHeader>

          <Separator />

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Campo de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar conta por código ou nome..."
                value={buscaConta}
                onChange={(e) => setBuscaConta(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {/* Lista de subcategorias filtradas */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {subcategoriasCompatíveis.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>
                    {buscaConta 
                      ? `Nenhuma subcategoria encontrada para "${buscaConta}"`
                      : 'Nenhuma subcategoria disponível'
                    }
                  </p>
                </div>
              ) : (
                subcategoriasCompatíveis.map((categoria) => (
                  <div
                    key={categoria.id}
                    className={`
                      flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors
                      ${contaSelecionadaModal === categoria.id ? 'bg-primary/10 border-primary' : 'border-gray-200 dark:border-gray-700'}
                    `}
                    onClick={() => setContaSelecionadaModal(
                      contaSelecionadaModal === categoria.id ? null : categoria.id
                    )}
                  >
                    <Checkbox 
                      checked={contaSelecionadaModal === categoria.id}
                      onCheckedChange={(checked) => 
                        setContaSelecionadaModal(checked ? categoria.id : null)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">{categoria.codigo}</span>
                        <span className="font-medium text-sm flex-1">{categoria.nome}</span>
                        <Badge variant="outline" className="text-xs">
                          {categoria.tipo}
                        </Badge>
                        {categoria.nivel && (
                          <Badge variant="secondary" className="text-xs">
                            Nível {categoria.nivel}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {contaSelecionadaModal === categoria.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Rodapé com botões */}
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {contaSelecionadaModal 
                  ? `1 conta selecionada`
                  : `${subcategoriasCompatíveis.length} subcategoria${subcategoriasCompatíveis.length !== 1 ? 's' : ''} disponível${subcategoriasCompatíveis.length !== 1 ? 'eis' : ''}`
                }
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancelarModal}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmarMapeamento} 
                  disabled={!contaSelecionadaModal}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE DUPLA CONFIRMAÇÃO PARA EDIÇÃO */}
      <AlertDialog open={showConfirmacaoEdicao} onOpenChange={setShowConfirmacaoEdicao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Atenção: Alteração de Mapeamento
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a <strong>alterar o mapeamento</strong> do campo:
              </p>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="font-semibold">{campoParaEditar?.campo_nome}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Atualmente vinculado a: <strong>{campoParaEditar?.categoria_codigo} - {campoParaEditar?.categoria_nome}</strong>
                </p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2">
                  ⚠️ Impacto desta alteração:
                </p>
                <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1 list-disc list-inside">
                  <li>Relatórios financeiros serão recalculados</li>
                  <li>Indicadores e métricas serão atualizados</li>
                  <li>Dados históricos podem ser afetados</li>
                  <li>Lançamentos futuros usarão a nova conta</li>
                </ul>
              </div>
              <p className="text-sm font-medium">
                Tem certeza que deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowConfirmacaoEdicao(false);
              setCampoParaEditar(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarEdicao}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Sim, alterar mapeamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

