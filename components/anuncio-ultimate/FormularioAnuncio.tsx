/**
 * RENDIZY - Formulário de Anúncio (Tabs - Substituição do Wizard)
 * 
 * Formulário simplificado com navegação por abas
 * Mesma UI e campos do wizard original, mas 95% menos código
 * 
 * @version 2.0.0
 * @date 2025-12-16
 * 
 * ============================================================================
 * SISTEMA DE TAGS DE MODALIDADES
 * ============================================================================
 * Cada campo é anotado com tags indicando para quais modalidades serve:
 * 
 * @MODALIDADE: [TEMPORADA] - Aluguel de temporada (short-term rental, Airbnb)
 * @MODALIDADE: [RESIDENCIAL] - Aluguel residencial (long-term rental, tradicional)
 * @MODALIDADE: [VENDA] - Compra e venda de imóveis
 * @MODALIDADE: [TEMPORADA, RESIDENCIAL] - Ambos tipos de aluguel
 * @MODALIDADE: [RESIDENCIAL, VENDA] - Aluguel residencial e venda
 * @MODALIDADE: [TODAS] - Todas as modalidades (universal)
 * 
 * Exemplos:
 * - valor_aluguel: [TEMPORADA, RESIDENCIAL] - usado em ambos aluguéis
 * - preco_base_noite: [TEMPORADA] - exclusivo para temporada
 * - valor_venda: [VENDA] - exclusivo para venda
 * - tipoAcomodacao: [TODAS] - campo universal
 * ============================================================================
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Check, MapPin, Car, Wifi, Building, ImageIcon, Plus, Trash2, X, Eye, Star, Search, ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { LOCATION_AMENITIES, LISTING_AMENITIES } from '../../utils/amenities-categories';

import {
  DiscountPackagesEditor,
  DEFAULT_DISCOUNT_PACKAGES_SETTINGS,
  normalizeDiscountPackagesSettings,
  type DiscountPackagesSettings,
} from '../pricing/DiscountPackagesEditor';

import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { photosApi } from '../../utils/api';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
const ANON_KEY = publicAnonKey;

const SETTINGS_LOCATIONS_LISTINGS_URL = `${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/settings/locations-listings`;
const CUSTOM_DESCRIPTION_VALUES_FIELD = 'custom_description_fields_values';
const DISCOUNT_PACKAGES_OVERRIDE_FIELD = 'discount_packages_override';
const CLIENT_SITES_BASE_URL = 'https://rendizy2testesbackup.vercel.app/site';

type CustomDescriptionField = {
  id: string;
  label: string;
  placeholder?: { pt?: string; en?: string; es?: string };
  required?: boolean;
  order?: number;
};

// ============================================================================
// CONSTANTS - STEP 03
// ============================================================================

const BED_TYPES = [
  { id: 'cama-casal-1p', name: 'Cama 1p de Casal', icon: '🛏️', capacity: 2 },
  { id: 'cama-solteiro-2p', name: 'Cama 2p de Solteiro', icon: '🛏️', capacity: 2 },
  { id: 'cama-queen-1p', name: 'Cama 1p de Queen', icon: '🛏️', capacity: 2 },
  { id: 'cama-king-1p', name: 'Cama Dupla (King)', icon: '🛏️', capacity: 2 },
  { id: 'beliche-1p-2pessoas', name: 'Cama 1p de Beliche (2 pessoas)', icon: '🛏️', capacity: 2 },
  { id: 'berco-baby', name: 'Cama Berço (Berço/Baby)', icon: '👶', capacity: 1 },
  { id: 'futon-casal', name: 'Colchão (Futon Casal)', icon: '🛋️', capacity: 2 },
  { id: 'sofa-cama-casal', name: 'Sofá-cama (p/ Casal)', icon: '🛋️', capacity: 2 },
];

const ROOM_TYPES = [
  { id: 'suite', name: 'Suíte', icon: '🛏️', category: 'bedroom', hasBathroom: true },
  { id: 'quarto-duplo', name: 'Quarto Duplo/Std/Eco', icon: '🛏️', category: 'bedroom' },
  { id: 'quarto-individual', name: 'Individual', icon: '🛏️', category: 'bedroom' },
  { id: 'estudio', name: 'Estúdio', icon: '🏠', category: 'bedroom' },
  { id: 'sala-comum', name: 'Sala/Estar Comum', icon: '🏠', category: 'living' },
  { id: 'area-comum', name: 'área/Área Comum', icon: '🏠', category: 'living' },
  { id: 'banheiro', name: 'Banheiro', icon: '🚿', category: 'bathroom' },
  { id: 'meio-banheiro', name: '1/2 Banheiro', icon: '🚽', category: 'bathroom' },
  { id: 'balcao', name: 'Balcão', icon: '🌳', category: 'outdoor' },
  { id: 'sotao', name: 'Sotão', icon: '🏚️', category: 'other' },
  { id: 'subarea', name: 'Subárea', icon: '🏗️', category: 'other' },
  { id: 'outras', name: 'Outras Dependências', icon: '🚪', category: 'other' },
];

const CUSTOM_SPACE_NAMES = [
  'Academia', 'Adega', 'Área Comum Externa', 'Área de Lazer', 'Área de Serviço',
  'Ateliê', 'Banheiro Externo', 'Biblioteca', 'Brinquedoteca', 'Chalé',
  'Churrasqueira', 'Closet', 'Cobertura', 'Corredor', 'Cozinha',
  'Cozinha Gourmet', 'Deck', 'Dependência de Empregada', 'Depósito', 'Despensa',
  'Elevador', 'Entrada', 'Espaço Externo', 'Espaço Gourmet', 'Escritório',
  'Estacionamento', 'Garagem', 'Gazebo', 'Hall', 'Hidromassagem',
  'Home Office', 'Home Theater', 'Jacuzzi', 'Jardim', 'Jardim de Inverno',
  'Laboratório', 'Lavabo', 'Lavanderia', 'Mirante', 'Pátio',
  'Pergolado', 'Piscina', 'Playground', 'Quadra Esportiva', 'Quiosque',
  'Sala de Estar', 'Sala de Jantar', 'Sala de Jogos', 'Sala de TV',
  'Salão de Festas', 'Sauna', 'Solário', 'Spa', 'Terraço',
  'Varanda', 'Varanda Gourmet', 'Vestiário', 'Outro (especificar)',
].sort();

const PHOTO_TAGS = [
  'Academia / Espaço Fitness', 'Alimentos e Bebidas', 'Almoço', 'Animais', 'Animais de Estimação',
  'Área de Compras', 'Área de estar', 'Área e instalações', 'Área para café / chá',
  'Arredores', 'Atividades', 'Banheira/jacuzzi', 'Banheiro', 'Banheiro compartilhado',
  'Café da manhã', 'Cama', 'Centro de negócios', 'Cozinha', 'Entrada', 'Escritório',
  'Espaço de trabalho', 'Estacionamento', 'Fachada', 'Jardim', 'Lavanderia',
  'Lobby', 'Piscina', 'Quarto', 'Recepção', 'Restaurante', 'Sala de estar',
  'Terraço', 'Varanda', 'Vista exterior', 'Vista interior',
  'Vista do Mar', 'Vista para Montanha', 'Vista Panorâmica', 'Vista da Cidade',
  'Vista do Jardim', 'Vista da Piscina', 'Vista do Lago', 'Vista do Rio',
  'Sacada', 'Churrasqueira', 'Área Gourmet', 'Hidromassagem', 'Sauna',
  'Sala de Jogos', 'Home Theater', 'Ar Condicionado', 'Aquecimento',
  'Lareira', 'Mesa de Bilhar', 'Mesa de Ping Pong', 'Lavabo',
  'Closet', 'Suite Master', 'Varanda com Rede', 'Deck',
  'Gazebo', 'Quadra Esportiva', 'Playground', 'Espaço Pet',
];

// ============================================================================
// TYPES
// ============================================================================

interface Photo {
  id: string;
  url: string;
  tags: string[];
  path?: string;
  room?: string;
  order?: number;
}

interface Room {
  id: string;
  type: string;
  typeName: string;
  customName?: string;
  isShared: boolean;
  beds: Record<string, number>;
  photos: Photo[];
}

interface FormData {
  // Tab 1: Básico
  tipoAcomodacao: string;
  tipoLocal: string;
  subtype: string;
  title: string;
  internalId: string;
  modalidades: string[];
  estrutura: 'individual' | 'vinculado';
  
  // Tab 2: Localização (17 campos completos)
  pais: string;
  estado: string;
  siglaEstado: string;
  cep: string;
  cidade: string;
  bairro: string;
  rua: string;
  numero: string;
  complemento: string;
  mostrarNumero: string; // 'ocultar' | 'individual'
  tipoAcesso: string; // 'portaria' | 'codigo' | 'livre' | 'outro'
  instrucoesAcesso: string;
  estacionamento: boolean;
  tipoEstacionamento: string;
  internetCabo: boolean;
  internetWifi: boolean;
  
  // Legacy address object (manter para compatibilidade)
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Tab 3: Cômodos (sistema completo de rooms[])
  rooms: Room[];
  bedrooms: number; // calculado automaticamente
  bathrooms: number; // calculado automaticamente (inclui suítes)
  beds: number; // calculado automaticamente
  guests: number;
  
  // Tab 4: Tour (fotos)
  coverPhoto: string;
  coverPhotoId: string | null;
  
  // Tab 5: Amenidades Local
  locationAmenities: string[];
  
  // Tab 6: Amenidades Acomodação
  listingAmenities: string[];
  
  // Tab 7: Descrição
  description: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function FormularioAnuncio() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [anuncioId] = useState<string | null>(id || null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [publicSiteUrl, setPublicSiteUrl] = useState<string | null>(null);
  const [publicSiteLoading, setPublicSiteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basico');
  const roomCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // ============================================================================
  // STEP 01: BÁSICO - Estado unificado do formulário
  // ============================================================================
  const [formData, setFormData] = useState<FormData>({
    // @MODALIDADE: [TODAS] - Define o tipo de imóvel universalmente
    tipoAcomodacao: '',
    
    // @MODALIDADE: [TODAS] - Define o tipo de espaço universalmente
    tipoLocal: '',
    
    // @MODALIDADE: [TODAS] - Subtipo específico do imóvel
    subtype: '',
    
    // @MODALIDADE: [TODAS] - Nome/título do anúncio
    title: '',
    
    // @MODALIDADE: [TODAS] - ID interno para controle
    internalId: '',
    
    // @MODALIDADE: [TODAS] - Array que define as modalidades ativas (temporada/residencial/venda)
    modalidades: [],
    
    // @MODALIDADE: [TODAS] - Estrutura do imóvel (individual/condominio/vinculado)
    estrutura: 'individual',
    
    // ========================================================================
    // STEP 02: LOCALIZAÇÃO - 16 campos
    // ========================================================================
    // @MODALIDADE: [TODAS]
    pais: 'Brasil',
    // @MODALIDADE: [TODAS]
    estado: '',
    // @MODALIDADE: [TODAS]
    siglaEstado: '',
    // @MODALIDADE: [TODAS]
    cep: '',
    // @MODALIDADE: [TODAS]
    cidade: '',
    // @MODALIDADE: [TODAS]
    bairro: '',
    // @MODALIDADE: [TODAS]
    rua: '',
    // @MODALIDADE: [TODAS]
    numero: '',
    // @MODALIDADE: [TODAS]
    complemento: '',
    // @MODALIDADE: [TODAS]
    mostrarNumero: 'ocultar',
    // @MODALIDADE: [TODAS]
    tipoAcesso: 'portaria',
    // @MODALIDADE: [TODAS]
    instrucoesAcesso: '',
    // @MODALIDADE: [TODAS]
    estacionamento: false,
    // @MODALIDADE: [TODAS]
    tipoEstacionamento: '',
    // @MODALIDADE: [TODAS]
    internetCabo: false,
    // @MODALIDADE: [TODAS]
    internetWifi: false,
    
    // Legacy (manter compatibilidade)
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Brasil'
    },
    
    // ========================================================================
    // STEP 03: CÔMODOS
    // ========================================================================
    // @MODALIDADE: [TODAS] - Array de cômodos com fotos e tags
    rooms: [],
    // @MODALIDADE: [TODAS] - Quantidade total de quartos
    bedrooms: 0,
    // @MODALIDADE: [TODAS] - Quantidade total de banheiros
    bathrooms: 0,
    // @MODALIDADE: [TODAS] - Quantidade total de camas
    beds: 0,
    // @MODALIDADE: [TODAS] - Capacidade máxima de hóspedes
    guests: 0,
    
    // ========================================================================
    // STEP 04: TOUR VIRTUAL
    // ========================================================================
    // @MODALIDADE: [TODAS] - URL da foto de capa do anúncio
    coverPhoto: '',
    // @MODALIDADE: [TODAS] - ID da foto de capa no storage
    coverPhotoId: null,
    
    // ========================================================================
    // STEP 05: AMENIDADES DO LOCAL
    // ========================================================================
    // @MODALIDADE: [TODAS] - Array de amenidades do prédio/condomínio
    locationAmenities: [],
    
    // ========================================================================
    // STEP 06: AMENIDADES DA ACOMODAÇÃO
    // ========================================================================
    // @MODALIDADE: [TODAS] - Array de amenidades dentro da unidade
    listingAmenities: [],
    
    // @MODALIDADE: [TODAS] - Descrição geral (campo legado)
    description: ''
  });
  
  // Step 03: Estados para gerenciamento de rooms
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [filterRoom, setFilterRoom] = useState<string>('all');
  
  // Step 05: Amenidades do Local
  const [searchAmenities, setSearchAmenities] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  
  // Step 06: Amenidades da Acomodação
  const [searchListingAmenities, setSearchListingAmenities] = useState('');
  const [collapsedListingCategories, setCollapsedListingCategories] = useState<Record<string, boolean>>({});
  
  // ============================================================================
  // STEP 07: DESCRIÇÃO - 7 CAMPOS MULTILÍNGUES (PT/EN/ES)
  // @MODALIDADE: [TODAS] - Descrições detalhadas do imóvel
  // ============================================================================
  type MultiLangText = { pt: string; en: string; es: string };
  const [activeDescTab, setActiveDescTab] = useState<'pt' | 'en' | 'es'>('pt');
  
  // @MODALIDADE: [TODAS] - Título do anúncio (50 chars)
  const [descricaoTitulo, setDescricaoTitulo] = useState<MultiLangText>({ pt: '', en: '', es: '' });
  
  // @MODALIDADE: [TODAS] - Notas gerais sobre o espaço (5000 chars)
  const [notasGerais, setNotasGerais] = useState<MultiLangText>({ pt: '', en: '', es: '' });
  
  // @MODALIDADE: [TODAS] - Sobre o espaço/imóvel (5000 chars)
  const [sobreEspaco, setSobreEspaco] = useState<MultiLangText>({ pt: '', en: '', es: '' });
  
  // @MODALIDADE: [TODAS] - Sobre acesso ao espaço (5000 chars)
  const [sobreAcesso, setSobreAcesso] = useState<MultiLangText>({ pt: '', en: '', es: '' });
  
  // @MODALIDADE: [TEMPORADA] - Interação com anfitrião (5000 chars) - Mais relevante para temporada
  const [sobreAnfitriao, setSobreAnfitriao] = useState<MultiLangText>({ pt: '', en: '', es: '' });
  
  // @MODALIDADE: [TODAS] - Descrição do bairro (5000 chars)
  const [descricaoBairro, setDescricaoBairro] = useState<MultiLangText>({ pt: '', en: '', es: '' });
  
  // @MODALIDADE: [TODAS] - Informações de locomoção (5000 chars)
  const [infoLocomocao, setInfoLocomocao] = useState<MultiLangText>({ pt: '', en: '', es: '' });

  const [customDescriptionFields, setCustomDescriptionFields] = useState<CustomDescriptionField[]>([]);
  const [customDescriptionValues, setCustomDescriptionValues] = useState<Record<string, MultiLangText>>({});
  const [customDescriptionLoadError, setCustomDescriptionLoadError] = useState<string | null>(null);
  
  // ============================================================================
  // STEP 08: RELACIONAMENTO - 4 CAMPOS
  // @MODALIDADE: [TODAS] - Configuração legal e administrativa
  // ============================================================================
  
  // @MODALIDADE: [TODAS] - Titular legal do imóvel
  const [titularImovel, setTitularImovel] = useState('nao_definido');
  
  // @MODALIDADE: [TODAS] - Administrador responsável
  const [administradorImovel, setAdministradorImovel] = useState('nao_definido');
  
  // @MODALIDADE: [TODAS] - Indica se é sublocação
  const [isSublocacao, setIsSublocacao] = useState(false);
  
  // @MODALIDADE: [TODAS] - Indica gestão exclusiva
  const [isExclusivo, setIsExclusivo] = useState(false);
  
  // ============================================================================
  // STEP 09: PREÇOS BASE - LOCAÇÃO E VENDA - 9 CAMPOS
  // ============================================================================
  
  // @MODALIDADE: [TODAS] - Define tipo de negócio (aluguel/venda/ambos)
  const [tipoNegocio, setTipoNegocio] = useState<'aluguel' | 'venda' | 'ambos'>('aluguel');
  
  // @MODALIDADE: [TEMPORADA, RESIDENCIAL] - Valor mensal do aluguel
  const [valorAluguel, setValorAluguel] = useState(0);
  
  // @MODALIDADE: [RESIDENCIAL, VENDA] - IPTU mensal (residencial) ou anual (venda)
  const [valorIptu, setValorIptu] = useState(0);
  
  // @MODALIDADE: [RESIDENCIAL, VENDA] - Valor mensal do condomínio
  const [valorCondominio, setValorCondominio] = useState(0);
  
  // @MODALIDADE: [TEMPORADA, RESIDENCIAL] - Taxa de serviço adicional
  const [taxaServico, setTaxaServico] = useState(0);
  
  // @MODALIDADE: [VENDA] - Valor de venda do imóvel
  const [valorVenda, setValorVenda] = useState(0);
  
  // @MODALIDADE: [VENDA] - IPTU anual para venda
  const [iptuAnual, setIptuAnual] = useState(0);
  
  // @MODALIDADE: [VENDA] - Aceita financiamento bancário
  const [aceitaFinanciamento, setAceitaFinanciamento] = useState(false);
  
  // @MODALIDADE: [VENDA] - Aceita permuta
  const [aceitaPermuta, setAceitaPermuta] = useState(false);

  // ============================================================================
  // STEP 10: CONFIGURAÇÃO PREÇO TEMPORADA - 11 CAMPOS
  // @MODALIDADE: [TEMPORADA] - EXCLUSIVO para aluguel de temporada
  // ============================================================================
  
  // @MODALIDADE: [TEMPORADA] - Modo de configuração (global/por canal)
  const [modoConfigPreco, setModoConfigPreco] = useState<'global' | 'individual'>('global');
  
  // @MODALIDADE: [TEMPORADA] - Região geográfica para precificação
  const [regiao, setRegiao] = useState('BR');
  
  // @MODALIDADE: [TEMPORADA] - Moeda utilizada
  const [moeda, setMoeda] = useState('BRL');
  
  // @MODALIDADE: [TEMPORADA] - Valor do depósito caução
  const [valorDeposito, setValorDeposito] = useState(0);
  
  // @MODALIDADE: [TEMPORADA] - Usar precificação dinâmica (algoritmo)
  const [usarPrecificacaoDinamica, setUsarPrecificacaoDinamica] = useState(false);
  
  // @MODALIDADE: [TEMPORADA] - Taxa fixa de limpeza
  const [taxaLimpeza, setTaxaLimpeza] = useState(0);
  
  // @MODALIDADE: [TEMPORADA] - Taxa adicional para pets
  const [taxaPet, setTaxaPet] = useState(0);
  
  // @MODALIDADE: [TEMPORADA] - Taxa para serviços extras
  const [taxaServicosExtras, setTaxaServicosExtras] = useState(0);

  // ============================================================================
  // STEP 11: PRECIFICAÇÃO INDIVIDUAL - 7 CAMPOS
  // @MODALIDADE: [TEMPORADA] - EXCLUSIVO para aluguel de temporada
  // ============================================================================
  
  // @MODALIDADE: [TEMPORADA] - Preço base por diária
  const [precoBaseNoite, setPrecoBaseNoite] = useState(0);

  // @MODALIDADE: [TEMPORADA] - Override de descontos por pacote de dias (por anúncio)
  const [useDiscountPackagesOverride, setUseDiscountPackagesOverride] = useState(false);
  const [discountPackagesOverride, setDiscountPackagesOverride] = useState<DiscountPackagesSettings>(DEFAULT_DISCOUNT_PACKAGES_SETTINGS);
  
  // @MODALIDADE: [TEMPORADA] - Array de períodos sazonais (alta/baixa)
  const [periodosSazonais, setPeriodosSazonais] = useState<any[]>([]);
  
  // @MODALIDADE: [TEMPORADA] - Objeto com preços por dia da semana
  const [precosDiaSemana, setPrecosDiaSemana] = useState<any>({});
  
  // @MODALIDADE: [TEMPORADA] - Array de datas especiais (feriados/eventos)
  const [datasEspeciais, setDatasEspeciais] = useState<any[]>([]);

  // ============================================================================
  // STEP 12: PREÇOS DERIVADOS - 6 CAMPOS
  // @MODALIDADE: [TEMPORADA] - EXCLUSIVO para aluguel de temporada
  // ============================================================================
  
  // @MODALIDADE: [TEMPORADA] - Variação % no preço por número de hóspedes
  const [variacaoPorHospedes, setVariacaoPorHospedes] = useState(0);
  
  // @MODALIDADE: [TEMPORADA] - Taxa fixa por hóspede adicional (R$)
  const [taxaHospedeExtra, setTaxaHospedeExtra] = useState(0);
  
  // @MODALIDADE: [TEMPORADA] - Flag se cobra valor diferenciado para crianças
  const [cobrarCriancas, setCobrarCriancas] = useState(false);
  
  // @MODALIDADE: [TEMPORADA] - Idade mínima para ser considerado criança
  const [idadeMinimaCrianca, setIdadeMinimaCrianca] = useState(0);
  
  // @MODALIDADE: [TEMPORADA] - Idade máxima para ser considerado criança
  const [idadeMaximaCrianca, setIdadeMaximaCrianca] = useState(12);
  
  // @MODALIDADE: [TEMPORADA] - Desconto % aplicado para crianças
  const [descontoCrianca, setDescontoCrianca] = useState(0);
  
  // ============================================================================
  // ESTADO DE CONTROLE DO FORMULÁRIO
  // ============================================================================
  // Progresso de preenchimento
  const [completedTabs, setCompletedTabs] = useState<string[]>([]);
  
  // ============================================================================
  // HELPERS DE MODALIDADE - Determinam quais campos/tabs são visíveis
  // ============================================================================
  // Derivados do formData.modalidades selecionadas
  const isTemporada = formData.modalidades.includes('temporada');
  const isVenda = formData.modalidades.includes('compra-venda');
  const isResidencial = formData.modalidades.includes('locacao');
  
  // Pelo menos uma modalidade precisa estar ativa
  const hasAnyModalidade = isTemporada || isVenda || isResidencial;
  
  // Helper para campos de aluguel (temporada ou residencial)
  const isAluguel = isTemporada || isResidencial;
  
  // Sincroniza tipoNegocio com modalidades selecionadas (para compatibilidade com salvamento)
  // Só sincroniza quando há pelo menos uma modalidade ativa (evita sobrescrever valor carregado do backend)
  useEffect(() => {
    if (!hasAnyModalidade) return; // Não sincroniza se nenhuma modalidade ativa
    
    if (isAluguel && isVenda) {
      setTipoNegocio('ambos');
    } else if (isVenda) {
      setTipoNegocio('venda');
    } else {
      setTipoNegocio('aluguel');
    }
  }, [isAluguel, isVenda, hasAnyModalidade]);
  
  // ============================================================================
  // LOAD DATA
  // ============================================================================
  
  useEffect(() => {
    if (anuncioId) {
      loadAnuncio();
    }
  }, [anuncioId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const token = localStorage.getItem('rendizy-token');
        const resp = await fetch(SETTINGS_LOCATIONS_LISTINGS_URL, {
          method: 'GET',
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': token || '',
            'Accept': 'application/json',
          },
        });

        const data = await resp.json().catch(() => null);
        if (!resp.ok) {
          throw new Error(data?.error || `HTTP ${resp.status}`);
        }

        const fieldsRaw = data?.settings?.customDescriptionFields;
        const fields: CustomDescriptionField[] = Array.isArray(fieldsRaw)
          ? fieldsRaw
              .filter((f: any) => f && typeof f === 'object' && typeof f.id === 'string' && typeof f.label === 'string')
              .map((f: any) => ({
                id: f.id,
                label: f.label,
                placeholder: f.placeholder || undefined,
                required: Boolean(f.required),
                order: typeof f.order === 'number' ? f.order : 0,
              }))
          : [];

        fields.sort((a, b) => (a.order || 0) - (b.order || 0) || a.label.localeCompare(b.label));

        if (!cancelled) {
          setCustomDescriptionFields(fields);
          setCustomDescriptionLoadError(null);
        }
      } catch (err: any) {
        console.error('❌ Falha ao carregar customDescriptionFields:', err);
        if (!cancelled) {
          setCustomDescriptionFields([]);
          setCustomDescriptionLoadError(err?.message || 'Falha ao carregar campos personalizados');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
  
  const loadAnuncio = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('rendizy-token');
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/${anuncioId}`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': token || '',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Erro ao carregar anúncio');
      
      const payload = await response.json();
      const row = payload?.anuncio;
      if (row?.organization_id) {
        setOrganizationId(String(row.organization_id));
      }
      if (row?.data) {
        const wizardData = row.data;
        
        // Mapear campos do wizard antigo (português) para estrutura nova (inglês)
        const mappedData: FormData = {
          // Tab 1: Básico
          tipoAcomodacao: wizardData.tipoAcomodacao || wizardData.tipo_acomodacao || '',
          tipoLocal: wizardData.tipoLocal || wizardData.tipo_local || '',
          subtype: wizardData.subtype || '',
          title: wizardData.title || '',
          internalId: wizardData.internalId || '',
          modalidades: Array.isArray(wizardData.modalidades) 
            ? wizardData.modalidades 
            : (typeof wizardData.modalidades === 'string' ? JSON.parse(wizardData.modalidades) : []),
          estrutura: wizardData.estrutura || 'individual',
          
          // Tab 2: Localização - 17 campos completos
          pais: wizardData.pais || 'Brasil',
          estado: wizardData.estado || '',
          siglaEstado: wizardData.sigla_estado || wizardData.siglaEstado || '',
          cep: wizardData.cep || '',
          cidade: wizardData.cidade || '',
          bairro: wizardData.bairro || '',
          rua: wizardData.rua || '',
          numero: wizardData.numero || '',
          complemento: wizardData.complemento || '',
          mostrarNumero: wizardData.mostrar_numero || wizardData.mostrarNumero || 'ocultar',
          tipoAcesso: wizardData.tipo_acesso || wizardData.tipoAcesso || 'portaria',
          instrucoesAcesso: wizardData.instrucoes_acesso || wizardData.instrucoesAcesso || '',
          estacionamento: wizardData.estacionamento || false,
          tipoEstacionamento: wizardData.tipo_estacionamento || wizardData.tipoEstacionamento || '',
          internetCabo: wizardData.internet_cabo || wizardData.internetCabo || false,
          internetWifi: wizardData.internet_wifi || wizardData.internetWifi || false,
          
          // Legacy address object (manter compatibilidade)
          address: {
            street: wizardData.address?.street || wizardData.rua || '',
            number: wizardData.address?.number || wizardData.numero || '',
            complement: wizardData.address?.complement || wizardData.complemento || '',
            neighborhood: wizardData.address?.neighborhood || wizardData.bairro || '',
            city: wizardData.address?.city || wizardData.cidade || '',
            state: wizardData.address?.state || wizardData.estado || wizardData.sigla_estado || '',
            zipCode: wizardData.address?.zipCode || wizardData.cep || '',
            country: wizardData.address?.country || wizardData.pais || 'Brasil'
          },
          
          // Tab 3: Cômodos - carregar rooms[] completo
          rooms: parseRoomsData(wizardData.rooms),
          bedrooms: wizardData.bedrooms || calculateBedroomsFromRooms(wizardData.rooms),
          bathrooms: wizardData.bathrooms || calculateBathroomsFromRooms(wizardData.rooms),
          beds: wizardData.beds || calculateBedsFromRooms(wizardData.rooms),
          guests: wizardData.guests || 0,
          
          // Tab 4: Tour - buscar foto de capa
          coverPhoto: wizardData.coverPhoto || getCoverPhotoFromRooms(wizardData.rooms, wizardData.cover_photo_id),
          coverPhotoId: wizardData.cover_photo_id || null,
          
          // Tab 5: Amenidades Local
          locationAmenities: parseLocationAmenities(wizardData.location_amenities),
          
          // Tab 6: Amenidades Acomodação
          listingAmenities: parseLocationAmenities(wizardData.listing_amenities),
          
          // Tab 7: Descrição
          description: wizardData.description || 
                      (wizardData.descricao_titulo?.pt || '') || ''
        };
        
        // Carregar campos multilíngues Step 07
        if (wizardData.descricao_titulo) {
          setDescricaoTitulo(parseMultiLangField(wizardData.descricao_titulo));
        }
        if (wizardData.notas_gerais) {
          setNotasGerais(parseMultiLangField(wizardData.notas_gerais));
        }
        if (wizardData.sobre_espaco) {
          setSobreEspaco(parseMultiLangField(wizardData.sobre_espaco));
        }
        if (wizardData.sobre_acesso) {
          setSobreAcesso(parseMultiLangField(wizardData.sobre_acesso));
        }
        if (wizardData.sobre_anfitriao) {
          setSobreAnfitriao(parseMultiLangField(wizardData.sobre_anfitriao));
        }
        if (wizardData.descricao_bairro) {
          setDescricaoBairro(parseMultiLangField(wizardData.descricao_bairro));
        }
        if (wizardData.info_locomocao) {
          setInfoLocomocao(parseMultiLangField(wizardData.info_locomocao));
        }

        // Carregar campos personalizados (Step 07) - valores por anúncio
        const rawCustomDescValues = (wizardData as any)?.[CUSTOM_DESCRIPTION_VALUES_FIELD];
        if (rawCustomDescValues) {
          try {
            const parsed = typeof rawCustomDescValues === 'string'
              ? JSON.parse(rawCustomDescValues)
              : rawCustomDescValues;

            if (parsed && typeof parsed === 'object') {
              const nextValues: Record<string, MultiLangText> = {};
              for (const [fieldId, value] of Object.entries(parsed)) {
                nextValues[fieldId] = parseMultiLangField(value);
              }
              setCustomDescriptionValues(nextValues);
            }
          } catch (err) {
            console.error('❌ Erro ao parsear custom_description_fields_values:', err);
          }
        }
        
        // Step 08: Relacionamento
        if (wizardData.titular_imovel) setTitularImovel(wizardData.titular_imovel);
        if (wizardData.administrador_imovel) setAdministradorImovel(wizardData.administrador_imovel);
        if (wizardData.is_sublocacao !== undefined) setIsSublocacao(wizardData.is_sublocacao === true);
        if (wizardData.is_exclusivo !== undefined) setIsExclusivo(wizardData.is_exclusivo === true);
        
        // Step 09: Preços Locação e Venda
        if (wizardData.tipo_negocio) setTipoNegocio(wizardData.tipo_negocio as 'aluguel' | 'venda' | 'ambos');
        if (wizardData.valor_aluguel !== undefined) setValorAluguel(Number(wizardData.valor_aluguel) || 0);
        if (wizardData.valor_iptu !== undefined) setValorIptu(Number(wizardData.valor_iptu) || 0);
        if (wizardData.valor_condominio !== undefined) setValorCondominio(Number(wizardData.valor_condominio) || 0);
        if (wizardData.taxa_servico !== undefined) setTaxaServico(Number(wizardData.taxa_servico) || 0);
        if (wizardData.valor_venda !== undefined) setValorVenda(Number(wizardData.valor_venda) || 0);
        if (wizardData.iptu_anual !== undefined) setIptuAnual(Number(wizardData.iptu_anual) || 0);
        if (wizardData.aceita_financiamento !== undefined) setAceitaFinanciamento(wizardData.aceita_financiamento === true);
        if (wizardData.aceita_permuta !== undefined) setAceitaPermuta(wizardData.aceita_permuta === true);
        
        // Step 10: Configuração de Preço Temporada
        if (wizardData.modo_config_preco) setModoConfigPreco(wizardData.modo_config_preco as 'global' | 'individual');
        if (wizardData.regiao) setRegiao(wizardData.regiao);
        if (wizardData.moeda) setMoeda(wizardData.moeda);
        if (wizardData.valor_deposito !== undefined) setValorDeposito(Number(wizardData.valor_deposito) || 0);
        if (wizardData.usar_precificacao_dinamica !== undefined) setUsarPrecificacaoDinamica(wizardData.usar_precificacao_dinamica === true);
        if (wizardData.taxa_limpeza !== undefined) setTaxaLimpeza(Number(wizardData.taxa_limpeza) || 0);
        if (wizardData.taxa_pet !== undefined) setTaxaPet(Number(wizardData.taxa_pet) || 0);
        if (wizardData.taxa_servicos_extras !== undefined) setTaxaServicosExtras(Number(wizardData.taxa_servicos_extras) || 0);
        
        // Step 11: Precificação Individual
        if (wizardData.preco_base_noite !== undefined) setPrecoBaseNoite(Number(wizardData.preco_base_noite) || 0);
        {
          const rawOverride = (wizardData as any)?.[DISCOUNT_PACKAGES_OVERRIDE_FIELD];
          if (rawOverride !== undefined && rawOverride !== null && rawOverride !== '') {
            try {
              const parsed = typeof rawOverride === 'string' ? JSON.parse(rawOverride) : rawOverride;
              if (parsed && typeof parsed === 'object') {
                setUseDiscountPackagesOverride(true);
                setDiscountPackagesOverride(normalizeDiscountPackagesSettings(parsed as DiscountPackagesSettings));
              }
            } catch (err) {
              console.error('❌ Erro ao parsear discount_packages_override:', err);
            }
          } else {
            setUseDiscountPackagesOverride(false);
          }
        }
        if (wizardData.periodos_sazonais) setPeriodosSazonais(wizardData.periodos_sazonais || []);
        if (wizardData.precos_dia_semana) setPrecosDiaSemana(wizardData.precos_dia_semana || {});
        if (wizardData.datas_especiais) setDatasEspeciais(wizardData.datas_especiais || []);
        
        // Step 12: Preços Derivados
        if (wizardData.variacao_por_hospedes !== undefined) setVariacaoPorHospedes(Number(wizardData.variacao_por_hospedes) || 0);
        if (wizardData.taxa_hospede_extra !== undefined) setTaxaHospedeExtra(Number(wizardData.taxa_hospede_extra) || 0);
        if (wizardData.cobrar_criancas !== undefined) setCobrarCriancas(wizardData.cobrar_criancas === true);
        if (wizardData.idade_minima_crianca !== undefined) setIdadeMinimaCrianca(Number(wizardData.idade_minima_crianca) || 0);
        if (wizardData.idade_maxima_crianca !== undefined) setIdadeMaximaCrianca(Number(wizardData.idade_maxima_crianca) || 12);
        if (wizardData.desconto_crianca !== undefined) setDescontoCrianca(Number(wizardData.desconto_crianca) || 0);
        
        setFormData(mappedData);
        calculateProgress(mappedData);
        
        console.log('✅ Dados carregados e mapeados:', mappedData);
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar anúncio');
    } finally {
      setIsLoading(false);
    }
  };

  const buildPublicSiteUrl = (subdomain: string, anuncioIdValue: string) => {
    return `${CLIENT_SITES_BASE_URL}/${encodeURIComponent(subdomain)}/#/imovel/${encodeURIComponent(anuncioIdValue)}`;
  };

  const fetchClientSiteSubdomain = async (orgId: string): Promise<string | null> => {
    try {
      const token = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/rendizy-server/client-sites?organization_id=${encodeURIComponent(orgId)}`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
            'X-Auth-Token': token || '',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) return null;
      const data = await response.json().catch(() => null);
      const subdomain = data?.data?.subdomain;
      return typeof subdomain === 'string' && subdomain.trim() ? subdomain.trim() : null;
    } catch (error) {
      console.error('❌ Falha ao buscar subdomain do site:', error);
      return null;
    }
  };

  const handleOpenPublicSite = async () => {
    if (!anuncioId) return;

    if (publicSiteUrl) {
      window.open(publicSiteUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!organizationId) {
      toast.error('Organização do anúncio não encontrada');
      return;
    }

    setPublicSiteLoading(true);
    try {
      const subdomain = await fetchClientSiteSubdomain(organizationId);
      if (!subdomain) {
        toast.error('Site do cliente não encontrado para esta organização');
        return;
      }
      const url = buildPublicSiteUrl(subdomain, anuncioId);
      setPublicSiteUrl(url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setPublicSiteLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    if (!organizationId || !anuncioId) {
      setPublicSiteUrl(null);
      return;
    }

    (async () => {
      setPublicSiteLoading(true);
      const subdomain = await fetchClientSiteSubdomain(organizationId);
      if (!cancelled) {
        setPublicSiteUrl(subdomain ? buildPublicSiteUrl(subdomain, anuncioId) : null);
        setPublicSiteLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId, anuncioId]);
  
  // Funções auxiliares para extrair dados do wizard antigo
  const calculateBedroomsFromRooms = (roomsData: any): number => {
    if (!roomsData) return 0;
    try {
      const rooms = typeof roomsData === 'string' ? JSON.parse(roomsData) : roomsData;
      if (!Array.isArray(rooms)) return 0;

      const normalize = (v: unknown) =>
        String(v ?? '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

      return rooms.filter((r: any) => {
        const hay = `${normalize(r.type)} ${normalize(r.typeName)}`;
        // Regra: suíte conta como quarto.
        return hay.includes('quarto') || hay.includes('suite');
      }).length;
    } catch {
      return 0;
    }
  };
  
  const calculateBedsFromRooms = (roomsData: any): number => {
    if (!roomsData) return 0;
    try {
      const rooms = typeof roomsData === 'string' ? JSON.parse(roomsData) : roomsData;
      if (!Array.isArray(rooms)) return 0;
      
      let totalBeds = 0;
      rooms.forEach(room => {
        if (room.beds && typeof room.beds === 'object') {
          // Somar todas as camas de todos os tipos
          Object.values(room.beds).forEach((count: any) => {
            totalBeds += parseInt(count) || 0;
          });
        }
      });
      return totalBeds;
    } catch {
      return 0;
    }
  };
  
  const getCoverPhotoFromRooms = (roomsData: any, coverPhotoId?: string): string => {
    if (!roomsData) return '';
    try {
      const rooms = typeof roomsData === 'string' ? JSON.parse(roomsData) : roomsData;
      if (!Array.isArray(rooms)) return '';
      
      // Buscar foto específica pelo ID se fornecido
      if (coverPhotoId) {
        for (const room of rooms) {
          if (room.photos && Array.isArray(room.photos)) {
            const coverPhoto = room.photos.find((p: any) => p.id === coverPhotoId);
            if (coverPhoto?.url) return coverPhoto.url;
          }
        }
      }
      
      // Caso contrário, pegar primeira foto disponível
      for (const room of rooms) {
        if (room.photos && Array.isArray(room.photos) && room.photos.length > 0) {
          return room.photos[0].url || '';
        }
      }
      
      return '';
    } catch {
      return '';
    }
  };
  
  const parseRoomsData = (roomsData: any): Room[] => {
    if (!roomsData) return [];
    try {
      const rooms = typeof roomsData === 'string' ? JSON.parse(roomsData) : roomsData;
      if (!Array.isArray(rooms)) return [];
      
      return rooms.map(room => ({
        id: room.id || `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: room.type || '',
        typeName: room.typeName || '',
        customName: room.customName || '',
        isShared: room.isShared || false,
        beds: room.beds || {},
        photos: Array.isArray(room.photos) ? room.photos : []
      }));
    } catch {
      return [];
    }
  };
  
  const calculateBathroomsFromRooms = (roomsData: any): number => {
    if (!roomsData) return 0;
    try {
      const rooms = typeof roomsData === 'string' ? JSON.parse(roomsData) : roomsData;
      if (!Array.isArray(rooms)) return 0;
      
      let bathrooms = 0;
      rooms.forEach(room => {
        const roomType = ROOM_TYPES.find(rt => rt.id === room.type);
        
        // Contar banheiros normais
        if (roomType?.category === 'bathroom') {
          bathrooms++;
        }
        
        // Contar suítes (hasBathroom: true)
        if (roomType?.hasBathroom) {
          bathrooms++;
        }
      });
      
      return bathrooms;
    } catch {
      return 0;
    }
  };
  
  // ============================================================================
  // CEP LOOKUP (ViaCEP API)
  // ============================================================================
  
  const buscarCep = async (cepValue: string) => {
    try {
      // Limpar formatação (remove hífens, pontos, espaços)
      const cepLimpo = cepValue.replace(/\D/g, '');
      
      // Validar tamanho
      if (cepLimpo.length !== 8) {
        console.warn('⚠️ CEP inválido (precisa ter 8 dígitos):', cepLimpo);
        return;
      }
      
      console.log('🔍 Buscando CEP:', cepLimpo);
      
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      
      if (data.erro) {
        toast.error('❌ CEP não encontrado');
        return;
      }
      
      // Mapear sigla para nome completo do estado
      const estadosMap: Record<string, string> = {
        'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
        'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
        'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
        'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná',
        'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
        'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
        'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
      };
      
      // Auto-preencher campos
      setFormData(prev => ({
        ...prev,
        rua: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        siglaEstado: data.uf || '',
        estado: estadosMap[data.uf] || data.uf,
        // Atualizar legacy address também
        address: {
          ...prev.address,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || ''
        }
      }));
      
      toast.success('✅ Endereço encontrado!');
      console.log('✅ CEP encontrado:', data);
    } catch (error) {
      console.error('❌ Erro ao buscar CEP:', error);
      toast.error('❌ Erro ao buscar CEP. Verifique sua conexão.');
    }
  };

  // Formatação automática de CEP ao digitar
  const formatarCep = (value: string): string => {
    const numeros = value.replace(/\D/g, '');
    if (numeros.length <= 5) return numeros;
    return `${numeros.slice(0, 5)}-${numeros.slice(5, 8)}`;
  };
  
  // Parse location amenities (pode vir como JSON string ou objeto)
  const parseLocationAmenities = (data: any): string[] => {
    if (!data) return [];
    
    try {
      // Se vier como string JSON, parseia
      if (typeof data === 'string') {
        const parsed = JSON.parse(data);
        // Se for objeto com tickableAmenities (formato antigo do wizard)
        if (parsed.tickableAmenities && Array.isArray(parsed.tickableAmenities)) {
          return parsed.tickableAmenities;
        }
        // Se for array direto
        if (Array.isArray(parsed)) {
          return parsed;
        }
        return [];
      }
      
      // Se vier como objeto direto
      if (typeof data === 'object') {
        if (data.tickableAmenities && Array.isArray(data.tickableAmenities)) {
          return data.tickableAmenities;
        }
        if (Array.isArray(data)) {
          return data;
        }
      }
      
      return [];
    } catch (error) {
      console.error('❌ Erro ao parsear location_amenities:', error);
      return [];
    }
  };
  
  // Parse multi-language fields (pode vir como JSON string ou objeto)
  const parseMultiLangField = (data: any): { pt: string; en: string; es: string } => {
    const defaultValue = { pt: '', en: '', es: '' };
    
    if (!data) return defaultValue;
    
    try {
      if (typeof data === 'string') {
        const parsed = JSON.parse(data);
        return {
          pt: parsed.pt || '',
          en: parsed.en || '',
          es: parsed.es || ''
        };
      }
      
      if (typeof data === 'object') {
        return {
          pt: data.pt || '',
          en: data.en || '',
          es: data.es || ''
        };
      }
      
      return defaultValue;
    } catch (error) {
      console.error('❌ Erro ao parsear campo multilíngue:', error);
      return defaultValue;
    }
  };
  
  // ============================================================================
  // SAVE ADDRESS FIELDS (Step 02)
  // ============================================================================
  
  const saveAddressFields = async () => {
    console.log('🏠 SALVANDO ENDEREÇO (9 campos)');
    
    // Validações básicas ANTES de travar o botão
    if (!anuncioId) {
      console.error('❌ Anúncio sem ID');
      toast.error('❌ Erro: Anúncio sem ID');
      return false;
    }
    
    if (!formData.cep?.trim()) {
      console.error('❌ CEP vazio');
      toast.error('❌ Preencha o CEP');
      return false;
    }
    
    if (!formData.rua?.trim()) {
      console.error('❌ Rua vazia');
      toast.error('❌ Preencha a Rua');
      return false;
    }
    
    if (!formData.numero?.trim()) {
      console.error('❌ Número vazio');
      toast.error('❌ Preencha o Número');
      return false;
    }
    
    console.log('✅ Todas validações OK, iniciando save...');
    
    try {
      const url = `${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/save-field`;
      
      // Salvar 9 campos de endereço base
      const fieldsToSave = [
        { field: 'pais', value: formData.pais },
        { field: 'estado', value: formData.estado },
        { field: 'sigla_estado', value: formData.siglaEstado },
        { field: 'cep', value: formData.cep },
        { field: 'cidade', value: formData.cidade },
        { field: 'bairro', value: formData.bairro },
        { field: 'rua', value: formData.rua },
        { field: 'numero', value: formData.numero },
        { field: 'complemento', value: formData.complemento }
      ];
      
      for (const { field, value } of fieldsToSave) {
        const token = localStorage.getItem('rendizy-token');
        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': token || '',
          },
          body: JSON.stringify({ 
            anuncio_id: anuncioId, 
            field, 
            value 
          })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      console.log('✅ Endereço salvo com sucesso!');
      toast.success('✅ Endereço salvo!');
      calculateProgress(formData); // Atualizar progresso
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao salvar endereço:', error);
      toast.error('❌ Erro ao salvar endereço');
      return false;
    }
  };
  
  // ============================================================================
  // SAVE CHARACTERISTICS FIELDS (Step 02 - parte 2)
  // ============================================================================
  
  const saveCharacteristicsFields = async () => {
    console.log('🏡 SALVANDO CARACTERÍSTICAS (8 campos)');
    
    if (!anuncioId) {
      console.error('❌ Anúncio sem ID');
      toast.error('❌ Erro: Anúncio sem ID');
      return false;
    }
    
    console.log('✅ Validação OK, iniciando save...');
    
    try {
      const url = `${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/save-field`;
      
      // Salvar campos 10-17 (características)
      const fieldsToSave = [
        { field: 'mostrar_numero', value: formData.mostrarNumero },
        { field: 'tipo_acesso', value: formData.tipoAcesso },
        { field: 'instrucoes_acesso', value: formData.instrucoesAcesso },
        { field: 'estacionamento', value: formData.estacionamento },
        { field: 'tipo_estacionamento', value: formData.tipoEstacionamento },
        { field: 'internet_cabo', value: formData.internetCabo },
        { field: 'internet_wifi', value: formData.internetWifi }
      ];
      
      for (const { field, value } of fieldsToSave) {
        const token = localStorage.getItem('rendizy-token');
        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': token || '',
          },
          body: JSON.stringify({ 
            anuncio_id: anuncioId, 
            field, 
            value 
          })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      console.log('✅ Características salvas com sucesso!');
      toast.success('✅ Características salvas!');
      calculateProgress(formData);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao salvar características:', error);
      toast.error('❌ Erro ao salvar características');
      return false;
    }
  };
  
  // ============================================================================
  // ROOM MANAGEMENT (Step 03)
  // ============================================================================
  
  const addRoom = () => {
    const newRoomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRoom: Room = {
      id: newRoomId,
      type: '',
      typeName: '',
      customName: '',
      isShared: false,
      beds: {},
      photos: []
    };
    
    setFormData(prev => ({
      ...prev,
      rooms: [...prev.rooms, newRoom]
    }));
    
    toast.success('Cômodo adicionado!');
    
    // Scroll automático para o novo cômodo
    setTimeout(() => {
      const newRoomElement = roomCardRefs.current[newRoomId];
      if (newRoomElement) {
        newRoomElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight temporário
        newRoomElement.style.outline = '3px solid #3b82f6';
        newRoomElement.style.outlineOffset = '2px';
        setTimeout(() => {
          newRoomElement.style.outline = '';
          newRoomElement.style.outlineOffset = '';
        }, 2000);
      }
    }, 100);
  };
  
  const removeRoom = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rooms: prev.rooms.filter((_, i) => i !== index)
    }));
    
    // Recalcular totais
    calculateRoomTotals(formData.rooms.filter((_, i) => i !== index));
    toast.success('Cômodo removido!');
  };
  
  const updateRoom = (index: number, updates: Partial<Room>) => {
    setFormData(prev => {
      const newRooms = [...prev.rooms];
      newRooms[index] = { ...newRooms[index], ...updates };
      
      // Recalcular totais quando houver mudanças
      calculateRoomTotals(newRooms);
      
      return { ...prev, rooms: newRooms };
    });
  };
  
  const updateBedCount = (roomIndex: number, bedId: string, delta: number) => {
    setFormData(prev => {
      const newRooms = [...prev.rooms];
      const currentCount = newRooms[roomIndex].beds[bedId] || 0;
      const newCount = Math.max(0, currentCount + delta);
      
      newRooms[roomIndex].beds[bedId] = newCount;
      
      // Recalcular total de camas
      calculateRoomTotals(newRooms);
      
      return { ...prev, rooms: newRooms };
    });
  };
  
  // Calcular totais de quartos, banheiros e camas
  const calculateRoomTotals = (rooms: Room[]) => {
    let bedrooms = 0;
    let bathrooms = 0;
    let totalBeds = 0;

    const normalize = (v: unknown) =>
      String(v ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    
    rooms.forEach(room => {
      const roomType = ROOM_TYPES.find(rt => rt.id === room.type);
      
      // Contar quartos
      if (roomType?.category === 'bedroom') {
        bedrooms++;
      } else {
        // Fallback: se o payload veio com type/typeName fora do enum (ex.: "Suíte"), ainda conta.
        const hay = `${normalize(room.type)} ${normalize(room.typeName)} ${normalize(room.customName)}`;
        if (hay.includes('quarto') || hay.includes('suite')) {
          bedrooms++;
        }
      }
      
      // Contar banheiros (incluindo suítes com hasBathroom: true)
      if (roomType?.category === 'bathroom') {
        bathrooms++;
      } else if (roomType?.hasBathroom) {
        bathrooms++; // Suíte conta como banheiro também
      }
      
      // Contar total de camas
      Object.values(room.beds).forEach((count: number) => {
        totalBeds += count;
      });
    });
    
    setFormData(prev => ({
      ...prev,
      bedrooms,
      bathrooms,
      beds: totalBeds
    }));
  };
  
  // Upload de fotos por cômodo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || selectedRoomIndex === null) return;
    
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (!anuncioId) {
      toast.error('❌ Salve/crie o anúncio primeiro para enviar fotos com persistência');
      e.target.value = '';
      return;
    }
    
    setUploadingPhotos(true);
    
    try {
      const room = formData.rooms[selectedRoomIndex];
      const roomLabelRaw = room.customName || room.type || room.typeName || `room-${selectedRoomIndex + 1}`;
      const roomLabel = String(roomLabelRaw).trim().replace(/[^a-z0-9_-]+/gi, '_');

      const results = await Promise.all(
        files.map(async (file) => {
          const uploadRes = await photosApi.upload(file, anuncioId, roomLabel);
          if (!uploadRes.success || !uploadRes.data) {
            throw new Error(uploadRes.error || uploadRes.message || 'Falha no upload');
          }
          const p: any = uploadRes.data;
          const photo: Photo = {
            id: String(p.id),
            url: String(p.url),
            tags: [],
            path: p.path ? String(p.path) : undefined,
            room: p.room ? String(p.room) : roomLabel,
            order: typeof p.order === 'number' ? p.order : undefined,
          };
          return photo;
        })
      );

      const uploadedPhotos: Photo[] = results.filter(Boolean);
      
      // Adicionar fotos ao cômodo selecionado
      setFormData(prev => {
        const newRooms = [...prev.rooms];
        newRooms[selectedRoomIndex].photos.push(...uploadedPhotos);
        return { ...prev, rooms: newRooms };
      });

      toast.success(`${uploadedPhotos.length} foto(s) enviada(s) e adicionada(s)! Não esqueça de adicionar tags antes de salvar.`);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload das fotos');
    } finally {
      setUploadingPhotos(false);
      e.target.value = ''; // Limpar input
    }
  };
  
  // Deletar foto
  const deletePhoto = (photoId: string) => {
    if (selectedRoomIndex === null) return;
    
    setFormData(prev => {
      const newRooms = [...prev.rooms];
      newRooms[selectedRoomIndex].photos = newRooms[selectedRoomIndex].photos.filter(
        p => p.id !== photoId
      );
      return { ...prev, rooms: newRooms };
    });
    
    toast.success('Foto removida!');
  };
  
  // Seleção múltipla de fotos
  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };
  
  const selectAllPhotos = () => {
    if (selectedRoomIndex === null) return;
    const allPhotoIds = formData.rooms[selectedRoomIndex].photos.map(p => p.id);
    setSelectedPhotos(allPhotoIds);
  };
  
  const deselectAllPhotos = () => {
    setSelectedPhotos([]);
  };
  
  // Adicionar tags às fotos selecionadas
  const addTagsToSelectedPhotos = () => {
    if (selectedRoomIndex === null || pendingTags.length === 0) return;
    
    setFormData(prev => {
      const newRooms = [...prev.rooms];
      newRooms[selectedRoomIndex].photos = newRooms[selectedRoomIndex].photos.map(photo => {
        if (selectedPhotos.includes(photo.id)) {
          // Adicionar tags sem duplicar
          const newTags = [...new Set([...photo.tags, ...pendingTags])];
          return { ...photo, tags: newTags };
        }
        return photo;
      });
      return { ...prev, rooms: newRooms };
    });
    
    toast.success(`Tags adicionadas a ${selectedPhotos.length} foto(s)!`);
    setShowTagsModal(false);
    setPendingTags([]);
    setSelectedPhotos([]);
  };
  
  // Remover tag de uma foto
  const removePhotoTag = (photoId: string, tag: string) => {
    if (selectedRoomIndex === null) return;
    
    setFormData(prev => {
      const newRooms = [...prev.rooms];
      const photo = newRooms[selectedRoomIndex].photos.find(p => p.id === photoId);
      if (photo) {
        photo.tags = photo.tags.filter(t => t !== tag);
      }
      return { ...prev, rooms: newRooms };
    });
  };
  
  // Salvar rooms no backend
  const saveRoomsData = async () => {
    if (!anuncioId) {
      toast.error('❌ Erro: Anúncio sem ID');
      return false;
    }
    
    // VALIDAÇÃO OBRIGATÓRIA: Todas as fotos devem ter tags
    const photosWithoutTags: { roomIndex: number; roomName: string; photoCount: number }[] = [];
    
    formData.rooms.forEach((room, index) => {
      const photosWithoutTagsCount = room.photos.filter(photo => photo.tags.length === 0).length;
      if (photosWithoutTagsCount > 0) {
        photosWithoutTags.push({
          roomIndex: index,
          roomName: room.customName || room.typeName || `Cômodo #${index + 1}`,
          photoCount: photosWithoutTagsCount
        });
      }
    });
    
    if (photosWithoutTags.length > 0) {
      const roomsList = photosWithoutTags.map(r => 
        `• ${r.roomName}: ${r.photoCount} foto(s) sem tags`
      ).join('\n');
      
      toast.error(
        `⚠️ Obrigatório inserir tags nas imagens pois as plataformas (Airbnb, Booking) obrigatoriamente pedem essa configuração.\n\n${roomsList}`,
        { duration: 6000 }
      );
      return false;
    }
    
    try {
      const url = `${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/save-field`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
        },
        body: JSON.stringify({ 
          anuncio_id: anuncioId, 
          field: 'rooms', 
          value: JSON.stringify(formData.rooms)
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      
      console.log('✅ Cômodos salvos com sucesso!');
      toast.success('✅ Cômodos salvos!');
      calculateProgress(formData);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao salvar cômodos:', error);
      toast.error('❌ Erro ao salvar cômodos');
      return false;
    }
  };

  // ============================================================================
  // STEP 04: TOUR VIRTUAL - SAVE (FOTO DE CAPA)
  // ============================================================================

  const saveTourCoverPhoto = async () => {
    console.log('⭐ [SAVE] SALVANDO FOTO DE CAPA (TOUR)');

    if (!anuncioId) {
      toast.error('❌ ID do anúncio não encontrado');
      return false;
    }

    try {
      const url = `${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/save-field`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
        },
        body: JSON.stringify({
          anuncio_id: anuncioId,
          field: 'cover_photo_id',
          value: formData.coverPhotoId ?? null,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || data?.message || `HTTP ${response.status}`);

      if (formData.coverPhotoId) {
        toast.success('✅ Foto de capa salva!');
      } else {
        toast.success('✅ Foto de capa removida e salva!');
      }
      calculateProgress(formData);
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar foto de capa:', error);
      toast.error('❌ Erro ao salvar foto de capa');
      return false;
    }
  };
  
  // ============================================================================
  // STEP 05: AMENIDADES DO LOCAL - SAVE
  // ============================================================================
  
  const saveLocationAmenities = async () => {
    console.log('🏨 [SAVE] SALVANDO AMENIDADES DO LOCAL');
    
    if (!anuncioId) {
      toast.error('❌ ID do anúncio não encontrado');
      return false;
    }
    
    try {
      const url = `${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/save-field`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
        },
        body: JSON.stringify({
          anuncio_id: anuncioId,
          field: 'location_amenities',
          value: JSON.stringify(formData.locationAmenities)
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      
      console.log('✅ Amenidades do local salvas!');
      toast.success('✅ Amenidades do local salvas!');
      calculateProgress(formData);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao salvar amenidades:', error);
      toast.error('❌ Erro ao salvar amenidades');
      return false;
    }
  };
  
  // ============================================================================
  // STEP 06: AMENIDADES DA ACOMODAÇÃO - SAVE
  // ============================================================================
  
  const saveListingAmenities = async () => {
    console.log('🏠 [SAVE] SALVANDO AMENIDADES DA ACOMODAÇÃO');
    
    if (!anuncioId) {
      toast.error('❌ ID do anúncio não encontrado');
      return false;
    }
    
    try {
      const url = `${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/save-field`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
        },
        body: JSON.stringify({
          anuncio_id: anuncioId,
          field: 'listing_amenities',
          value: JSON.stringify(formData.listingAmenities)
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      
      console.log('✅ Amenidades da acomodação salvas!');
      toast.success('✅ Amenidades da acomodação salvas!');
      calculateProgress(formData);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao salvar amenidades:', error);
      toast.error('❌ Erro ao salvar amenidades');
      return false;
    }
  };
  
  // ============================================================================
  // STEP 07: DESCRIÇÃO - SAVE
  // ============================================================================
  
  const saveDescricao = async () => {
    console.log('📝 [SAVE] SALVANDO DESCRIÇÃO');
    
    if (!anuncioId) {
      toast.error('❌ ID do anúncio não encontrado');
      return false;
    }
    
    try {
      const url = `${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/save-field`;
      
      // Salvar cada campo multilíngue separadamente
      const ids = new Set<string>([
        ...customDescriptionFields.map((f) => f.id),
        ...Object.keys(customDescriptionValues),
      ]);
      const customValuesToSave: Record<string, MultiLangText> = {};
      for (const id of ids) {
        const v = customDescriptionValues[id] || { pt: '', en: '', es: '' };
        customValuesToSave[id] = { pt: v.pt || '', en: v.en || '', es: v.es || '' };
      }

      const fields = [
        { field: 'descricao_titulo', value: JSON.stringify(descricaoTitulo) },
        { field: 'notas_gerais', value: JSON.stringify(notasGerais) },
        { field: 'sobre_espaco', value: JSON.stringify(sobreEspaco) },
        { field: 'sobre_acesso', value: JSON.stringify(sobreAcesso) },
        { field: 'sobre_anfitriao', value: JSON.stringify(sobreAnfitriao) },
        { field: 'descricao_bairro', value: JSON.stringify(descricaoBairro) },
        { field: 'info_locomocao', value: JSON.stringify(infoLocomocao) },
        { field: CUSTOM_DESCRIPTION_VALUES_FIELD, value: JSON.stringify(customValuesToSave) },
      ];
      
      for (const { field, value } of fields) {
        const token = localStorage.getItem('rendizy-token');
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': token || '',
          },
          body: JSON.stringify({
            anuncio_id: anuncioId,
            field,
            value
          })
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(`Erro ao salvar ${field}: ${data.error || response.status}`);
        }
      }
      
      console.log('✅ Descrição salva com sucesso!');
      toast.success('✅ Descrição salva!');
      calculateProgress(formData);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao salvar descrição:', error);
      toast.error('❌ Erro ao salvar descrição');
      return false;
    }
  };
  
  // ============================================================================
  // STEP 08: RELACIONAMENTO - SAVE (Simplificado)
  // ============================================================================
  
  const saveRelacionamento = async () => {
    console.log('🤝 [SAVE] SALVANDO RELACIONAMENTO');
    
    if (!anuncioId) {
      toast.error('❌ ID do anúncio não encontrado');
      return false;
    }
    
    try {
      const url = `${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/save-field`;
      
      const fields = [
        { field: 'titular_imovel', value: titularImovel },
        { field: 'administrador_imovel', value: administradorImovel },
        { field: 'is_sublocacao', value: isSublocacao },
        { field: 'is_exclusivo', value: isExclusivo },
      ];
      
      for (const { field, value } of fields) {
        const token = localStorage.getItem('rendizy-token');
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': token || '',
          },
          body: JSON.stringify({
            anuncio_id: anuncioId,
            field,
            value
          })
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(`Erro ao salvar ${field}: ${data.error || response.status}`);
        }
      }
      
      console.log('✅ Relacionamento salvo!');
      toast.success('✅ Relacionamento salvo!');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao salvar relacionamento:', error);
      toast.error('❌ Erro ao salvar relacionamento');
      return false;
    }
  };
  
  // ============================================================================
  // STEP 01 - BÁSICO (Tipo e Identificação)
  // ============================================================================
  const saveBasicoFields = async () => {
    console.log('🏠 [SAVE] SALVANDO DADOS BÁSICOS');
    
    if (!anuncioId) {
      toast.error('❌ ID do anúncio não encontrado');
      return false;
    }
    
    // Validações
    if (!formData.title?.trim()) {
      toast.error('❌ Preencha a identificação interna');
      return false;
    }
    if (!formData.tipoLocal) {
      toast.error('❌ Selecione o tipo de local');
      return false;
    }
    if (!formData.tipoAcomodacao) {
      toast.error('❌ Selecione o tipo de acomodação');
      return false;
    }
    if (formData.modalidades.length === 0) {
      toast.error('❌ Selecione pelo menos uma modalidade');
      return false;
    }

    try {
      const url = `${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/save-field`;
      
      const fields = [
        { field: 'title', value: formData.title },
        { field: 'tipo_local', value: formData.tipoLocal },
        { field: 'tipo_acomodacao', value: formData.tipoAcomodacao },
        { field: 'subtype', value: formData.subtype },
        { field: 'modalidades', value: JSON.stringify(formData.modalidades) },
        { field: 'estrutura', value: formData.estrutura },
      ];

      for (const { field, value } of fields) {
        const token = localStorage.getItem('rendizy-token');
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': token || '',
          },
          body: JSON.stringify({
            anuncio_id: anuncioId,
            field,
            value
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(`Erro ao salvar ${field}: ${data.error || response.status}`);
        }
      }

      console.log('✅ Dados básicos salvos!');
      toast.success('✅ Dados básicos salvos!');
      calculateProgress(formData);
      return true;

    } catch (error) {
      console.error('❌ Erro ao salvar dados básicos:', error);
      toast.error('❌ Erro ao salvar dados básicos');
      return false;
    }
  };
  
  // ============================================================================
  // STEP 09 - PREÇOS LOCAÇÃO E VENDA
  // ============================================================================
  const savePrecosBase = async () => {
    console.log('💰 [SAVE] SALVANDO PREÇOS BASE');
    
    if (!anuncioId) {
      toast.error('❌ ID do anúncio não encontrado');
      return false;
    }

    try {
      const url = `${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/save-field`;
      
      const fields = [
        { field: 'tipo_negocio', value: tipoNegocio },
        { field: 'valor_aluguel', value: valorAluguel },
        { field: 'valor_iptu', value: valorIptu },
        { field: 'valor_condominio', value: valorCondominio },
        { field: 'taxa_servico', value: taxaServico },
        { field: 'valor_venda', value: valorVenda },
        { field: 'iptu_anual', value: iptuAnual },
        { field: 'aceita_financiamento', value: aceitaFinanciamento },
        { field: 'aceita_permuta', value: aceitaPermuta },
      ];

      for (const { field, value } of fields) {
        const token = localStorage.getItem('rendizy-token');
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': token || '',
          },
          body: JSON.stringify({
            anuncio_id: anuncioId,
            field,
            value
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(`Erro ao salvar ${field}: ${data.error || response.status}`);
        }
      }

      console.log('✅ Preços base salvos!');
      toast.success('✅ Preços salvos!');
      return true;

    } catch (error) {
      console.error('❌ Erro ao salvar preços:', error);
      toast.error('❌ Erro ao salvar preços');
      return false;
    }
  };

  // ============================================================================
  // STEP 10 - CONFIGURAÇÃO DE PREÇO TEMPORADA
  // ============================================================================
  const saveConfigPrecoTemporada = async () => {
    console.log('📅 [SAVE] SALVANDO CONFIGURAÇÃO TEMPORADA');
    
    if (!anuncioId) {
      toast.error('❌ ID do anúncio não encontrado');
      return false;
    }

    try {
      const url = `${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/save-field`;
      
      const fields = [
        { field: 'modo_config_preco', value: modoConfigPreco },
        { field: 'regiao', value: regiao },
        { field: 'moeda', value: moeda },
        {
          field: DISCOUNT_PACKAGES_OVERRIDE_FIELD,
          value: useDiscountPackagesOverride ? normalizeDiscountPackagesSettings(discountPackagesOverride) : null,
        },
        { field: 'valor_deposito', value: valorDeposito },
        { field: 'usar_precificacao_dinamica', value: usarPrecificacaoDinamica },
        { field: 'taxa_limpeza', value: taxaLimpeza },
        { field: 'taxa_pet', value: taxaPet },
        { field: 'taxa_servicos_extras', value: taxaServicosExtras },
      ];

      for (const { field, value } of fields) {
        const token = localStorage.getItem('rendizy-token');
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': token || '',
          },
          body: JSON.stringify({
            anuncio_id: anuncioId,
            field,
            value
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(`Erro ao salvar ${field}: ${data.error || response.status}`);
        }
      }

      console.log('✅ Configuração temporada salva!');
      toast.success('✅ Configuração salva!');
      return true;

    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error);
      toast.error('❌ Erro ao salvar configuração');
      return false;
    }
  };

  // ============================================================================
  // STEP 11 - PRECIFICAÇÃO INDIVIDUAL
  // ============================================================================
  const savePrecificacaoIndividual = async () => {
    console.log('🎯 [SAVE] SALVANDO PRECIFICAÇÃO INDIVIDUAL');
    
    if (!anuncioId) {
      toast.error('❌ ID do anúncio não encontrado');
      return false;
    }

    try {
      const url = `${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/save-field`;
      
      const fields = [
        { field: 'preco_base_noite', value: precoBaseNoite },
        {
          field: DISCOUNT_PACKAGES_OVERRIDE_FIELD,
          value: useDiscountPackagesOverride ? normalizeDiscountPackagesSettings(discountPackagesOverride) : null,
        },
        { field: 'periodos_sazonais', value: periodosSazonais },
        { field: 'precos_dia_semana', value: precosDiaSemana },
        { field: 'datas_especiais', value: datasEspeciais },
      ];

      for (const { field, value } of fields) {
        const token = localStorage.getItem('rendizy-token');
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': token || '',
          },
          body: JSON.stringify({
            anuncio_id: anuncioId,
            field,
            value
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(`Erro ao salvar ${field}: ${data.error || response.status}`);
        }
      }

      console.log('✅ Precificação individual salva!');
      toast.success('✅ Precificação salva!');

      try {
        localStorage.setItem('rendizy:propertiesRefresh', String(Date.now()));
        window.dispatchEvent(new Event('rendizy:properties:refresh'));
      } catch {
        // ignore
      }
      return true;

    } catch (error) {
      console.error('❌ Erro ao salvar precificação:', error);
      toast.error('❌ Erro ao salvar precificação');
      return false;
    }
  };

  // ============================================================================
  // STEP 12 - PREÇOS DERIVADOS
  // ============================================================================
  const savePrecosDeriados = async () => {
    console.log('👥 [SAVE] SALVANDO PREÇOS DERIVADOS');
    
    if (!anuncioId) {
      toast.error('❌ ID do anúncio não encontrado');
      return false;
    }

    try {
      const url = `${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/save-field`;
      
      const fields = [
        { field: 'variacao_por_hospedes', value: variacaoPorHospedes },
        { field: 'taxa_hospede_extra', value: taxaHospedeExtra },
        { field: 'cobrar_criancas', value: cobrarCriancas },
        { field: 'idade_minima_crianca', value: idadeMinimaCrianca },
        { field: 'idade_maxima_crianca', value: idadeMaximaCrianca },
        { field: 'desconto_crianca', value: descontoCrianca },
      ];

      for (const { field, value } of fields) {
        const token = localStorage.getItem('rendizy-token');
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': token || '',
          },
          body: JSON.stringify({
            anuncio_id: anuncioId,
            field,
            value
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(`Erro ao salvar ${field}: ${data.error || response.status}`);
        }
      }

      console.log('✅ Preços derivados salvos!');
      toast.success('✅ Preços derivados salvos!');
      return true;

    } catch (error) {
      console.error('❌ Erro ao salvar preços derivados:', error);
      toast.error('❌ Erro ao salvar preços derivados');
      return false;
    }
  };
  
  // ============================================================================
  // SAVE DATA
  // ============================================================================
  
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const normalizeForStorage = (input: FormData, existing: any = {}) => {
        const next: any = { ...(existing || {}) };

        // Base fields
        next.tipoAcomodacao = input.tipoAcomodacao;
        next.tipoLocal = input.tipoLocal;
        next.subtype = input.subtype;
        next.title = input.title;
        next.internalId = input.internalId;
        next.modalidades = input.modalidades;
        next.estrutura = input.estrutura;

        // Address + localization
        next.pais = input.pais;
        next.estado = input.estado;
        next.sigla_estado = input.siglaEstado;
        next.cep = input.cep;
        next.cidade = input.cidade;
        next.bairro = input.bairro;
        next.rua = input.rua;
        next.numero = input.numero;
        next.complemento = input.complemento;
        next.mostrar_numero = input.mostrarNumero;
        next.tipo_acesso = input.tipoAcesso;
        next.instrucoes_acesso = input.instrucoesAcesso;
        next.estacionamento = input.estacionamento;
        next.tipo_estacionamento = input.tipoEstacionamento;
        next.internet_cabo = input.internetCabo;
        next.internet_wifi = input.internetWifi;
        next.address = input.address;

        // Rooms + counts
        next.rooms = input.rooms;
        next.bedrooms = input.bedrooms;
        next.bathrooms = input.bathrooms;
        next.beds = input.beds;
        next.guests = input.guests;

        // Cover photo: persist only stable identifiers
        next.cover_photo_id = input.coverPhotoId ?? null;

        // Amenities: persist under canonical snake_case keys
        next.location_amenities = input.locationAmenities;
        next.listing_amenities = input.listingAmenities;

        // Description
        next.description = input.description;

        // Cleanup: remove camelCase duplicates if present
        delete next.locationAmenities;
        delete next.listingAmenities;
        delete next.coverPhotoId;

        // Never persist volatile blob/data URLs as coverPhoto
        const coverPhoto = (next.coverPhoto ?? input.coverPhoto) as unknown;
        if (typeof coverPhoto === 'string' && (coverPhoto.startsWith('blob:') || coverPhoto.startsWith('data:'))) {
          delete next.coverPhoto;
        }

        return next;
      };

      // ✅ NOVO ANÚNCIO: Criar com INSERT
      if (!anuncioId) {
        const novoId = crypto.randomUUID();
        const token = localStorage.getItem('rendizy-token');

        const initialData = normalizeForStorage(formData, {});

        const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/create`, {
          method: 'POST',
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': token || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: novoId,
            initial: initialData,
          })
        });
        
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || data?.message || `Erro ao criar anúncio (HTTP ${response.status})`);
        }
        toast.success('✅ Rascunho criado com sucesso!');
        calculateProgress(formData);
        
        // Redirecionar para a URL de edição com o ID
        navigate(`/anuncios-ultimate/${novoId}`);
        return;
      }
      
      // ✅ ANÚNCIO EXISTENTE: Atualizar com PATCH
      const token = localStorage.getItem('rendizy-token');

      // IMPORTANT: PATCH replaces `data`. We must merge with existing data to avoid wiping
      // fields that are not currently hydrated in formData.
      const currentResp = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/${anuncioId}`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': token || '',
          'Content-Type': 'application/json'
        }
      });

      if (!currentResp.ok) {
        const data = await currentResp.json().catch(() => null);
        throw new Error(data?.error || data?.message || `Erro ao carregar anúncio atual (HTTP ${currentResp.status})`);
      }

      const currentPayload = await currentResp.json();
      const existingData = currentPayload?.anuncio?.data || {};
      const mergedData = normalizeForStorage(formData, existingData);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/${anuncioId}`, {
        method: 'PATCH',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': token || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title || 'Sem título',
          data: mergedData,
        })
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || data?.message || `Erro ao salvar (HTTP ${response.status})`);
      }
      
      toast.success('✅ Anúncio salvo com sucesso!');
      calculateProgress(formData);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar anúncio');
    } finally {
      setIsSaving(false);
    }
  };
  
  // ============================================================================
  // PROGRESS CALCULATION
  // ============================================================================
  
  const calculateProgress = (data: FormData) => {
    const completed: string[] = [];
    
    // ✅ Tab 1: Básico (TODOS os campos obrigatórios)
    if (
      data.title && 
      data.tipoLocal && 
      data.tipoAcomodacao && 
      data.subtype && 
      data.modalidades.length > 0 &&
      data.estrutura
    ) {
      completed.push('basico');
    }
    
    // ✅ Tab 2: Localização (validar campos obrigatórios)
    if (
      data.cep && 
      data.rua && 
      data.numero && 
      data.cidade && 
      data.estado
    ) {
      completed.push('localizacao');
    }
    
    // ✅ Tab 3: Cômodos (validar rooms com fotos)
    if (data.rooms.length > 0 && data.rooms.some(r => r.photos.length > 0)) {
      completed.push('comodos');
    }
    
    // ✅ Tab 4: Tour (persistido via coverPhotoId / cover_photo_id)
    if (data.coverPhotoId) {
      completed.push('tour');
    }
    
    // Tab 5: Amenidades Local (opcional)
    // completed.push('amenidades-local');
    
    // Tab 6: Amenidades Acomodação (opcional)
    // completed.push('amenidades-acomodacao');
    
    // ✅ Tab 7: Descrição
    if (data.description && data.description.length >= 50) {
      completed.push('descricao');
    }
    
    // Tabs Financeiro (opcional - marcar quando implementados)
    // completed.push('relacionamento');
    // completed.push('precos-base');
    // completed.push('precos-temporada');
    // completed.push('precos-individuais');
    // completed.push('precos-derivados');
    
    // Tabs Configurações (opcional - marcar quando implementados)
    // completed.push('config-reservas');
    // completed.push('config-checkin');
    // completed.push('config-regras');
    // completed.push('config-politicas');
    // completed.push('config-integracao');
    
    setCompletedTabs(completed);
  };
  
  // ============================================================================
  // UPDATE HELPERS
  // ============================================================================
  
  const updateField = (field: string, value: any) => {
    setFormData(prev => ({...prev, [field]: value}));
  };
  
  const updateAddressField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: {...prev.address, [field]: value}
    }));
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/anuncios-ultimate')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                {id ? 'Editar Anúncio' : 'Novo Anúncio'}
                {(formData.internalId?.trim() || formData.title?.trim()) ? (
                  <Badge
                    variant="outline"
                    className="text-xs font-medium text-slate-700 bg-white"
                    title={formData.internalId?.trim() || formData.title?.trim()}
                  >
                    {formData.internalId?.trim() || formData.title?.trim()}
                  </Badge>
                ) : null}
                {id ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenPublicSite}
                    disabled={publicSiteLoading}
                    className="h-7 px-2 text-xs gap-1"
                  >
                    {publicSiteLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3 h-3" />
                    )}
                    Veja no site
                  </Button>
                ) : null}
              </h1>
              <p className="text-sm text-slate-500">
                Progresso: {completedTabs.length}/17 seções • Conteúdo (7) + Financeiro (5) + Configurações (5)
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Tudo
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Tabs Container */}
      <Card className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b bg-slate-50/50 p-4">
            {/* Grupos de Steps */}
            <div className="space-y-4">
              {/* Grupo 1: CONTEÚDO */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 px-2">
                  📝 Conteúdo do Anúncio
                </h3>
                <TabsList className="grid w-full grid-cols-7 h-auto gap-1">
                  <TabsTrigger value="basico" className="relative">
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Básico</span>
                      {completedTabs.includes('basico') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger value="localizacao" className="relative">
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Localização</span>
                      {completedTabs.includes('localizacao') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger value="comodos" className="relative">
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Cômodos</span>
                      {completedTabs.includes('comodos') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger value="tour" className="relative">
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Tour Virtual</span>
                      {completedTabs.includes('tour') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger value="amenidades-local" className="relative">
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Amenidades Local</span>
                      {completedTabs.includes('amenidades-local') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger value="amenidades-acomodacao" className="relative">
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Amenidades Acomod.</span>
                      {completedTabs.includes('amenidades-acomodacao') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger value="descricao" className="relative">
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Descrição</span>
                      {completedTabs.includes('descricao') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Grupo 2: FINANCEIRO */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 px-2">
                  💰 Financeiro
                </h3>
                <TabsList className="grid w-full grid-cols-5 h-auto gap-1">
                  <TabsTrigger value="relacionamento" className="relative">
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Relacionamento</span>
                      {completedTabs.includes('relacionamento') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger value="precos-base" className="relative">
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Preços Base</span>
                      {completedTabs.includes('precos-base') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                  
                  {/* @MODALIDADE: [TEMPORADA] - Tab só visível quando modalidade temporada está ativa */}
                  <TabsTrigger value="precos-temporada" className={`relative ${!isTemporada ? 'hidden' : ''}`}>
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Temporada</span>
                      {completedTabs.includes('precos-temporada') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                  
                  {/* @MODALIDADE: [TEMPORADA] - Tab só visível quando modalidade temporada está ativa */}
                  <TabsTrigger value="precos-individuais" className={`relative ${!isTemporada ? 'hidden' : ''}`}>
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Preços Individuais</span>
                      {completedTabs.includes('precos-individuais') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                  
                  {/* @MODALIDADE: [TEMPORADA] - Tab só visível quando modalidade temporada está ativa */}
                  <TabsTrigger value="precos-derivados" className={`relative ${!isTemporada ? 'hidden' : ''}`}>
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Preços Derivados</span>
                      {completedTabs.includes('precos-derivados') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Grupo 3: CONFIGURAÇÕES */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 px-2">
                  ⚙️ Configurações
                </h3>
                <TabsList className="grid w-full grid-cols-5 h-auto gap-1">
                  <TabsTrigger value="config-reservas" className="relative">
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Reservas</span>
                      {completedTabs.includes('config-reservas') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger value="config-checkin" className="relative">
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Check-in</span>
                      {completedTabs.includes('config-checkin') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger value="config-regras" className="relative">
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Regras Casa</span>
                      {completedTabs.includes('config-regras') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger value="config-politicas" className="relative">
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Políticas</span>
                      {completedTabs.includes('config-politicas') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger value="config-integracao" className="relative">
                    <div className="flex flex-col items-center gap-1 py-2">
                      <span className="font-medium text-xs">Integração</span>
                      {completedTabs.includes('config-integracao') && (
                        <Check className="w-3 h-3 text-green-600 absolute -top-0.5 -right-0.5" />
                      )}
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* TAB 1: BÁSICO */}
            <TabsContent value="basico" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Tipo e Identificação</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Que tipo de propriedade você está anunciando?
                  </p>
                </div>
                
                {/* Identificação Interna */}
                <div>
                  <Label htmlFor="title" className="text-sm font-semibold">
                    Identificação Interna
                  </Label>
                  <p className="text-xs text-slate-500 mb-2">
                    Nome para identificar este imóvel no painel administrativo
                  </p>
                  <Input
                    id="title"
                    placeholder="Ex: Apartamento Copacabana 01"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Tipo de Local */}
                <div>
                  <Label htmlFor="tipoLocal" className="text-sm font-semibold">
                    Tipo de local
                  </Label>
                  <p className="text-xs text-slate-500 mb-2">
                    Qual é o tipo de local?
                  </p>
                  <select
                    id="tipoLocal"
                    aria-label="Tipo de local"
                    value={formData.tipoLocal}
                    onChange={(e) => updateField('tipoLocal', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o tipo de local</option>
                    <option value="acomodacao_movel">Acomodação Móvel</option>
                    <option value="albergue">Albergue</option>
                    <option value="apartamento">Apartamento</option>
                    <option value="apartamento_residencial">Apartamento/Residencial</option>
                    <option value="bangalo">Bangalô</option>
                    <option value="barco">Barco</option>
                    <option value="barco_beira">Barco/Beira</option>
                    <option value="boutique">Boutique Hotel</option>
                    <option value="cabana">Cabana</option>
                    <option value="cama_cafe">Cama e Café (B&B)</option>
                    <option value="camping">Camping</option>
                    <option value="casa">Casa</option>
                    <option value="casa_movel">Casa Móvel</option>
                    <option value="castelo">Castelo</option>
                    <option value="chale">Chalé</option>
                    <option value="chale_camping">Chalé (Área de Camping)</option>
                    <option value="condominio">Condomínio</option>
                    <option value="estalagem">Estalagem</option>
                    <option value="fazenda">Fazenda para Viajantes</option>
                    <option value="hotel">Hotel</option>
                    <option value="hotel_boutique">Hotel Boutique</option>
                    <option value="hostel">Hostel</option>
                    <option value="iate">Iate</option>
                    <option value="industrial">Industrial</option>
                    <option value="motel">Motel/Carro</option>
                    <option value="pousada">Pousada Exclusiva</option>
                    <option value="residencia">Residência</option>
                    <option value="resort">Resort</option>
                    <option value="treehouse">Treehouse (Casa na Árvore)</option>
                    <option value="villa">Villa/Casa</option>
                  </select>
                </div>

                {/* Tipo de Acomodação */}
                <div>
                  <Label htmlFor="tipoAcomodacao" className="text-sm font-semibold">
                    Tipo de acomodação
                  </Label>
                  <p className="text-xs text-slate-500 mb-2">
                    Selecione o tipo de acomodação
                  </p>
                  <select
                    id="tipoAcomodacao"
                    aria-label="Tipo de acomodação"
                    value={formData.tipoAcomodacao}
                    onChange={(e) => updateField('tipoAcomodacao', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione</option>
                    <option value="apartamento">Apartamento</option>
                    <option value="bangalo">Bangalô</option>
                    <option value="cabana">Cabana</option>
                    <option value="camping">Camping</option>
                    <option value="capsula">Cápsula/Trailer/Casa Móvel</option>
                    <option value="casa">Casa</option>
                    <option value="casa_dormitorios">Casa em Dormitórios</option>
                    <option value="chale">Chalé</option>
                    <option value="condominio">Condomínio</option>
                    <option value="dormitorio">Dormitório</option>
                    <option value="estudio">Estúdio</option>
                    <option value="holiday_home">Holiday Home</option>
                    <option value="hostel">Hostel</option>
                    <option value="hotel">Hotel</option>
                    <option value="iate">Iate</option>
                    <option value="industrial">Industrial</option>
                    <option value="loft">Loft</option>
                    <option value="quarto_compartilhado">Quarto Compartilhado</option>
                    <option value="quarto_inteiro">Quarto Inteiro</option>
                    <option value="quarto_privado">Quarto Privado</option>
                    <option value="suite">Suíte</option>
                    <option value="treehouse">Treehouse</option>
                    <option value="villa">Villa/Casa</option>
                  </select>
                </div>

                {/* Modalidades */}
                <div>
                  <Label className="text-sm font-semibold">
                    Modalidades
                  </Label>
                  <p className="text-xs text-slate-500 mb-3">
                    Em quais modalidades essa unidade estará disponível?
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="temporada"
                        checked={formData.modalidades.includes('temporada')}
                        onCheckedChange={(checked) => {
                          const newModalidades = checked
                            ? [...formData.modalidades, 'temporada']
                            : formData.modalidades.filter(m => m !== 'temporada');
                          updateField('modalidades', newModalidades);
                        }}
                      />
                      <label htmlFor="temporada" className="text-sm font-medium">
                        Aluguel por temporada
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="compra-venda"
                        checked={formData.modalidades.includes('compra-venda')}
                        onCheckedChange={(checked) => {
                          const newModalidades = checked
                            ? [...formData.modalidades, 'compra-venda']
                            : formData.modalidades.filter(m => m !== 'compra-venda');
                          updateField('modalidades', newModalidades);
                        }}
                      />
                      <label htmlFor="compra-venda" className="text-sm font-medium">
                        Compra e venda
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="locacao"
                        checked={formData.modalidades.includes('locacao')}
                        onCheckedChange={(checked) => {
                          const newModalidades = checked
                            ? [...formData.modalidades, 'locacao']
                            : formData.modalidades.filter(m => m !== 'locacao');
                          updateField('modalidades', newModalidades);
                        }}
                      />
                      <label htmlFor="locacao" className="text-sm font-medium">
                        Locação residencial
                      </label>
                    </div>
                  </div>
                </div>

                {/* Subtipo */}
                <div>
                  <Label htmlFor="subtype" className="text-sm font-semibold">
                    Subtipo
                  </Label>
                  <p className="text-xs text-slate-500 mb-2">
                    Qual é o subtipo desta acomodação?
                  </p>
                  <select
                    id="subtype"
                    aria-label="Subtipo"
                    value={formData.subtype}
                    onChange={(e) => updateField('subtype', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o subtipo</option>
                    <option value="entire_place">Imóvel Inteiro</option>
                    <option value="private_room">Quarto Privativo</option>
                    <option value="shared_room">Quarto Compartilhado</option>
                  </select>
                </div>

                {/* Estrutura do Anúncio */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">
                    Estrutura do Anúncio
                  </Label>
                  <p className="text-xs text-slate-500 mb-3">
                    Selecione para as unidades do local serem gerenciadas individualmente
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Anúncio Individual */}
                    <div
                      onClick={() => updateField('estrutura', 'individual')}
                      className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                        formData.estrutura === 'individual'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          formData.estrutura === 'individual'
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-300'
                        }`}>
                          {formData.estrutura === 'individual' && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 mb-1">
                            Anúncio Individual
                          </p>
                          <p className="text-xs text-gray-500">
                            Casa, apartamento sem prédio, etc
                          </p>
                          <div className="mt-3 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-gray-600">
                                Anunciado no local: <strong className="text-gray-900">Edificado</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span className="text-gray-600">
                                Previsibilidade de acomodação: <strong className="text-gray-900">Editáveis</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Anúncio Vinculado */}
                    <div
                      onClick={() => updateField('estrutura', 'vinculado')}
                      className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                        formData.estrutura === 'vinculado'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          formData.estrutura === 'vinculado'
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-300'
                        }`}>
                          {formData.estrutura === 'vinculado' && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 mb-1">
                            Anúncio Vinculado
                          </p>
                          <p className="text-xs text-gray-500">
                            Apartamento em prédio, quarto em hotel, etc
                          </p>
                          <div className="mt-3 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                              <span className="text-gray-600">
                                Anunciado no local: <strong className="text-gray-900">Herdados</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span className="text-gray-600">
                                Previsibilidade de acomodação: <strong className="text-gray-900">Editáveis</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botão Salvar */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={saveBasicoFields}
                    disabled={isSaving}
                    className="bg-slate-900"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Dados Básicos
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* TAB 2: LOCALIZAÇÃO - 17 CAMPOS COMPLETOS */}
            <TabsContent value="localizacao" className="mt-0">
              <div className="space-y-6 p-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Localização e Endereço</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Preencha o endereço completo do imóvel para facilitar a busca dos hóspedes
                  </p>
                </div>
                
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Coluna 1: Formulário de Endereço */}
                  <div className="space-y-4">
                    {/* País */}
                    <div>
                      <Label htmlFor="pais">País</Label>
                      <Select
                        value={formData.pais}
                        onValueChange={(value) => updateField('pais', value)}
                      >
                        <SelectTrigger id="pais">
                          <SelectValue placeholder="Selecione o país" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Brasil">Brasil (BR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Estado + Sigla */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="estado">Estado</Label>
                        <Input
                          id="estado"
                          placeholder="Rio de Janeiro"
                          value={formData.estado}
                          onChange={(e) => updateField('estado', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="siglaEstado">Sigla</Label>
                        <Input
                          id="siglaEstado"
                          placeholder="RJ"
                          maxLength={2}
                          value={formData.siglaEstado}
                          onChange={(e) => updateField('siglaEstado', e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>
                    
                    {/* CEP + Botão Buscar */}
                    <div>
                      <Label htmlFor="cep">CEP</Label>
                      <div className="flex gap-2">
                        <Input
                          id="cep"
                          placeholder="00000-000"
                          value={formData.cep}
                          onChange={(e) => updateField('cep', formatarCep(e.target.value))}
                          maxLength={9}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => buscarCep(formData.cep)}
                          disabled={String(formData.cep || '').replace(/\D/g, '').length !== 8}
                        >
                          Buscar
                        </Button>
                      </div>
                    </div>
                    
                    {/* Cidade */}
                    <div>
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        placeholder="Armação dos Búzios"
                        value={formData.cidade}
                        onChange={(e) => updateField('cidade', e.target.value)}
                      />
                    </div>
                    
                    {/* Bairro */}
                    <div>
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input
                        id="bairro"
                        placeholder="Praia Rasa"
                        value={formData.bairro}
                        onChange={(e) => updateField('bairro', e.target.value)}
                      />
                    </div>
                    
                    {/* Rua + Número */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="rua">Rua</Label>
                        <Input
                          id="rua"
                          placeholder="Rua do Conteiro"
                          value={formData.rua}
                          onChange={(e) => updateField('rua', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="numero">Número</Label>
                        <Input
                          id="numero"
                          placeholder="N 156-a"
                          value={formData.numero}
                          onChange={(e) => updateField('numero', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {/* Complemento */}
                    <div>
                      <Label htmlFor="complemento">Complemento (opcional)</Label>
                      <Input
                        id="complemento"
                        placeholder="Piscada Recanto das Palmeiras"
                        value={formData.complemento}
                        onChange={(e) => updateField('complemento', e.target.value)}
                      />
                    </div>
                    
                    {/* Botão Salvar Endereço */}
                    <Button
                      type="button"
                      onClick={saveAddressFields}
                      className="w-full font-semibold"
                      variant="default"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Endereço
                    </Button>
                    
                    {/* Mostrar Número do Endereço */}
                    <div>
                      <Label>Mostrar número do endereço ao público?</Label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant={formData.mostrarNumero === 'ocultar' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateField('mostrarNumero', 'ocultar')}
                          className="flex-1"
                        >
                          Ocultar
                        </Button>
                        <Button
                          type="button"
                          variant={formData.mostrarNumero === 'individual' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateField('mostrarNumero', 'individual')}
                          className="flex-1"
                        >
                          Individual
                        </Button>
                      </div>
                    </div>
                    
                    {/* Tipo de Acesso */}
                    <div>
                      <Label htmlFor="tipoAcesso">Tipo de Acesso</Label>
                      <Select
                        value={formData.tipoAcesso}
                        onValueChange={(value) => updateField('tipoAcesso', value)}
                      >
                        <SelectTrigger id="tipoAcesso">
                          <SelectValue placeholder="Como os hóspedes entram?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portaria">Portaria</SelectItem>
                          <SelectItem value="codigo">Código de Acesso</SelectItem>
                          <SelectItem value="livre">Acesso Livre</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Instruções de Acesso */}
                    <div>
                      <Label htmlFor="instrucoesAcesso">Instruções de Acesso (opcional)</Label>
                      <Textarea
                        id="instrucoesAcesso"
                        placeholder="Ex: Informar ao porteiro o nome do proprietário. Código da porta é 1234#"
                        value={formData.instrucoesAcesso}
                        onChange={(e) => updateField('instrucoesAcesso', e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  {/* Coluna 2: Mapa Placeholder */}
                  <div className="bg-slate-100 rounded-lg flex items-center justify-center p-8 min-h-[400px]">
                    <div className="text-center text-slate-500">
                      <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                      <p className="text-sm">Preencha o CEP para visualizar o mapa</p>
                    </div>
                  </div>
                </div>
                
                {/* Características do Local */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h3 className="text-lg font-semibold mb-2">Características do Local</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Informações que os usuários vêem ao escolher as modalidades
                  </p>
                  
                  <div className="space-y-3">
                    {/* Estacionamento */}
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Car className="w-5 h-5 text-slate-600" />
                        <div>
                          <p className="font-medium text-sm">Estacionamento</p>
                          <p className="text-xs text-slate-500">Ex: Beco - Interno de garagem</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={formData.estacionamento ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateField('estacionamento', true)}
                        >
                          Sim
                        </Button>
                        <Button
                          type="button"
                          variant={!formData.estacionamento ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateField('estacionamento', false)}
                        >
                          Não
                        </Button>
                      </div>
                    </div>
                    
                    {/* Internet a Cabo */}
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Wifi className="w-5 h-5 text-slate-600" />
                        <div>
                          <p className="font-medium text-sm">Internet a Cabo</p>
                          <p className="text-xs text-slate-500">Ex: Banda - Fibra óptica</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={formData.internetCabo ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateField('internetCabo', true)}
                        >
                          Sim
                        </Button>
                        <Button
                          type="button"
                          variant={!formData.internetCabo ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateField('internetCabo', false)}
                        >
                          Não
                        </Button>
                      </div>
                    </div>
                    
                    {/* Internet Wi-Fi */}
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Wifi className="w-5 h-5 text-slate-600" />
                        <div>
                          <p className="font-medium text-sm">Internet Wi-Fi</p>
                          <p className="text-xs text-slate-500">Ex: Banda - Fibra óptica</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={formData.internetWifi ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateField('internetWifi', true)}
                        >
                          Sim
                        </Button>
                        <Button
                          type="button"
                          variant={!formData.internetWifi ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateField('internetWifi', false)}
                        >
                          Não
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Botão Salvar Características */}
                  <Button
                    type="button"
                    onClick={saveCharacteristicsFields}
                    className="w-full mt-4 font-semibold"
                    variant="secondary"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Características
                  </Button>
                </div>
                
                {/* Fotos relacionadas ao endereço */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h3 className="text-lg font-semibold mb-2">Fotos relacionadas ao endereço</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Adicione fotos do entorno, fachada e áreas sociais do endereço. Arraste para reordenar
                  </p>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors cursor-pointer">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm text-slate-500 mb-2">
                      Arraste suas imagens aqui ou clique para selecionar
                    </p>
                    <Button variant="outline" size="sm" type="button">
                      Selecionar imagens
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* TAB 3: CÔMODOS */}
            {/* TAB 3: CÔMODOS - SISTEMA COMPLETO COM ROOMS[] */}
            <TabsContent value="comodos" className="mt-0">
              <div className="space-y-6 p-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">🏠 Cômodos e Fotos</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Adicione cômodos, configure tipos, adicione fotos e organize com tags
                  </p>
                </div>
                
                {/* Resumo dos Totais */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-900">{formData.rooms.length}</p>
                    <p className="text-xs text-blue-700">Cômodos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-900">{formData.bedrooms}</p>
                    <p className="text-xs text-blue-700">Quartos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-900">{formData.bathrooms}</p>
                    <p className="text-xs text-blue-700">Banheiros (+ Suítes)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-900">{formData.rooms.reduce((acc, r) => acc + r.photos.length, 0)}</p>
                    <p className="text-xs text-blue-700">Fotos</p>
                  </div>
                </div>
                
                {/* Botão Adicionar Cômodo */}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={addRoom}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Cômodo
                  </Button>
                </div>
                
                {/* Lista de Cômodos */}
                {formData.rooms.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum cômodo adicionado</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Adicione cômodos para configurar tipos, camas e fotos
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.rooms.map((room, index) => (
                      <div 
                        key={room.id}
                        ref={(el) => {
                          roomCardRefs.current[room.id] = el;
                        }}
                        className="bg-white rounded-lg shadow p-6 space-y-4"
                        onClick={() => setSelectedRoomIndex(index)}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Cômodo #{index + 1}</h3>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRoom(index);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {/* Tipo de Cômodo */}
                        <div>
                          <Label className="text-sm font-medium mb-2">Tipo de Cômodo</Label>
                          <Select
                            key={`select-type-${room.id}`}
                            value={room.type || undefined}
                            onValueChange={(value) => {
                              const roomType = ROOM_TYPES.find(rt => rt.id === value);
                              if (roomType) {
                                updateRoom(index, {
                                  type: value,
                                  typeName: roomType.name,
                                });
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROOM_TYPES.map(rt => (
                                <SelectItem key={rt.id} value={rt.id}>
                                  {rt.icon} {rt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Nome Personalizado (se tipo = "outras") */}
                        {room.type === 'outras' && (
                          <div>
                            <Label className="text-sm font-medium mb-2">Nome Personalizado</Label>
                            <Select
                              key={`select-custom-${room.id}`}
                              value={room.customName || undefined}
                              onValueChange={(value) => updateRoom(index, { customName: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione ou especifique" />
                              </SelectTrigger>
                              <SelectContent>
                                {CUSTOM_SPACE_NAMES.map(name => (
                                  <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {/* Cômodo Compartilhado */}
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`shared-${room.id}`}
                            checked={room.isShared}
                            onCheckedChange={(checked) => updateRoom(index, { isShared: !!checked })}
                          />
                          <Label htmlFor={`shared-${room.id}`} className="text-sm cursor-pointer">
                            Cômodo compartilhado
                          </Label>
                        </div>
                        
                        {/* Camas (se for quarto/sala) */}
                        {room.type && (ROOM_TYPES.find(rt => rt.id === room.type)?.category === 'bedroom' || 
                                      ROOM_TYPES.find(rt => rt.id === room.type)?.category === 'living') && (
                          <div className="border-t border-slate-200 pt-4">
                            <Label className="text-sm font-medium mb-3 block">Camas</Label>
                            <div className="grid grid-cols-2 gap-3">
                              {BED_TYPES.map(bed => (
                                <div key={bed.id} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                                  <span className="text-xs">{bed.icon} {bed.name}</span>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => updateBedCount(index, bed.id, -1)}
                                    >
                                      -
                                    </Button>
                                    <span className="text-xs w-6 text-center">{room.beds[bed.id] || 0}</span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => updateBedCount(index, bed.id, 1)}
                                    >
                                      +
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Fotos do Cômodo */}
                        <div className="border-t border-slate-200 pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-sm font-medium">
                              Fotos ({room.photos.length})
                              {selectedPhotos.length > 0 && selectedRoomIndex === index && (
                                <span className="text-xs ml-2 text-blue-600">
                                  ({selectedPhotos.length} selecionada{selectedPhotos.length > 1 ? 's' : ''})
                                </span>
                              )}
                            </Label>
                            <div className="flex gap-2">
                              {room.photos.length > 0 && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedRoomIndex(index);
                                      selectAllPhotos();
                                    }}
                                  >
                                    Selecionar Todas
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRoomIndex(index);
                                      if (selectedPhotos.length === 0 || selectedRoomIndex !== index) {
                                        selectAllPhotos();
                                        setTimeout(() => setShowTagsModal(true), 100);
                                      } else {
                                        setShowTagsModal(true);
                                      }
                                    }}
                                    className="bg-slate-900 text-white hover:bg-slate-800"
                                  >
                                    Adicionar Tags {selectedPhotos.length > 0 && selectedRoomIndex === index && `(${selectedPhotos.length})`}
                                  </Button>
                                </>
                              )}
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                id={`photo-upload-${room.id}`}
                                className="hidden"
                                onChange={(e) => handlePhotoUpload(e)}
                                aria-label="Upload de fotos do cômodo"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRoomIndex(index);
                                  document.getElementById(`photo-upload-${room.id}`)?.click();
                                }}
                                disabled={uploadingPhotos}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                {uploadingPhotos ? '⏳ Enviando...' : 'Adicionar Fotos'}
                              </Button>
                            </div>
                          </div>
                          
                          {room.photos.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2">
                              {room.photos.map(photo => (
                                <div key={photo.id} className="relative group">
                                  {selectedRoomIndex === index && (
                                    <Checkbox
                                      checked={selectedPhotos.includes(photo.id)}
                                      onCheckedChange={() => togglePhotoSelection(photo.id)}
                                      className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 bg-white border-2"
                                    />
                                  )}
                                  <img
                                    src={photo.url}
                                    alt=""
                                    className={`w-full h-24 object-cover rounded border ${
                                      selectedPhotos.includes(photo.id) && selectedRoomIndex === index
                                        ? 'border-blue-500 border-2'
                                        : 'border-slate-200'
                                    } ${
                                      selectedRoomIndex === index ? 'cursor-pointer' : 'cursor-default'
                                    }`}
                                    onClick={() => selectedRoomIndex === index && togglePhotoSelection(photo.id)}
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="destructive"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => deletePhoto(photo.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                  {photo.tags.length > 0 && (
                                    <div className="absolute bottom-1 left-1 flex gap-1">
                                      {photo.tags.slice(0, 2).map((tag, i) => (
                                        <span key={i} className="text-[10px] px-1 py-0.5 bg-blue-600 text-white rounded">
                                          {tag.substring(0, 8)}...
                                        </span>
                                      ))}
                                      {photo.tags.length > 2 && (
                                        <span className="text-[10px] px-1 py-0.5 bg-slate-600 text-white rounded">
                                          +{photo.tags.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-slate-400 text-sm">
                              Nenhuma foto adicionada
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Botão Salvar Cômodos */}
                {formData.rooms.length > 0 && (
                  <div className="flex justify-end gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                      <Input
                        type="number"
                        min="0"
                        value={formData.guests}
                        onChange={(e) => updateField('guests', parseInt(e.target.value) || 0)}
                        className="w-20 text-center"
                      />
                      <span className="text-sm text-slate-600">hóspedes</span>
                    </div>
                    <Button
                      type="button"
                      onClick={saveRoomsData}
                      className="bg-green-600 hover:bg-green-700 font-bold px-8"
                    >
                      <Save className="w-4 h-4 mr-2" /> Salvar Cômodos
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* TAB 4: TOUR VIRTUAL */}
            <TabsContent value="tour" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Tour Virtual - Galeria de Fotos</h3>
                  <p className="text-sm text-slate-500">
                    Visualize todas as fotos e escolha a foto de capa que aparecerá em destaque
                  </p>
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold">
                          {formData.rooms.reduce((total, room) => total + room.photos.length, 0)}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">Fotos Totais</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold">{formData.rooms.length}</p>
                        <p className="text-sm text-slate-600 mt-1">Cômodos</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold">{formData.coverPhotoId ? '1' : '0'}</p>
                        <p className="text-sm text-slate-600 mt-1">Foto de Capa</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Preview da Foto de Capa */}
                {(() => {
                  const coverPhoto = formData.rooms
                    .flatMap((room) =>
                      room.photos.map((photo) => ({
                        ...photo,
                        roomName: room.customName || room.typeName || 'Sem nome',
                      }))
                    )
                    .find((photo) => photo.id === formData.coverPhotoId);

                  return coverPhoto ? (
                    <Card className="border-2 border-yellow-500 shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-6">
                          <div className="flex-shrink-0">
                            <Badge className="bg-yellow-500 text-black font-bold mb-3">
                              <Star className="h-4 w-4 mr-2 fill-current" />
                              FOTO DE CAPA
                            </Badge>
                            <div className="relative w-80 h-60 rounded-lg overflow-hidden shadow-xl">
                              <img
                                src={coverPhoto.url}
                                alt="Foto de Capa"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="text-lg font-semibold mb-1">Foto em Destaque</h3>
                              <p className="text-sm text-slate-600">
                                Esta é a foto que aparecerá como capa do seu anúncio nas listagens e buscas
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{coverPhoto.roomName}</Badge>
                              {coverPhoto.tags && coverPhoto.tags.length > 0 && (
                                <>
                                  {coverPhoto.tags.slice(0, 3).map((tag, i) => (
                                    <Badge key={i} variant="outline">{tag}</Badge>
                                  ))}
                                  {coverPhoto.tags.length > 3 && (
                                    <Badge variant="outline">+{coverPhoto.tags.length - 3} mais</Badge>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  updateField('coverPhotoId', null);
                                  toast.info('Foto de capa removida. Selecione outra abaixo.');
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Remover Capa
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : formData.rooms.some((r) => r.photos.length > 0) ? (
                    <Card className="border-2 border-dashed border-yellow-400 bg-yellow-50">
                      <CardContent className="py-8 text-center">
                        <Star className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
                        <h3 className="text-lg font-semibold mb-2">Nenhuma foto de capa selecionada</h3>
                        <p className="text-sm text-slate-600 mb-4">
                          Clique no ícone de estrela em qualquer foto abaixo para defini-la como capa
                        </p>
                        <Badge variant="outline" className="text-xs">
                          A primeira foto será usada automaticamente se nenhuma for selecionada
                        </Badge>
                      </CardContent>
                    </Card>
                  ) : null;
                })()}

                {/* Filtro por Cômodo */}
                {formData.rooms.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium">Filtrar por cômodo:</span>
                    <Button
                      type="button"
                      size="sm"
                      variant={filterRoom === 'all' ? 'default' : 'outline'}
                      onClick={() => setFilterRoom('all')}
                    >
                      Todas ({formData.rooms.reduce((total, r) => total + r.photos.length, 0)})
                    </Button>
                    {formData.rooms.map((room) => (
                      <Button
                        key={room.id}
                        type="button"
                        size="sm"
                        variant={filterRoom === room.id ? 'default' : 'outline'}
                        onClick={() => setFilterRoom(room.id)}
                      >
                        {room.customName || room.typeName || 'Sem nome'} ({room.photos.length})
                      </Button>
                    ))}
                  </div>
                )}

                {/* Galeria de Fotos */}
                {formData.rooms.length === 0 || formData.rooms.every((r) => r.photos.length === 0) ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <ImageIcon className="h-12 w-12 text-slate-400 mb-4" />
                      <p className="text-slate-600 mb-2">Nenhuma foto adicionada ainda</p>
                      <p className="text-sm text-slate-500">
                        Volte ao Step 03 para adicionar fotos aos cômodos
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {formData.rooms
                      .filter((room) => filterRoom === 'all' || filterRoom === room.id)
                      .flatMap((room) =>
                        room.photos.map((photo) => ({
                          ...photo,
                          roomName: room.customName || room.typeName || 'Sem nome',
                          roomId: room.id,
                        }))
                      )
                      .map((photo) => (
                        <div
                          key={photo.id}
                          className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                            formData.coverPhotoId === photo.id
                              ? 'border-yellow-500 shadow-lg'
                              : 'border-slate-200'
                          }`}
                        >
                          {/* Badge de Foto de Capa */}
                          {formData.coverPhotoId === photo.id && (
                            <div className="absolute top-2 right-2 z-10">
                              <Badge className="bg-yellow-500 text-black font-bold">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                CAPA
                              </Badge>
                            </div>
                          )}

                          {/* Badge do Cômodo */}
                          <div className="absolute top-2 left-2 z-10">
                            <Badge variant="secondary" className="text-xs">
                              {photo.roomName}
                            </Badge>
                          </div>

                          {/* Imagem */}
                          <img
                            src={photo.url}
                            alt={photo.roomName}
                            className="w-full h-48 object-cover"
                          />

                          {/* Botão Definir como Capa (hover) */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                updateField('coverPhotoId', photo.id);
                                toast.success('Foto de capa definida!');
                              }}
                              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                            >
                              <Star className="h-4 w-4 mr-2 fill-current" />
                              Definir como Capa
                            </Button>
                          </div>

                          {/* Tags (se houver) */}
                          {photo.tags && photo.tags.length > 0 && (
                            <div className="absolute bottom-2 left-2 flex gap-1">
                              {photo.tags.slice(0, 2).map((tag, i) => (
                                <span key={i} className="text-[10px] px-1 py-0.5 bg-blue-600 text-white rounded">
                                  {tag.substring(0, 8)}...
                                </span>
                              ))}
                              {photo.tags.length > 2 && (
                                <span className="text-[10px] px-1 py-0.5 bg-slate-600 text-white rounded">
                                  +{photo.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {/* Botão Salvar Tour (Foto de Capa) */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={saveTourCoverPhoto}
                    disabled={isSaving}
                    className="bg-slate-900"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Foto de Capa
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* TAB 5: AMENIDADES DO LOCAL */}
            <TabsContent value="amenidades-local" className="mt-0">
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Comodidades do Local</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Selecione as amenidades disponíveis no local (prédio, condomínio, hotel)
                  </p>
                  
                  {/* Busca */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Filtro para pesquisar na lista de cada aba"
                      value={searchAmenities}
                      onChange={(e) => setSearchAmenities(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Categorias de Amenidades */}
                <div className="space-y-4">
                  {LOCATION_AMENITIES.map((category) => {
                    const filteredAmenities = category.amenities.filter((amenity) =>
                      amenity.name.toLowerCase().includes(searchAmenities.toLowerCase())
                    );

                    if (filteredAmenities.length === 0) return null;

                    const isCollapsed = collapsedCategories[category.id] || false;

                    return (
                      <Card key={category.id}>
                        <CardContent className="pt-6">
                          <div
                            className="flex items-center justify-between mb-4 cursor-pointer"
                            onClick={() => {
                              setCollapsedCategories({
                                ...collapsedCategories,
                                [category.id]: !isCollapsed
                              });
                            }}
                          >
                            <h3 className="font-semibold flex items-center gap-2">
                              <ChevronDown
                                className={`h-5 w-5 transition-transform duration-200 ${
                                  isCollapsed ? '-rotate-90' : ''
                                }`}
                              />
                              <span className="text-2xl">{category.icon}</span>
                              {category.name}
                            </h3>
                            <Badge variant="outline">
                              {formData.locationAmenities.filter((id) =>
                                category.amenities.some((a) => a.id === id)
                              ).length} / {filteredAmenities.length}
                            </Badge>
                          </div>

                          {!isCollapsed && (
                            <div className="grid grid-cols-2 gap-3">
                              {filteredAmenities.map((amenity) => (
                                <div
                                  key={amenity.id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`amenity-${amenity.id}`}
                                    checked={formData.locationAmenities.includes(amenity.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        updateField('locationAmenities', [...formData.locationAmenities, amenity.id]);
                                      } else {
                                        updateField('locationAmenities', formData.locationAmenities.filter((id) => id !== amenity.id));
                                      }
                                    }}
                                  />
                                  <Label
                                    htmlFor={`amenity-${amenity.id}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {amenity.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Botão Salvar */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={saveLocationAmenities}
                    disabled={isSaving}
                    className="bg-slate-900"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Amenidades
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* TAB 6: AMENIDADES DA ACOMODAÇÃO */}
            <TabsContent value="amenidades-acomodacao" className="mt-0">
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Amenidades da Acomodação</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Selecione as amenidades disponíveis dentro da acomodação (quarto, apartamento, casa)
                  </p>
                  
                  {/* Busca */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Filtro para pesquisar na lista de cada aba"
                      value={searchListingAmenities}
                      onChange={(e) => setSearchListingAmenities(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Categorias de Amenidades */}
                <div className="space-y-4">
                  {LISTING_AMENITIES.map((category) => {
                    const filteredAmenities = category.amenities.filter((amenity) =>
                      amenity.name.toLowerCase().includes(searchListingAmenities.toLowerCase())
                    );

                    if (filteredAmenities.length === 0) return null;

                    const isCollapsed = collapsedListingCategories[category.id] || false;

                    return (
                      <Card key={category.id}>
                        <CardContent className="pt-6">
                          <div
                            className="flex items-center justify-between mb-4 cursor-pointer"
                            onClick={() => {
                              setCollapsedListingCategories({
                                ...collapsedListingCategories,
                                [category.id]: !isCollapsed
                              });
                            }}
                          >
                            <h3 className="font-semibold flex items-center gap-2">
                              <ChevronDown
                                className={`h-5 w-5 transition-transform duration-200 ${
                                  isCollapsed ? '-rotate-90' : ''
                                }`}
                              />
                              <span className="text-2xl">{category.icon}</span>
                              {category.name}
                            </h3>
                            <Badge variant="outline">
                              {formData.listingAmenities.filter((id) =>
                                category.amenities.some((a) => a.id === id)
                              ).length} / {filteredAmenities.length}
                            </Badge>
                          </div>

                          {!isCollapsed && (
                            <div className="grid grid-cols-2 gap-3">
                              {filteredAmenities.map((amenity) => (
                                <div
                                  key={amenity.id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`listing-amenity-${amenity.id}`}
                                    checked={formData.listingAmenities.includes(amenity.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        updateField('listingAmenities', [...formData.listingAmenities, amenity.id]);
                                      } else {
                                        updateField('listingAmenities', formData.listingAmenities.filter((id) => id !== amenity.id));
                                      }
                                    }}
                                  />
                                  <Label
                                    htmlFor={`listing-amenity-${amenity.id}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {amenity.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Botão Salvar */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={saveListingAmenities}
                    disabled={isSaving}
                    className="bg-slate-900"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Amenidades
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* TAB 7: DESCRIÇÃO */}
            <TabsContent value="descricao" className="mt-0">
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Descrição</h3>
                  <p className="text-sm text-slate-500">
                    Descreva sua propriedade em 3 idiomas
                  </p>
                </div>

                {/* 1. Título do Anúncio */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold">Título do Anúncio</h4>
                        <p className="text-sm text-slate-500">
                          <strong>Airbnb limita a 50 caracteres</strong> - o que passar será cortado
                        </p>
                      </div>
                      <span className="text-sm text-slate-500">
                        {descricaoTitulo[activeDescTab].length}/50
                      </span>
                    </div>
                    
                    {/* Tab Selector */}
                    <div className="flex gap-2 mb-3 border-b">
                      {(['pt', 'en', 'es'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeDescTab === lang
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-slate-500 hover:text-slate-700'
                          }`}
                          onClick={() => setActiveDescTab(lang)}
                        >
                          {lang === 'pt' && '🇧🇷 PT'}
                          {lang === 'en' && '🇺🇸 EN'}
                          {lang === 'es' && '🇪🇸 ES'}
                        </button>
                      ))}
                    </div>

                    <Input
                      placeholder="Ex: Apartamento aconchegante no centro da cidade"
                      value={descricaoTitulo[activeDescTab]}
                      onChange={(e) => setDescricaoTitulo({ ...descricaoTitulo, [activeDescTab]: e.target.value.slice(0, 50) })}
                      maxLength={50}
                    />
                  </CardContent>
                </Card>

                {/* 2. Notas Gerais */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="mb-4">
                      <Label className="text-base font-semibold">Notas gerais *</Label>
                    </div>
                    
                    <div className="flex gap-2 mb-3 border-b">
                      {(['pt', 'en', 'es'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeDescTab === lang
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-slate-500'
                          }`}
                          onClick={() => setActiveDescTab(lang)}
                        >
                          {lang === 'pt' && '🇧🇷 PT'}
                          {lang === 'en' && '🇺🇸 EN'}
                          {lang === 'es' && '🇪🇸 ES'}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      placeholder="Informe detalhes adicionais que seus hóspedes devem saber sobre o seu espaço"
                      value={notasGerais[activeDescTab]}
                      onChange={(e) => setNotasGerais({ ...notasGerais, [activeDescTab]: e.target.value })}
                      className="min-h-[100px] resize-none"
                      maxLength={5000}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-red-500">❌ Emojis não permitidos</span>
                      <span className="text-xs text-slate-500">{notasGerais[activeDescTab].length}/5000</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Sobre o Espaço */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="mb-4">
                      <Label className="text-base font-semibold">Sobre o espaço *</Label>
                    </div>
                    
                    <div className="flex gap-2 mb-3 border-b">
                      {(['pt', 'en', 'es'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeDescTab === lang ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                          }`}
                          onClick={() => setActiveDescTab(lang)}
                        >
                          {lang === 'pt' && '🇧🇷 PT'}
                          {lang === 'en' && '🇺🇸 EN'}
                          {lang === 'es' && '🇪🇸 ES'}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      placeholder="O que torna seu espaço especial?\nO que contribuirá para que seus hóspedes se sintam confortáveis em sua acomodação?"
                      value={sobreEspaco[activeDescTab]}
                      onChange={(e) => setSobreEspaco({ ...sobreEspaco, [activeDescTab]: e.target.value })}
                      className="min-h-[100px] resize-none"
                      maxLength={5000}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-red-500">❌ Emojis não permitidos</span>
                      <span className="text-xs text-slate-500">{sobreEspaco[activeDescTab].length}/5000</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Sobre o Acesso ao Espaço */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="mb-4">
                      <Label className="text-base font-semibold">Sobre o acesso ao espaço *</Label>
                    </div>
                    
                    <div className="flex gap-2 mb-3 border-b">
                      {(['pt', 'en', 'es'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeDescTab === lang ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                          }`}
                          onClick={() => setActiveDescTab(lang)}
                        >
                          {lang === 'pt' && '🇧🇷 PT'}
                          {lang === 'en' && '🇺🇸 EN'}
                          {lang === 'es' && '🇪🇸 ES'}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      placeholder="Seus hóspedes terão acesso liberado a todas as dependências da acomodação?\nSe for o caso, coloque também informações referentes à restrição do condomínio."
                      value={sobreAcesso[activeDescTab]}
                      onChange={(e) => setSobreAcesso({ ...sobreAcesso, [activeDescTab]: e.target.value })}
                      className="min-h-[100px] resize-none"
                      maxLength={5000}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-red-500">❌ Emojis não permitidos</span>
                      <span className="text-xs text-slate-500">{sobreAcesso[activeDescTab].length}/5000</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 5. Sobre Interação com Anfitrião */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="mb-4">
                      <Label className="text-base font-semibold">Sobre interação com anfitrião *</Label>
                    </div>
                    
                    <div className="flex gap-2 mb-3 border-b">
                      {(['pt', 'en', 'es'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeDescTab === lang ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                          }`}
                          onClick={() => setActiveDescTab(lang)}
                        >
                          {lang === 'pt' && '🇧🇷 PT'}
                          {lang === 'en' && '🇺🇸 EN'}
                          {lang === 'es' && '🇪🇸 ES'}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      placeholder="Como será a interação com o anfitrião durante a estada?\nHaverá contato em algum momento?"
                      value={sobreAnfitriao[activeDescTab]}
                      onChange={(e) => setSobreAnfitriao({ ...sobreAnfitriao, [activeDescTab]: e.target.value })}
                      className="min-h-[100px] resize-none"
                      maxLength={5000}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-red-500">❌ Emojis não permitidos</span>
                      <span className="text-xs text-slate-500">{sobreAnfitriao[activeDescTab].length}/5000</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 6. Descrição do Bairro */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="mb-4">
                      <Label className="text-base font-semibold">Descrição do bairro *</Label>
                    </div>
                    
                    <div className="flex gap-2 mb-3 border-b">
                      {(['pt', 'en', 'es'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeDescTab === lang ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                          }`}
                          onClick={() => setActiveDescTab(lang)}
                        >
                          {lang === 'pt' && '🇧🇷 PT'}
                          {lang === 'en' && '🇺🇸 EN'}
                          {lang === 'es' && '🇪🇸 ES'}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      placeholder="Como é o bairro ou os arredores do seu anúncio?\nColoque sugestões sobre o que os hóspedes podem fazer por arredores do local."
                      value={descricaoBairro[activeDescTab]}
                      onChange={(e) => setDescricaoBairro({ ...descricaoBairro, [activeDescTab]: e.target.value })}
                      className="min-h-[100px] resize-none"
                      maxLength={5000}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-red-500">❌ Emojis não permitidos</span>
                      <span className="text-xs text-slate-500">{descricaoBairro[activeDescTab].length}/5000</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 7. Informações de Locomoção */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="mb-4">
                      <Label className="text-base font-semibold">Informações de locomoção *</Label>
                    </div>
                    
                    <div className="flex gap-2 mb-3 border-b">
                      {(['pt', 'en', 'es'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeDescTab === lang ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                          }`}
                          onClick={() => setActiveDescTab(lang)}
                        >
                          {lang === 'pt' && '🇧🇷 PT'}
                          {lang === 'en' && '🇺🇸 EN'}
                          {lang === 'es' && '🇪🇸 ES'}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      placeholder="Como chegar na propriedade?\nHá opções de transporte público? Estacionamento incluído no local ou nos arredores?\nQual a distância do seu anúncio em relação ao aeroporto ou as principais rodovias mais próximas?"
                      value={infoLocomocao[activeDescTab]}
                      onChange={(e) => setInfoLocomocao({ ...infoLocomocao, [activeDescTab]: e.target.value })}
                      className="min-h-[120px] resize-none"
                      maxLength={5000}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-red-500">❌ Emojis não permitidos</span>
                      <span className="text-xs text-slate-500">{infoLocomocao[activeDescTab].length}/5000</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Campos Personalizados (Configurações > Locais e Anúncios) */}
                {customDescriptionLoadError && (
                  <div className="text-xs text-red-500">
                    ❌ Falha ao carregar campos personalizados: {customDescriptionLoadError}
                  </div>
                )}
                {customDescriptionFields.map((field) => {
                  const current = customDescriptionValues[field.id] || { pt: '', en: '', es: '' };
                  const placeholder = field.placeholder?.[activeDescTab] || '';
                  return (
                    <Card key={field.id}>
                      <CardContent className="pt-6">
                        <div className="mb-4">
                          <Label className="text-base font-semibold">
                            {field.label}{field.required ? ' *' : ''}
                          </Label>
                        </div>

                        <div className="flex gap-2 mb-3 border-b">
                          {(['pt', 'en', 'es'] as const).map((lang) => (
                            <button
                              key={lang}
                              type="button"
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                activeDescTab === lang ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                              }`}
                              onClick={() => setActiveDescTab(lang)}
                            >
                              {lang === 'pt' && '🇧🇷 PT'}
                              {lang === 'en' && '🇺🇸 EN'}
                              {lang === 'es' && '🇪🇸 ES'}
                            </button>
                          ))}
                        </div>

                        <Textarea
                          placeholder={placeholder}
                          value={current[activeDescTab]}
                          onChange={(e) =>
                            setCustomDescriptionValues((prev) => {
                              const prevField = prev[field.id] || { pt: '', en: '', es: '' };
                              return {
                                ...prev,
                                [field.id]: { ...prevField, [activeDescTab]: e.target.value },
                              };
                            })
                          }
                          className="min-h-[100px] resize-none"
                          maxLength={5000}
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-red-500">❌ Emojis não permitidos</span>
                          <span className="text-xs text-slate-500">{current[activeDescTab].length}/5000</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Botão Salvar */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={saveDescricao}
                    disabled={isSaving}
                    className="bg-slate-900"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Descrição
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 8: RELACIONAMENTO */}
            <TabsContent value="relacionamento" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Configuração de Relacionamento</h3>
                  <p className="text-sm text-slate-500">
                    Configurar titular, administrador e detalhes legais do imóvel
                  </p>
                </div>
                
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-base mb-4">📋 Responsabilidade Legal</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Titular do Imóvel *</Label>
                        <Select value={titularImovel} onValueChange={setTitularImovel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nao_definido">Não definido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Administrador do Imóvel</Label>
                        <Select value={administradorImovel} onValueChange={setAdministradorImovel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nao_definido">Não definido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="font-semibold">Repasse de Propriedade (Sublocação)</Label>
                        <p className="text-xs text-slate-500 mb-2">Este imóvel é gerenciado através de sublocação?</p>
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant={isSublocacao ? "default" : "outline"} 
                            onClick={() => setIsSublocacao(true)} 
                            className="flex-1"
                          >
                            Sim
                          </Button>
                          <Button 
                            type="button" 
                            variant={!isSublocacao ? "default" : "outline"} 
                            onClick={() => setIsSublocacao(false)} 
                            className="flex-1"
                          >
                            Não
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="font-semibold">Exclusividade de Gestão</Label>
                        <p className="text-xs text-slate-500 mb-2">Gestão exclusiva deste imóvel?</p>
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant={isExclusivo ? "default" : "outline"} 
                            onClick={() => setIsExclusivo(true)} 
                            className="flex-1"
                          >
                            Sim
                          </Button>
                          <Button 
                            type="button" 
                            variant={!isExclusivo ? "default" : "outline"} 
                            onClick={() => setIsExclusivo(false)} 
                            className="flex-1"
                          >
                            Não
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    onClick={saveRelacionamento} 
                    disabled={isSaving} 
                    className="bg-slate-900"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Relacionamento
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB: AMENIDADES LOCAL */}
            <TabsContent value="amenidades-local" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Amenidades do Local</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Selecione as comodidades disponíveis no prédio/condomínio
                  </p>
                </div>
                <div className="text-center py-12 text-slate-400">
                  <p>🚧 Em desenvolvimento - Campos do wizard serão migrados aqui</p>
                </div>
              </div>
            </TabsContent>

            {/* TAB: AMENIDADES ACOMODAÇÃO */}
            <TabsContent value="amenidades-acomodacao" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Amenidades da Acomodação</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Selecione as comodidades disponíveis dentro da unidade
                  </p>
                </div>
                <div className="text-center py-12 text-slate-400">
                  <p>🚧 Em desenvolvimento - Campos do wizard serão migrados aqui</p>
                </div>
              </div>
            </TabsContent>

            {/* GRUPO FINANCEIRO */}
            {/* Step 08 (Relacionamento) já implementado acima */}

            {/* TAB 09: PREÇOS BASE */}
            <TabsContent value="precos-base" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Preços de Locação e Venda</h3>
                  <p className="text-sm text-slate-500">
                    Configure valores base para locação residencial e/ou venda
                  </p>
                  {!hasAnyModalidade && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                      ⚠️ Selecione pelo menos uma modalidade na aba "Detalhes" para configurar os preços
                    </div>
                  )}
                </div>

                {/* Valores de Aluguel - @MODALIDADE: [TEMPORADA, RESIDENCIAL] */}
                <Card className={!isAluguel ? 'opacity-40 pointer-events-none' : ''}>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-base mb-4">
                      💵 Valores de Aluguel
                      {!isAluguel && <span className="text-xs ml-2 text-slate-400">(Selecione Temporada ou Residencial)</span>}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Valor do Aluguel (R$)</Label>
                        <Input
                          type="number"
                          value={valorAluguel}
                          onChange={(e) => setValorAluguel(Number(e.target.value))}
                          placeholder="0.00"
                          disabled={!isAluguel}
                        />
                      </div>
                      <div>
                        <Label>IPTU Mensal (R$)</Label>
                        <Input
                          type="number"
                          value={valorIptu}
                          onChange={(e) => setValorIptu(Number(e.target.value))}
                          placeholder="0.00"
                          disabled={!isAluguel}
                        />
                      </div>
                      <div>
                        <Label>Condomínio (R$)</Label>
                        <Input
                          type="number"
                          value={valorCondominio}
                          onChange={(e) => setValorCondominio(Number(e.target.value))}
                          placeholder="0.00"
                          disabled={!isAluguel}
                        />
                      </div>
                      <div>
                        <Label>Taxa de Serviço (R$)</Label>
                        <Input
                          type="number"
                          value={taxaServico}
                          onChange={(e) => setTaxaServico(Number(e.target.value))}
                          placeholder="0.00"
                          disabled={!isAluguel}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Valores de Venda - @MODALIDADE: [VENDA] */}
                <Card className={!isVenda ? 'opacity-40 pointer-events-none' : ''}>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-base mb-4">
                      🏠 Valores de Venda
                      {!isVenda && <span className="text-xs ml-2 text-slate-400">(Selecione Compra e Venda)</span>}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Valor de Venda (R$)</Label>
                        <Input
                          type="number"
                          value={valorVenda}
                          onChange={(e) => setValorVenda(Number(e.target.value))}
                          placeholder="0.00"
                          disabled={!isVenda}
                        />
                      </div>
                      <div>
                        <Label>IPTU Anual (R$)</Label>
                        <Input
                          type="number"
                          value={iptuAnual}
                          onChange={(e) => setIptuAnual(Number(e.target.value))}
                          placeholder="0.00"
                          disabled={!isVenda}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="aceita-financiamento"
                          checked={aceitaFinanciamento}
                          onCheckedChange={(checked) => setAceitaFinanciamento(checked as boolean)}
                          disabled={!isVenda}
                        />
                        <Label htmlFor="aceita-financiamento" className="cursor-pointer">
                          Aceita financiamento bancário
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="aceita-permuta"
                          checked={aceitaPermuta}
                          onCheckedChange={(checked) => setAceitaPermuta(checked as boolean)}
                          disabled={!isVenda}
                        />
                        <Label htmlFor="aceita-permuta" className="cursor-pointer">
                          Aceita permuta
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Botão Salvar */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={savePrecosBase}
                    disabled={isSaving || !hasAnyModalidade}
                    className="bg-slate-900"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Preços
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 10: PREÇOS TEMPORADA - @MODALIDADE: [TEMPORADA] */}
            <TabsContent value="precos-temporada" className={`mt-0 ${!isTemporada ? 'hidden' : ''}`}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Configuração de Preço Temporada</h3>
                  <p className="text-sm text-slate-500">
                    Configure preços base, descontos e taxas para locação por temporada
                  </p>
                </div>

                {/* Modo de Configuração */}
                <Card>
                  <CardContent className="pt-6">
                    <Label className="text-base font-semibold mb-4 block">Modo de Configuração</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={modoConfigPreco === 'global' ? "default" : "outline"}
                        onClick={() => setModoConfigPreco('global')}
                        className="flex-1"
                      >
                        Global
                      </Button>
                      <Button
                        type="button"
                        variant={modoConfigPreco === 'individual' ? "default" : "outline"}
                        onClick={() => setModoConfigPreco('individual')}
                        className="flex-1"
                      >
                        Individual por Canal
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Região e Moeda */}
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-base mb-4">🌍 Região e Moeda</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Região</Label>
                        <Select value={regiao} onValueChange={setRegiao}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BR">Brasil</SelectItem>
                            <SelectItem value="US">Estados Unidos</SelectItem>
                            <SelectItem value="EU">Europa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Moeda</Label>
                        <Select value={moeda} onValueChange={setMoeda}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BRL">R$ Real</SelectItem>
                            <SelectItem value="USD">$ Dólar</SelectItem>
                            <SelectItem value="EUR">€ Euro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Descontos */}
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-base mb-4">📦 Descontos por pacote de dias</h4>

                    <div className="flex items-center space-x-2 mb-3">
                      <Checkbox
                        id="discount-packages-override"
                        checked={useDiscountPackagesOverride}
                        onCheckedChange={(checked) => setUseDiscountPackagesOverride(checked as boolean)}
                      />
                      <Label htmlFor="discount-packages-override" className="cursor-pointer">
                        Usar descontos personalizados neste anúncio
                      </Label>
                    </div>

                    {!useDiscountPackagesOverride ? (
                      <p className="text-xs text-slate-500">
                        Usando a configuração global da organização (Configurações → Precificação → Descontos por pacote de dias).
                      </p>
                    ) : (
                      <DiscountPackagesEditor
                        value={discountPackagesOverride}
                        onChange={setDiscountPackagesOverride}
                        disabled={isSaving}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Depósito e Precificação */}
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-base mb-4">🔒 Depósito e Precificação</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Valor do Depósito (R$)</Label>
                        <Input
                          type="number"
                          value={valorDeposito}
                          onChange={(e) => setValorDeposito(Number(e.target.value))}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex items-center space-x-2 mt-6">
                        <Checkbox
                          id="precificacao-dinamica"
                          checked={usarPrecificacaoDinamica}
                          onCheckedChange={(checked) => setUsarPrecificacaoDinamica(checked as boolean)}
                        />
                        <Label htmlFor="precificacao-dinamica" className="cursor-pointer">
                          Usar precificação dinâmica
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Taxas Adicionais */}
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-base mb-4">➕ Taxas Adicionais</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Taxa de Limpeza (R$)</Label>
                        <Input
                          type="number"
                          value={taxaLimpeza}
                          onChange={(e) => setTaxaLimpeza(Number(e.target.value))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Taxa Pet (R$)</Label>
                        <Input
                          type="number"
                          value={taxaPet}
                          onChange={(e) => setTaxaPet(Number(e.target.value))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Taxa Serviços Extras (R$)</Label>
                        <Input
                          type="number"
                          value={taxaServicosExtras}
                          onChange={(e) => setTaxaServicosExtras(Number(e.target.value))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Botão Salvar */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={saveConfigPrecoTemporada}
                    disabled={isSaving}
                    className="bg-slate-900"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Configuração
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 11: PREÇOS INDIVIDUAIS - @MODALIDADE: [TEMPORADA] */}
            <TabsContent value="precos-individuais" className={`mt-0 ${!isTemporada ? 'hidden' : ''}`}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Precificação Individual</h3>
                  <p className="text-sm text-slate-500">
                    Configure preços base por noite e regras de precificação
                  </p>
                </div>

                {/* Preço Base */}
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-base mb-4">💵 Preço Base</h4>
                    <div>
                      <Label>Preço Base por Noite (R$)</Label>
                      <Input
                        type="number"
                        value={precoBaseNoite}
                        onChange={(e) => setPrecoBaseNoite(Number(e.target.value))}
                        placeholder="0.00"
                        className="max-w-xs"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Valor base para cálculo de diárias
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Períodos Sazonais */}
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-base mb-2">🏖️ Períodos Sazonais</h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Configure períodos de alta/baixa temporada (em desenvolvimento)
                    </p>
                    <div className="text-center py-8 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-400">
                        {periodosSazonais.length} período(s) configurado(s)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Preços por Dia da Semana */}
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-base mb-2">📆 Preços por Dia da Semana</h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Configure preços diferenciados para cada dia (em desenvolvimento)
                    </p>
                    <div className="text-center py-8 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-400">
                        {Object.keys(precosDiaSemana).length} dia(s) com preço customizado
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Datas Especiais */}
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-base mb-2">⭐ Datas Especiais</h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Configure preços para feriados e eventos (em desenvolvimento)
                    </p>
                    <div className="text-center py-8 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-400">
                        {datasEspeciais.length} data(s) especial(is) configurada(s)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Botão Salvar */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={savePrecificacaoIndividual}
                    disabled={isSaving}
                    className="bg-slate-900"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Precificação
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 12: PREÇOS DERIVADOS - @MODALIDADE: [TEMPORADA] */}
            <TabsContent value="precos-derivados" className={`mt-0 ${!isTemporada ? 'hidden' : ''}`}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Preços Derivados</h3>
                  <p className="text-sm text-slate-500">
                    Configure taxas e descontos por número de hóspedes e crianças
                  </p>
                </div>

                {/* Variação por Hóspedes */}
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-base mb-4">👥 Variação por Número de Hóspedes</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Variação por Hóspede (%)</Label>
                        <Input
                          type="number"
                          value={variacaoPorHospedes}
                          onChange={(e) => setVariacaoPorHospedes(Number(e.target.value))}
                          placeholder="0"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          % de acréscimo/desconto por hóspede adicional
                        </p>
                      </div>
                      <div>
                        <Label>Taxa Hóspede Extra (R$)</Label>
                        <Input
                          type="number"
                          value={taxaHospedeExtra}
                          onChange={(e) => setTaxaHospedeExtra(Number(e.target.value))}
                          placeholder="0.00"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Valor fixo por hóspede adicional
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Configuração para Crianças */}
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-base mb-4">👶 Configuração para Crianças</h4>
                    
                    <div className="mb-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="cobrar-criancas"
                          checked={cobrarCriancas}
                          onCheckedChange={(checked) => setCobrarCriancas(checked as boolean)}
                        />
                        <Label htmlFor="cobrar-criancas" className="cursor-pointer">
                          Cobrar por crianças
                        </Label>
                      </div>
                    </div>

                    {cobrarCriancas && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Idade Mínima</Label>
                            <Input
                              type="number"
                              value={idadeMinimaCrianca}
                              onChange={(e) => setIdadeMinimaCrianca(Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label>Idade Máxima</Label>
                            <Input
                              type="number"
                              value={idadeMaximaCrianca}
                              onChange={(e) => setIdadeMaximaCrianca(Number(e.target.value))}
                              placeholder="12"
                            />
                          </div>
                          <div>
                            <Label>Desconto (%)</Label>
                            <Input
                              type="number"
                              value={descontoCrianca}
                              onChange={(e) => setDescontoCrianca(Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">
                          Crianças entre {idadeMinimaCrianca} e {idadeMaximaCrianca} anos terão {descontoCrianca}% de desconto
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Botão Salvar */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={savePrecosDeriados}
                    disabled={isSaving}
                    className="bg-slate-900"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Preços Derivados
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* GRUPO CONFIGURAÇÕES */}

            {/* TAB: CONFIGURAÇÕES RESERVAS */}
            <TabsContent value="config-reservas" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Configurações de Reservas</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Configure regras de reserva, mínima/máxima de noites, etc
                  </p>
                </div>
                <div className="text-center py-12 text-slate-400">
                  <p>🚧 Em desenvolvimento - Campos do wizard serão migrados aqui</p>
                </div>
              </div>
            </TabsContent>

            {/* TAB: CONFIGURAÇÕES CHECK-IN */}
            <TabsContent value="config-checkin" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Configurações de Check-in/Check-out</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Configure horários e procedimentos de entrada/saída
                  </p>
                </div>
                <div className="text-center py-12 text-slate-400">
                  <p>🚧 Em desenvolvimento - Campos do wizard serão migrados aqui</p>
                </div>
              </div>
            </TabsContent>

            {/* TAB: REGRAS DA CASA */}
            <TabsContent value="config-regras" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Regras da Casa</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Configure regras sobre pets, fumantes, eventos, etc
                  </p>
                </div>
                <div className="text-center py-12 text-slate-400">
                  <p>🚧 Em desenvolvimento - Campos do wizard serão migrados aqui</p>
                </div>
              </div>
            </TabsContent>

            {/* TAB: POLÍTICAS */}
            <TabsContent value="config-politicas" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Políticas de Cancelamento</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Configure políticas de cancelamento e reembolso
                  </p>
                </div>
                <div className="text-center py-12 text-slate-400">
                  <p>🚧 Em desenvolvimento - Campos do wizard serão migrados aqui</p>
                </div>
              </div>
            </TabsContent>

            {/* TAB: INTEGRAÇÃO */}
            <TabsContent value="config-integracao" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Configurações de Integração</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Configure integrações com Airbnb, Booking, etc
                  </p>
                </div>
                <div className="text-center py-12 text-slate-400">
                  <p>🚧 Em desenvolvimento - Campos do wizard serão migrados aqui</p>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
      
      {/* Modal de Tags */}
      {showTagsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
            {/* Header */}
            <div className="p-6 pb-4 flex items-start justify-between border-b">
              <div>
                <h3 className="text-lg font-semibold">Adicionar Tags</h3>
                <p className="text-sm text-slate-500">
                  Selecione as tags para adicionar às {selectedPhotos.length} foto(s) selecionada(s)
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowTagsModal(false)}
                className="h-8 w-8 -mt-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <TagsSelector
                selectedTags={pendingTags}
                onTagsChange={setPendingTags}
              />
            </div>
            
            {/* Footer - Fixed */}
            <div className="p-6 pt-4 border-t bg-white">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTagsModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    addTagsToSelectedPhotos();
                    setShowTagsModal(false);
                  }}
                  disabled={pendingTags.length === 0}
                  className="flex-1"
                >
                  Aplicar {pendingTags.length > 0 && `(${pendingTags.length})`}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAGS SELECTOR COMPONENT
// ============================================================================

interface TagsSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

function TagsSelector({ selectedTags, onTagsChange }: TagsSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTags = PHOTO_TAGS.filter((tag) =>
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    console.log('🏷️ Tags atualizadas:', newTags);
    onTagsChange(newTags);
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar tags (ex: vista, piscina, quarto)..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="space-y-2">
        {filteredTags.length > 0 ? (
          filteredTags.map((tag) => (
            <div
              key={tag}
              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-slate-50 ${
                selectedTags.includes(tag) ? 'bg-blue-50 border-blue-500' : ''
              }`}
              onClick={() => toggleTag(tag)}
            >
              <Checkbox 
                checked={selectedTags.includes(tag)}
                onCheckedChange={() => toggleTag(tag)}
              />
              <span className="text-sm">{tag}</span>
              {selectedTags.includes(tag) && <Check className="h-4 w-4 ml-auto text-blue-600" />}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p>Nenhuma tag encontrada para &quot;{searchQuery}&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
}
