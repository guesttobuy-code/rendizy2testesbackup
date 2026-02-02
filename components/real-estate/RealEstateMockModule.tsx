/**
 * 🏗️ REAL ESTATE MARKETPLACE - MÓDULO MOCK/PROTÓTIPO
 * 
 * Visualização das telas planejadas para o marketplace B2B
 * conectando Construtoras ↔ Imobiliárias
 * 
 * Rota: /real-estate-mock
 * Status: PROTÓTIPO VISUAL
 * 
 * Criado em: 01/02/2026
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '../ui/utils';
import { MainSidebar } from '../MainSidebar';
import { 
  Building2, 
  Home, 
  Users, 
  Handshake, 
  FileSignature, 
  Package, 
  Shield,
  Search,
  Filter,
  MapPin,
  Star,
  MessageSquare,
  Eye,
  ChevronRight,
  Building,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowLeft,
  Settings,
  Bell,
  X,
  Megaphone,
  Target,
  Send,
  Timer,
  DollarSign,
  Zap,
  Trophy,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Store,
  Calendar,
  User,
  FileText,
  Download,
  Play,
  Image,
  Map,
  Calculator,
  Percent,
  TrendingUp,
  Layers,
  Grid3X3,
  Table,
  Video,
  Camera,
  Share2,
  Copy,
  Upload,
} from 'lucide-react';

// Chat Drawer - Para abrir chat inline sem sair da tela
import { ChatDrawerProvider, useChatDrawer } from '@/components/chat';

// ============================================
// DADOS MOCK BASEADOS EM MATERIAIS REAIS
// ============================================

// Estrutura real de materiais por empreendimento (baseado em Calper, Calçada, Patrimar)
// @ts-ignore
export const MOCK_MATERIAIS_EMPREENDIMENTO = {
  bookDigital: { nome: 'Book Digital', formato: 'PDF', tamanho: '14 MB', icone: FileText },
  tabelaPrecos: { nome: 'Tabela de Preços', formato: 'PDF', tamanho: '449 KB', icone: Table },
  tabelaPromocional: { nome: 'Tabela Promocional', formato: 'PDF', tamanho: '161 KB', icone: Percent },
  fichaTecnica: { nome: 'Ficha Técnica', formato: 'PDF', tamanho: '1.7 MB', icone: FileText },
  estudoRentabilidade: { nome: 'Estudo de Rentabilidade', formato: 'PDF', tamanho: '2.1 MB', icone: TrendingUp },
  custoCondominial: { nome: 'Custo Condominial', formato: 'PDF', tamanho: '338 KB', icone: Calculator },
  plantasHumanizadas: { nome: 'Plantas Humanizadas', formato: 'Pasta', icone: Image },
  videosInstitucional: { nome: 'Vídeos', formato: 'MP4', tamanho: '35 MB', icone: Video },
  reguasWhatsapp: { nome: 'Réguas WhatsApp', formato: 'JPEG', icone: Share2 },
  masterplan: { nome: 'Masterplan/Implantação', formato: 'JPG', icone: Map },
  localizacao: { nome: 'Mapa de Localização', formato: 'JPG', icone: MapPin },
  fotosObra: { nome: 'Andamento da Obra', formato: 'Pasta', icone: Camera },
  decoradoVirtual: { nome: 'Decorado Virtual 3D', formato: 'Link', icone: Play },
};

// Dados mock para demonstração
const MOCK_CONSTRUTORAS = [
  {
    id: '1',
    name: 'Construtora Calper',
    logo: 'https://ui-avatars.com/api/?name=CAL&background=1e40af&color=fff&size=80',
    description: 'Especializada em empreendimentos de médio e alto padrão no Rio de Janeiro',
    location: 'São Paulo, SP',
    launchesCount: 8,
    rating: 4.8,
    reviewsCount: 45,
    partnershipStatus: 'open',
    segments: ['Alto Padrão', 'Luxo'],
    commissionModel: '6% sobre VGV'
  },
  {
    id: '2',
    name: 'MRV Engenharia',
    logo: 'https://ui-avatars.com/api/?name=MRV&background=10b981&color=fff&size=80',
    description: 'Líder em habitação popular e MCMV em todo Brasil',
    location: 'Nacional',
    launchesCount: 156,
    rating: 4.2,
    reviewsCount: 312,
    partnershipStatus: 'open',
    segments: ['MCMV', 'Econômico'],
    commissionModel: '4% sobre VGV'
  },
  {
    id: '3',
    name: 'Cyrela Brazil Realty',
    logo: 'https://ui-avatars.com/api/?name=CBR&background=f59e0b&color=fff&size=80',
    description: 'Tradição e qualidade em empreendimentos residenciais e comerciais',
    location: 'São Paulo, RJ, PR',
    launchesCount: 24,
    rating: 4.6,
    reviewsCount: 89,
    partnershipStatus: 'open',
    segments: ['Médio', 'Alto Padrão'],
    commissionModel: '5.5% sobre VGV'
  },
  {
    id: '4',
    name: 'Patrimar Engenharia',
    logo: 'https://ui-avatars.com/api/?name=PE&background=ec4899&color=fff&size=80',
    description: 'Construtora mineira com foco em qualidade e inovação',
    location: 'Belo Horizonte, MG',
    launchesCount: 12,
    rating: 4.7,
    reviewsCount: 67,
    partnershipStatus: 'closed',
    segments: ['Médio', 'Alto Padrão'],
    commissionModel: '5% sobre VGV'
  }
];

const MOCK_IMOBILIARIAS = [
  {
    id: '1',
    name: 'Lopes Consultoria',
    logo: 'https://ui-avatars.com/api/?name=LC&background=8b5cf6&color=fff&size=80',
    description: 'Maior rede imobiliária do Brasil com mais de 90 anos de história',
    location: 'Nacional',
    brokersCount: 12500,
    rating: 4.5,
    reviewsCount: 234,
    partnershipStatus: 'open',
    partnershipModel: '50/50',
    segments: ['Todos os segmentos'],
    creci: '012345-J'
  },
  {
    id: '2',
    name: 'Coelho da Fonseca',
    logo: 'https://ui-avatars.com/api/?name=CF&background=0ea5e9&color=fff&size=80',
    description: 'Especializada em alto padrão e imóveis de luxo',
    location: 'São Paulo, SP',
    brokersCount: 450,
    rating: 4.9,
    reviewsCount: 156,
    partnershipStatus: 'open',
    partnershipModel: '60/40',
    segments: ['Alto Padrão', 'Luxo'],
    creci: '023456-J'
  },
  {
    id: '3',
    name: 'Imobiliária ABC',
    logo: 'https://ui-avatars.com/api/?name=ABC&background=14b8a6&color=fff&size=80',
    description: 'Forte atuação na região ABC paulista',
    location: 'Santo André, SP',
    brokersCount: 85,
    rating: 4.3,
    reviewsCount: 42,
    partnershipStatus: 'open',
    partnershipModel: '50/50',
    segments: ['Econômico', 'Médio'],
    creci: '034567-J'
  }
];

// Corretores autônomos cadastrados
const MOCK_CORRETORES = [
  {
    id: '1',
    name: 'João Ricardo Silva',
    photo: 'https://ui-avatars.com/api/?name=JR&background=0ea5e9&color=fff&size=80',
    location: 'São Paulo, SP',
    creci: 'CRECI-F 123456',
    experience: '5-10 anos',
    specialties: ['Alto Padrão', 'Lançamentos'],
    regions: ['Zona Sul', 'Zona Oeste'],
    rating: 4.8,
    reviewsCount: 45,
    salesLastYear: 18,
    vinculo: 'autonomo',
    disponivel: true,
    bio: 'Especialista em imóveis de alto padrão na Zona Sul de SP'
  },
  {
    id: '2',
    name: 'Maria Fernanda Costa',
    photo: 'https://ui-avatars.com/api/?name=MF&background=8b5cf6&color=fff&size=80',
    location: 'Rio de Janeiro, RJ',
    creci: 'CRECI-F 234567',
    experience: '3-5 anos',
    specialties: ['Médio Padrão', 'Lançamentos', 'Prontos'],
    regions: ['Zona Sul', 'Barra'],
    rating: 4.9,
    reviewsCount: 67,
    salesLastYear: 24,
    vinculo: 'autonomo',
    disponivel: true,
    bio: 'Apaixonada por encontrar o imóvel perfeito para cada cliente'
  },
  {
    id: '3',
    name: 'Carlos Eduardo Santos',
    photo: 'https://ui-avatars.com/api/?name=CE&background=14b8a6&color=fff&size=80',
    location: 'Belo Horizonte, MG',
    creci: 'CRECI-F 345678',
    experience: '10+ anos',
    specialties: ['Comercial', 'Alto Padrão', 'Loteamentos'],
    regions: ['Centro', 'Savassi', 'Belvedere'],
    rating: 4.7,
    reviewsCount: 89,
    salesLastYear: 32,
    vinculo: 'autonomo',
    disponivel: true,
    bio: 'Expert em investimentos imobiliários comerciais'
  },
  {
    id: '4',
    name: 'Ana Paula Oliveira',
    photo: 'https://ui-avatars.com/api/?name=AP&background=f59e0b&color=fff&size=80',
    location: 'Curitiba, PR',
    creci: 'CRECI-F 456789',
    experience: '1-3 anos',
    specialties: ['Econômico', 'MCMV', 'Médio Padrão'],
    regions: ['Centro', 'Água Verde', 'Batel'],
    rating: 4.6,
    reviewsCount: 23,
    salesLastYear: 12,
    vinculo: 'imobiliaria',
    nomeImobiliaria: 'Imobiliária XYZ',
    disponivel: true,
    bio: 'Focada em realizar o sonho da casa própria para famílias'
  },
  {
    id: '5',
    name: 'Roberto Mendes',
    photo: 'https://ui-avatars.com/api/?name=RM&background=ef4444&color=fff&size=80',
    location: 'Porto Alegre, RS',
    creci: 'CRECI-F 567890',
    experience: '5-10 anos',
    specialties: ['Alto Padrão', 'Luxo'],
    regions: ['Moinhos', 'Bela Vista', 'Três Figueiras'],
    rating: 4.9,
    reviewsCount: 56,
    salesLastYear: 15,
    vinculo: 'autonomo',
    disponivel: false,
    bio: 'Referência em imóveis de luxo no sul do Brasil'
  }
];

// Empreendimentos com estrutura realista (baseado em Calper/Patrimar/Calçada)
const MOCK_EMPREENDIMENTOS = [
  {
    id: '1',
    name: 'Arte Wood',
    constructor: 'Construtora Calper',
    constructorLogo: 'https://ui-avatars.com/api/?name=CAL&background=1e40af&color=fff',
    location: 'Recreio dos Bandeirantes, RJ',
    phase: 'launch',
    totalUnits: 1554,
    availableUnits: 14,
    soldPercentage: 99.1,
    priceRange: 'R$ 289.000 - R$ 520.000',
    typologies: ['1 quarto', '2 quartos', 'Duplex', 'Garden', 'Cobertura', 'Loja'],
    towers: 4,
    deliveryDate: 'Dez/2027',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop',
    hasVirtualTour: true,
    virtualTourUrl: 'https://my.matterport.com/show/?m=UNnwPeP9Qcj',
    campanhaAtiva: true,
    campanha: 'Condição especial Fevereiro/26',
    materiais: {
      bookDigital: true,
      tabelaPrecos: '2026 Fevereiro - Arte Wood (FASE 2).pdf',
      fichaTecnica: true,
      decoradoVirtual: true,
      andamentoObra: true,
    },
    imobiliariasAtivas: ['Lopes', 'Patrimovel', 'Imoverso', 'Sawala', 'VG', 'Parceiros'],
  },
  {
    id: '2',
    name: 'Arte Wave',
    constructor: 'Construtora Calper',
    constructorLogo: 'https://ui-avatars.com/api/?name=CAL&background=1e40af&color=fff',
    location: 'Recreio dos Bandeirantes, RJ',
    phase: 'launch',
    totalUnits: 1551,
    availableUnits: 8,
    soldPercentage: 99.5,
    priceRange: 'R$ 275.000 - R$ 485.000',
    typologies: ['1 quarto', 'Duplex', 'Garden', 'Cobertura', 'Townhouse', 'Loja'],
    towers: 4,
    deliveryDate: 'Mar/2027',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
    hasVirtualTour: true,
    virtualTourUrl: 'https://my.matterport.com/show/?m=6TZyGgmC2wV',
    campanhaAtiva: false,
    materiais: {
      bookDigital: true,
      tabelaPrecos: 'Tabela - Arte Wave.pdf',
      fichaTecnica: true,
      decoradoVirtual: true,
      andamentoObra: true,
    },
    imobiliariasAtivas: ['Lopes', 'Patrimovel', 'Imoverso', 'Sawala', 'VG', 'Parceiros'],
  },
  {
    id: '3',
    name: 'Epic Golf Residence',
    constructor: 'Patrimar Engenharia',
    constructorLogo: 'https://ui-avatars.com/api/?name=PAT&background=dc2626&color=fff',
    location: 'Barra da Tijuca, RJ',
    phase: 'construction',
    totalUnits: 240,
    availableUnits: 45,
    soldPercentage: 81.3,
    priceRange: 'R$ 1.200.000 - R$ 2.800.000',
    typologies: ['2 suítes', '3 suítes', '4 suítes'],
    towers: 2,
    deliveryDate: 'Jun/2028',
    image: 'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=400&h=300&fit=crop',
    hasVirtualTour: true,
    virtualTourUrl: 'https://tour.ultratour.com.br/PATRIMAR/epic-golf-residence/index.htm',
    campanhaAtiva: true,
    campanha: 'Tabela Promocional Janeiro/26',
    materiais: {
      bookDigital: true,
      tabelaPrecos: '2026 Janeiro - Epic.pdf',
      tabelaPromocional: 'Tabela Epic promocional - Jan26.pdf',
      fichaTecnica: true,
      decoradoVirtual: true,
      andamentoObra: false,
    },
    imobiliariasAtivas: ['Lopes', 'Patrimóvel', 'Sawala', 'VG'],
  },
  {
    id: '4',
    name: 'Lanai Recreio Pontal Oceânico',
    constructor: 'Construtora Calçada',
    constructorLogo: 'https://ui-avatars.com/api/?name=CAL&background=059669&color=fff',
    location: 'Recreio dos Bandeirantes, RJ',
    phase: 'launch',
    totalUnits: 320,
    availableUnits: 128,
    soldPercentage: 60.0,
    priceRange: 'R$ 380.000 - R$ 720.000',
    typologies: ['2 quartos', '3 quartos', 'Garden', 'Cobertura'],
    towers: 3,
    deliveryDate: 'Set/2028',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    hasVirtualTour: true,
    campanhaAtiva: false,
    materiais: {
      bookDigital: 'Book Lanai Final.pdf',
      tabelaPrecos: true,
      fichaTecnica: 'FICHA TECNICA ERRTA FINAL.pdf',
      custoCondominial: 'CUSTO CONDOMINIAL LANAI.pdf',
      decoradoVirtual: false,
      andamentoObra: false,
      videosWhatsapp: true,
      reguasWhatsapp: true,
    },
    imobiliariasAtivas: ['Lopes', 'Patrimóvel', 'Imoverso'],
  },
];

// Estrutura do espelho de vendas (mapa de disponibilidade) baseado no formato real
const MOCK_ESPELHO_VENDAS = {
  empreendimentoId: '1',
  blocos: [
    {
      nome: 'BLOCO 1',
      andares: [
        {
          andar: 13,
          unidades: [
            { id: '1301', tipologia: '1Q', status: 'vendido', imobiliaria: 'Lopes', dataVenda: '18/05/2025' },
            { id: '1302', tipologia: '1Q', status: 'vendido', imobiliaria: 'Imoverso', dataVenda: '04/04/2025' },
            { id: '1303', tipologia: '1Q', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '13/05/2025' },
            { id: '1304', tipologia: '1Q', status: 'vendido', imobiliaria: 'Lopes', dataVenda: '27/05/2025' },
            { id: '1305', tipologia: '1Q', status: 'vendido', imobiliaria: 'Imoverso', dataVenda: '28/05/2025' },
            { id: '1306', tipologia: 'VAZIO', status: 'vazio', imobiliaria: null },
            { id: '1307', tipologia: 'DS', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '30/04/2025' },
            { id: '1308', tipologia: '1Q', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '14/05/2025' },
          ]
        },
        {
          andar: 12,
          unidades: [
            { id: '1201', tipologia: '1Q', status: 'vendido', imobiliaria: 'Lopes', dataVenda: '26/04/2025' },
            { id: '1202', tipologia: '1Q', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '02/06/2025' },
            { id: '1203', tipologia: '1Q', status: 'disponivel', imobiliaria: null },
            { id: '1204', tipologia: '1Q', status: 'vendido', imobiliaria: 'Imoverso', dataVenda: '06/05/2025' },
            { id: '1205', tipologia: '1Q', status: 'vendido', imobiliaria: 'Imoverso', dataVenda: '03/04/2025' },
            { id: '1206', tipologia: 'VAZIO', status: 'vazio', imobiliaria: null },
            { id: '1207', tipologia: 'DS', status: 'vendido', imobiliaria: 'Patrimovel', dataVenda: '03/04/2025' },
            { id: '1208', tipologia: '1Q', status: 'reservado', imobiliaria: 'Lopes', dataReserva: '28/01/2026' },
          ]
        },
        {
          andar: 11,
          unidades: [
            { id: '1101', tipologia: '1Q', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '03/04/2025' },
            { id: '1102', tipologia: '1Q', status: 'disponivel', imobiliaria: null },
            { id: '1103', tipologia: '1Q', status: 'vendido', imobiliaria: 'Lopes', dataVenda: '03/04/2025' },
            { id: '1104', tipologia: '1Q', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '03/05/2025' },
            { id: '1105', tipologia: '1Q', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '06/05/2025' },
            { id: '1106', tipologia: 'DS', status: 'disponivel', imobiliaria: null },
            { id: '1107', tipologia: 'DS', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '30/04/2025' },
            { id: '1108', tipologia: '1Q', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '03/04/2025' },
          ]
        },
        {
          andar: 10,
          unidades: [
            { id: '1001', tipologia: '1Q', status: 'vendido', imobiliaria: 'Lopes', dataVenda: '23/05/2025' },
            { id: '1002', tipologia: '1Q', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '03/04/2025' },
            { id: '1003', tipologia: '1Q', status: 'vendido', imobiliaria: 'VG', dataVenda: '03/04/2025' },
            { id: '1004', tipologia: '1Q', status: 'vendido', imobiliaria: 'Imoverso', dataVenda: '03/04/2025' },
            { id: '1005', tipologia: '1Q', status: 'disponivel', imobiliaria: null },
            { id: '1006', tipologia: 'DS', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '05/07/2025' },
            { id: '1007', tipologia: 'DS', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '22/04/2025' },
            { id: '1008', tipologia: '1Q', status: 'reservado', imobiliaria: 'Sawala', dataReserva: '30/01/2026' },
          ]
        },
      ],
    },
    {
      nome: 'BLOCO 2',
      andares: [
        {
          andar: 13,
          unidades: [
            { id: '1301', tipologia: 'COB', status: 'vendido', imobiliaria: 'Sawala', dataVenda: '24/04/2025' },
            { id: '1302', tipologia: 'COB', status: 'vendido', imobiliaria: 'Lopes', dataVenda: '19/09/2025' },
            { id: '1303', tipologia: 'COB', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '13/04/2025' },
            { id: '1304', tipologia: 'COB', status: 'disponivel', imobiliaria: null },
          ]
        },
        {
          andar: 12,
          unidades: [
            { id: '1201', tipologia: '1Q', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '23/04/2025' },
            { id: '1202', tipologia: '1Q', status: 'vendido', imobiliaria: 'VG', dataVenda: '27/04/2025' },
            { id: '1203', tipologia: '1Q', status: 'vendido', imobiliaria: 'Calper', dataVenda: '03/04/2025' },
            { id: '1204', tipologia: '1Q', status: 'disponivel', imobiliaria: null },
            { id: '1205', tipologia: '1Q', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '05/04/2025' },
            { id: '1206', tipologia: 'VAZIO', status: 'vazio', imobiliaria: null },
            { id: '1207', tipologia: 'DS', status: 'vendido', imobiliaria: 'Lopes', dataVenda: '26/04/2025' },
            { id: '1208', tipologia: '1Q', status: 'vendido', imobiliaria: 'Parceiros', dataVenda: '26/04/2025' },
          ]
        },
      ],
    },
  ],
  resumo: {
    total: 1554,
    disponivel: 14,
    reservado: 2,
    assinado: 6,
    sinalCreditado: 101,
    processoFinalizado: 1379,
    foraDeVenda: 63,
    distrato: 0,
  },
  legenda: [
    { status: 'disponivel', cor: '#22c55e', label: 'Disponível / Estoque' },
    { status: 'reservado', cor: '#eab308', label: 'Reservado / Assinatura agendada' },
    { status: 'assinado', cor: '#f97316', label: 'Assinado, sinal a creditar' },
    { status: 'sinalCreditado', cor: '#3b82f6', label: 'Sinal creditado, docs pendentes' },
    { status: 'vendido', cor: '#6366f1', label: 'Sinal creditado, sem pendências' },
    { status: 'finalizado', cor: '#8b5cf6', label: 'Escritura assinada' },
    { status: 'foraDeVenda', cor: '#6b7280', label: 'Fora de venda' },
    { status: 'distrato', cor: '#ef4444', label: 'Distrato' },
    { status: 'vazio', cor: '#e5e7eb', label: 'Vazio (estrutural)' },
  ],
};

const MOCK_UNITS = [
  { id: '101', unit: '101', tower: 'A', floor: 1, typology: '2 quartos', area: 65, price: 450000, status: 'available' },
  { id: '102', unit: '102', tower: 'A', floor: 1, typology: '2 quartos', area: 65, price: 455000, status: 'reserved' },
  { id: '201', unit: '201', tower: 'A', floor: 2, typology: '3 quartos', area: 85, price: 620000, status: 'available' },
  { id: '202', unit: '202', tower: 'A', floor: 2, typology: '3 quartos', area: 85, price: 630000, status: 'sold' },
  { id: '301', unit: '301', tower: 'A', floor: 3, typology: '3 suítes', area: 120, price: 890000, status: 'available' },
  { id: '302', unit: '302', tower: 'A', floor: 3, typology: '3 suítes', area: 120, price: 920000, status: 'available' },
  { id: '401', unit: '401', tower: 'B', floor: 4, typology: '2 quartos', area: 65, price: 480000, status: 'reserved' },
  { id: '402', unit: '402', tower: 'B', floor: 4, typology: '2 quartos', area: 65, price: 485000, status: 'available' },
];

type ViewType = 'vitrine' | 'construtora-perfil' | 'imobiliaria-perfil' | 'estoque' | 'empreendimento-detail' | 'reserva' | 'parcerias' | 'contratos' | 'demandas' | 'criar-demanda' | 'demanda-detalhes' | 'cadastros' | 'cadastro-construtora' | 'cadastro-imobiliaria' | 'cadastro-empreendimento' | 'cadastro-corretor';
type TabType = 'construtoras' | 'imobiliarias' | 'corretores';
type CadastroStep = 1 | 2 | 3 | 4 | 5;

// Props para integração com o layout principal (padrão do CalendarModule)
interface RealEstateMockModuleProps {
  sidebarCollapsed?: boolean;
  setSidebarCollapsed?: (collapsed: boolean) => void;
  initialLoading?: boolean;
  onModuleChange?: (module: string) => void;
}

export function RealEstateMockModule(props: RealEstateMockModuleProps = {}) {
  // Wrap com ChatDrawerProvider para habilitar chat inline
  return (
    <ChatDrawerProvider>
      <RealEstateMockModuleInner {...props} />
    </ChatDrawerProvider>
  );
}

function RealEstateMockModuleInner({
  sidebarCollapsed,
  setSidebarCollapsed,
  initialLoading,
  onModuleChange
}: RealEstateMockModuleProps = {}) {
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<ViewType>('vitrine');
  const [activeTab, setActiveTab] = useState<TabType>('construtoras');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedDevelopment, setSelectedDevelopment] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Hook do Chat Drawer para abrir chat inline
  const { openB2BChat } = useChatDrawer();
  // Sincronizar view com parâmetro da URL (vindo do MainSidebar)
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam) {
      const viewMap: Record<string, ViewType> = {
        'vitrine': 'vitrine',
        'demandas': 'demandas',
        'estoque': 'estoque',
        'reservas': 'reserva',
        'parcerias': 'parcerias',
        'contratos': 'contratos',
        'cadastros': 'cadastros',
        'cadastrar-construtora': 'cadastro-construtora',
        'cadastrar-imobiliaria': 'cadastro-imobiliaria',
        'cadastrar-empreendimento': 'cadastro-empreendimento',
        'cadastrar-corretor': 'cadastro-corretor',
      };
      const mappedView = viewMap[viewParam];
      if (mappedView) {
        setCurrentView(mappedView);
      }
    }
  }, [searchParams]);

  // Navegação
  const navigateTo = (view: ViewType, item?: any) => {
    setCurrentView(view);
    if (item) setSelectedItem(item);
  };

  const goBack = () => {
    if (currentView === 'empreendimento-detail') {
      setCurrentView('estoque');
    } else if (currentView === 'reserva') {
      setCurrentView('empreendimento-detail');
    } else if (currentView === 'construtora-perfil' || currentView === 'imobiliaria-perfil') {
      setCurrentView('vitrine');
    } else if (currentView === 'criar-demanda' || currentView === 'demanda-detalhes') {
      setCurrentView('demandas');
    } else if (currentView === 'cadastro-construtora' || currentView === 'cadastro-imobiliaria' || currentView === 'cadastro-empreendimento' || currentView === 'cadastro-corretor') {
      setCurrentView('cadastros');
    } else if (currentView === 'cadastros') {
      setCurrentView('vitrine');
    } else {
      setCurrentView('vitrine');
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* MainSidebar - Integração com layout principal */}
      <MainSidebar
        activeModule="realestate"
        onModuleChange={onModuleChange || (() => {})}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed && setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content - Com margem para acompanhar o estado do MainSidebar */}
      <div
        className={cn(
          'flex flex-col h-full transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72',
        )}
      >
        <main className="h-full overflow-auto">
          {/* Top Bar */}
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {currentView !== 'vitrine' && (
                  <button
                    onClick={goBack}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentView === 'vitrine' && 'Vitrine Real Estate'}
                  {currentView === 'construtora-perfil' && selectedItem?.name}
                  {currentView === 'imobiliaria-perfil' && selectedItem?.name}
                  {currentView === 'estoque' && 'Estoque de Lançamentos'}
                  {currentView === 'empreendimento-detail' && selectedDevelopment?.name}
                  {currentView === 'reserva' && 'Checkout de Reserva'}
                  {currentView === 'parcerias' && 'Minhas Parcerias'}
                  {currentView === 'contratos' && 'Contratos Digitais'}
                  {currentView === 'demandas' && '📢 Demandas Publicadas'}
                  {currentView === 'criar-demanda' && '➕ Nova Demanda de Compra'}
                  {currentView === 'demanda-detalhes' && 'Detalhes da Demanda'}
                  {currentView === 'cadastro-construtora' && '🏗️ Cadastro de Construtora'}
                  {currentView === 'cadastro-imobiliaria' && '🏠 Cadastro de Imobiliária'}
                  {currentView === 'cadastro-empreendimento' && '🏢 Cadastro de Empreendimento'}
                  {currentView === 'cadastro-corretor' && '👤 Cadastro de Corretor'}
                  {currentView === 'cadastros' && '📁 Cadastros'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <Settings className="h-5 w-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                R
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          {currentView === 'vitrine' && (
            <VitrineView 
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onViewProfile={(item, type) => {
                setSelectedItem(item);
                navigateTo(type === 'construtora' ? 'construtora-perfil' : 'imobiliaria-perfil');
              }}
              onProporParceria={(construtora) => {
                // Abre o Chat Drawer inline sem sair da tela
                openB2BChat({
                  targetOrgId: construtora.id, // Em produção seria organization_id real
                  targetOrgName: construtora.name,
                  targetOrgLogo: construtora.logo,
                  initialMessage: `Olá! Tenho interesse em conhecer os empreendimentos da ${construtora.name} e discutir uma possível parceria comercial. Podemos conversar?`
                });
              }}
            />
          )}
          
          {currentView === 'construtora-perfil' && selectedItem && (
            <ConstrutoraPerfilView 
              construtora={selectedItem}
              onProporParceria={() => navigateTo('parcerias')}
            />
          )}
          
          {currentView === 'imobiliaria-perfil' && selectedItem && (
            <ImobiliariaPerfilView 
              imobiliaria={selectedItem}
              onConectar={() => navigateTo('parcerias')}
            />
          )}
          
          {currentView === 'estoque' && (
            <EstoqueView 
              empreendimentos={MOCK_EMPREENDIMENTOS}
              onSelectDevelopment={(dev) => {
                setSelectedDevelopment(dev);
                navigateTo('empreendimento-detail');
              }}
            />
          )}
          
          {currentView === 'empreendimento-detail' && selectedDevelopment && (
            <EmpreendimentoDetailView 
              empreendimento={selectedDevelopment}
              units={MOCK_UNITS}
              espelho={MOCK_ESPELHO_VENDAS}
              onReservar={(unit) => {
                setSelectedItem(unit);
                navigateTo('reserva');
              }}
            />
          )}
          
          {currentView === 'reserva' && (
            <ReservaCheckoutView 
              unit={selectedItem}
              development={selectedDevelopment}
            />
          )}
          
          {currentView === 'parcerias' && (
            <ParceriasView />
          )}
          
          {currentView === 'contratos' && (
            <ContratosView />
          )}

          {currentView === 'cadastros' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cadastros</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Gerencie construtoras, imobiliárias, empreendimentos e corretores
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card Construtora */}
                <button
                  onClick={() => navigateTo('cadastro-construtora')}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-lg transition-all group text-left"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Building2 className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Construtora</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Cadastre e gerencie construtoras parceiras
                  </p>
                </button>

                {/* Card Imobiliária */}
                <button
                  onClick={() => navigateTo('cadastro-imobiliaria')}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-lg transition-all group text-left"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Store className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Imobiliária</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Cadastre imobiliárias parceiras da rede
                  </p>
                </button>

                {/* Card Empreendimento */}
                <button
                  onClick={() => navigateTo('cadastro-empreendimento')}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-lg transition-all group text-left"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Home className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Empreendimento</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Cadastre novos empreendimentos para venda
                  </p>
                </button>

                {/* Card Corretor */}
                <button
                  onClick={() => navigateTo('cadastro-corretor')}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-lg transition-all group text-left"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Corretor</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Cadastre corretores autônomos ou parceiros
                  </p>
                </button>
              </div>
            </div>
          )}
          
          {currentView === 'demandas' && (
            <DemandasView 
              onCriarDemanda={() => navigateTo('criar-demanda')}
              onVerDemanda={(demanda) => {
                setSelectedItem(demanda);
                navigateTo('demanda-detalhes');
              }}
            />
          )}
          
          {currentView === 'criar-demanda' && (
            <CriarDemandaView 
              onPublicar={() => navigateTo('demandas')}
              onCancelar={() => navigateTo('demandas')}
            />
          )}
          
          {currentView === 'demanda-detalhes' && selectedItem && (
            <DemandaDetalhesView 
              demanda={selectedItem}
              onVoltar={() => navigateTo('demandas')}
            />
          )}

          {currentView === 'cadastro-construtora' && (
            <CadastroConstrutoraView 
              onConcluir={() => navigateTo('cadastros')}
              onCancelar={() => navigateTo('cadastros')}
            />
          )}

          {currentView === 'cadastro-imobiliaria' && (
            <CadastroImobiliariaView 
              onConcluir={() => navigateTo('cadastros')}
              onCancelar={() => navigateTo('cadastros')}
            />
          )}

          {currentView === 'cadastro-empreendimento' && (
            <CadastroEmpreendimentoView 
              onConcluir={() => navigateTo('cadastros')}
              onCancelar={() => navigateTo('cadastros')}
            />
          )}

          {currentView === 'cadastro-corretor' && (
            <CadastroCorretorView 
              onConcluir={() => navigateTo('cadastros')}
              onCancelar={() => navigateTo('cadastros')}
            />
          )}
        </div>
        </main>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function SidebarItem({ icon, label, active, collapsed, onClick, badge, highlight }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  badge?: number;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
        active 
          ? highlight 
            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30"
            : "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" 
          : highlight && !active
            ? "text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
            : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left text-sm font-medium">{label}</span>
          {badge && (
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              active && highlight ? "bg-white text-orange-600" : "bg-red-500 text-white"
            )}>
              {badge}
            </span>
          )}
        </>
      )}
    </button>
  );
}

// ============================================
// VITRINE VIEW
// ============================================

function VitrineView({ activeTab, setActiveTab, searchTerm, setSearchTerm, onViewProfile, onProporParceria }: {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onViewProfile: (item: any, type: 'construtora' | 'imobiliaria') => void;
  onProporParceria?: (construtora: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Tabs e Busca */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('construtoras')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              activeTab === 'construtoras'
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            )}
          >
            <Building2 className="h-4 w-4 inline mr-2" />
            Construtoras
          </button>
          <button
            onClick={() => setActiveTab('imobiliarias')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              activeTab === 'imobiliarias'
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            )}
          >
            <Home className="h-4 w-4 inline mr-2" />
            Imobiliárias
          </button>
          <button
            onClick={() => setActiveTab('corretores')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              activeTab === 'corretores'
                ? "bg-sky-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            )}
          >
            <User className="h-4 w-4 inline mr-2" />
            Corretores
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
            />
          </div>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
            <Filter className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<Building2 className="h-5 w-5 text-indigo-600" />}
          label="Construtoras"
          value="156"
          trend="+12 este mês"
        />
        <StatCard 
          icon={<Home className="h-5 w-5 text-green-600" />}
          label="Imobiliárias"
          value="1.234"
          trend="+48 este mês"
        />
        <StatCard 
          icon={<Package className="h-5 w-5 text-orange-600" />}
          label="Lançamentos Ativos"
          value="892"
          trend="45.000 unidades"
        />
        <StatCard 
          icon={<Handshake className="h-5 w-5 text-purple-600" />}
          label="Parcerias Ativas"
          value="3.456"
          trend="+234 este mês"
        />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'construtoras' && MOCK_CONSTRUTORAS.map((item) => (
          <ConstrutoraCard 
            key={item.id} 
            construtora={item}
            onViewProfile={() => onViewProfile(item, 'construtora')}
            onProporParceria={() => onProporParceria?.(item)}
          />
        ))}
        {activeTab === 'imobiliarias' && MOCK_IMOBILIARIAS.map((item) => (
          <ImobiliariaCard 
            key={item.id} 
            imobiliaria={item}
            onViewProfile={() => onViewProfile(item, 'imobiliaria')}
          />
        ))}
        {activeTab === 'corretores' && MOCK_CORRETORES.map((item) => (
          <CorretorCard 
            key={item.id} 
            corretor={item}
          />
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-green-600">{trend}</p>
        </div>
      </div>
    </div>
  );
}

function ConstrutoraCard({ construtora, onViewProfile, onProporParceria }: { 
  construtora: any; 
  onViewProfile: () => void;
  onProporParceria?: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <img 
            src={construtora.logo} 
            alt={construtora.name}
            className="w-16 h-16 rounded-xl object-cover"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {construtora.name}
            </h3>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <MapPin className="h-3 w-3" />
              {construtora.location}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium">{construtora.rating}</span>
              <span className="text-xs text-gray-400">({construtora.reviewsCount})</span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">
          {construtora.description}
        </p>

        <div className="flex flex-wrap gap-1 mt-3">
          {construtora.segments.map((seg: string) => (
            <span key={seg} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full dark:bg-indigo-900/30 dark:text-indigo-400">
              {seg}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {construtora.launchesCount} lançamentos
            </span>
          </div>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full",
            construtora.partnershipStatus === 'open'
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
          )}>
            {construtora.partnershipStatus === 'open' ? '🤝 Aberta a parcerias' : '🔒 Fechada'}
          </span>
        </div>
      </div>
      
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 flex gap-2">
        <button 
          onClick={onViewProfile}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
        >
          <Eye className="h-4 w-4 inline mr-1" />
          Ver Perfil
        </button>
        <button 
          onClick={onProporParceria}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          <Handshake className="h-4 w-4 inline mr-1" />
          Propor Parceria
        </button>
      </div>
    </div>
  );
}

function ImobiliariaCard({ imobiliaria, onViewProfile }: { imobiliaria: any; onViewProfile: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <img 
            src={imobiliaria.logo} 
            alt={imobiliaria.name}
            className="w-16 h-16 rounded-xl object-cover"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {imobiliaria.name}
            </h3>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <MapPin className="h-3 w-3" />
              {imobiliaria.location}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium">{imobiliaria.rating}</span>
              <span className="text-xs text-gray-400">({imobiliaria.reviewsCount})</span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">
          {imobiliaria.description}
        </p>

        <div className="flex flex-wrap gap-1 mt-3">
          {imobiliaria.segments.map((seg: string) => (
            <span key={seg} className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-full dark:bg-purple-900/30 dark:text-purple-400">
              {seg}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {imobiliaria.brokersCount.toLocaleString()} corretores
            </span>
          </div>
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
            Divisão: {imobiliaria.partnershipModel}
          </span>
        </div>
      </div>
      
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 flex gap-2">
        <button 
          onClick={onViewProfile}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
        >
          <Eye className="h-4 w-4 inline mr-1" />
          Ver Perfil
        </button>
        <button className="flex-1 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">
          <MessageSquare className="h-4 w-4 inline mr-1" />
          Conectar
        </button>
      </div>
    </div>
  );
}

// ============================================
// CARD DE CORRETOR
// ============================================
function CorretorCard({ corretor }: { corretor: any }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="relative">
            <img 
              src={corretor.photo} 
              alt={corretor.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-sky-200"
            />
            {corretor.disponivel && (
              <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <CheckCircle2 className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {corretor.name}
            </h3>
            <p className="text-xs text-sky-600 font-medium">{corretor.creci}</p>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <MapPin className="h-3 w-3" />
              {corretor.location}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium">{corretor.rating}</span>
              <span className="text-xs text-gray-400">({corretor.reviewsCount})</span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">
          {corretor.bio}
        </p>

        <div className="flex flex-wrap gap-1 mt-3">
          {corretor.specialties.map((spec: string) => (
            <span key={spec} className="text-xs px-2 py-1 bg-sky-50 text-sky-600 rounded-full dark:bg-sky-900/30 dark:text-sky-400">
              {spec}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {corretor.regions.map((reg: string) => (
            <span key={reg} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full dark:bg-gray-700 dark:text-gray-400">
              📍 {reg}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{corretor.salesLastYear}</p>
              <p className="text-xs text-gray-500">vendas/ano</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{corretor.experience}</p>
              <p className="text-xs text-gray-500">experiência</p>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            corretor.vinculo === 'autonomo' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
          }`}>
            {corretor.vinculo === 'autonomo' ? '✓ Autônomo' : '🏢 Imobiliária'}
          </span>
        </div>
      </div>
      
      <div className="px-5 py-3 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 flex gap-2">
        <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300">
          <Eye className="h-4 w-4 inline mr-1" />
          Ver Perfil
        </button>
        <button className="flex-1 px-3 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700">
          <MessageSquare className="h-4 w-4 inline mr-1" />
          Contatar
        </button>
      </div>
    </div>
  );
}

// ============================================
// PERFIL CONSTRUTORA VIEW
// ============================================

function ConstrutoraPerfilView({ construtora, onProporParceria }: { construtora: any; onProporParceria: () => void }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-6">
          <img 
            src={construtora.logo} 
            alt={construtora.name}
            className="w-24 h-24 rounded-xl object-cover"
          />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{construtora.name}</h1>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                ✓ Verificada
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{construtora.description}</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{construtora.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium">{construtora.rating}</span>
                <span className="text-sm text-gray-400">({construtora.reviewsCount} avaliações)</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onProporParceria}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
          >
            <Handshake className="h-5 w-5 inline mr-2" />
            Propor Parceria
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sobre */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Sobre a Construtora</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">CNPJ</p>
                <p className="font-medium">00.000.000/0001-00</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fundação</p>
                <p className="font-medium">1995</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lançamentos Ativos</p>
                <p className="font-medium">{construtora.launchesCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Unidades Entregues</p>
                <p className="font-medium">15.000+</p>
              </div>
            </div>
          </div>

          {/* Lançamentos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Lançamentos Disponíveis</h2>
            <div className="space-y-3">
              {MOCK_EMPREENDIMENTOS.slice(0, 2).map((emp) => (
                <div key={emp.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <img src={emp.image} alt={emp.name} className="w-20 h-16 rounded-lg object-cover" />
                  <div className="flex-1">
                    <h3 className="font-medium">{emp.name}</h3>
                    <p className="text-sm text-gray-500">{emp.location}</p>
                    <p className="text-sm text-indigo-600 font-medium">{emp.availableUnits} unidades disponíveis</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - Condições */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Condições de Parceria</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Modelo de Comissão</p>
                <p className="font-medium text-lg text-green-600">{construtora.commissionModel}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Segmentos</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {construtora.segments.map((seg: string) => (
                    <span key={seg} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full">
                      {seg}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Requisitos</p>
                <ul className="text-sm mt-1 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    CRECI ativo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Mínimo 10 corretores
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Experiência em lançamentos
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
            <Shield className="h-8 w-8 mb-3" />
            <h3 className="font-semibold mb-2">Parceiro Verificado</h3>
            <p className="text-sm opacity-90">
              Esta construtora passou por verificação de documentos e histórico.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PERFIL IMOBILIÁRIA VIEW
// ============================================

function ImobiliariaPerfilView({ imobiliaria, onConectar }: { imobiliaria: any; onConectar: () => void }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-6">
          <img 
            src={imobiliaria.logo} 
            alt={imobiliaria.name}
            className="w-24 h-24 rounded-xl object-cover"
          />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{imobiliaria.name}</h1>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                ✓ CRECI Verificado
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{imobiliaria.description}</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{imobiliaria.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium">{imobiliaria.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{imobiliaria.brokersCount.toLocaleString()} corretores</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onConectar}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
          >
            <MessageSquare className="h-5 w-5 inline mr-2" />
            Conectar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Informações</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">CNPJ</p>
                <p className="font-medium">00.000.000/0001-00</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">CRECI</p>
                <p className="font-medium">{imobiliaria.creci}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Corretores Ativos</p>
                <p className="font-medium">{imobiliaria.brokersCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vendas no Ano</p>
                <p className="font-medium">234</p>
              </div>
            </div>
          </div>

          {/* Áreas de Atuação */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Áreas de Atuação</h2>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">Pinheiros</span>
              <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">Itaim Bibi</span>
              <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">Moema</span>
              <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">Vila Mariana</span>
              <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">Jardins</span>
            </div>
          </div>
        </div>

        {/* Sidebar - Condições de Parceria */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Condições de Parceria</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Divisão de Comissão</p>
                <p className="font-medium text-lg text-purple-600">{imobiliaria.partnershipModel}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Exclusividade de Cliente</p>
                <p className="font-medium">30 dias</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Responsabilidades</p>
                <ul className="text-sm mt-1 space-y-1">
                  <li>• Atendimento ao cliente</li>
                  <li>• Suporte documental</li>
                  <li>• Acompanhamento pós-venda</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ESTOQUE VIEW - MOTOR DE BUSCA AVANÇADO
// ============================================

// Configuração dos filtros avançados
const FILTER_CONFIG = {
  phases: [
    { value: 'all', label: 'Todas as fases' },
    { value: 'launch', label: '🚀 Lançamento' },
    { value: 'construction', label: '🏗️ Em construção' },
    { value: 'ready', label: '✅ Pronto para morar' },
  ],
  regions: [
    { value: 'all', label: 'Todas as regiões' },
    { value: 'sp-sul', label: 'São Paulo - Zona Sul' },
    { value: 'sp-oeste', label: 'São Paulo - Zona Oeste' },
    { value: 'sp-norte', label: 'São Paulo - Zona Norte' },
    { value: 'sp-leste', label: 'São Paulo - Zona Leste' },
    { value: 'sp-centro', label: 'São Paulo - Centro' },
    { value: 'abc', label: 'ABC Paulista' },
    { value: 'grande-sp', label: 'Grande São Paulo' },
    { value: 'litoral', label: 'Litoral' },
    { value: 'interior', label: 'Interior' },
  ],
  typologies: [
    { value: 'studio', label: 'Studio' },
    { value: '1quarto', label: '1 Quarto' },
    { value: '2quartos', label: '2 Quartos' },
    { value: '3quartos', label: '3 Quartos' },
    { value: '4quartos', label: '4+ Quartos' },
    { value: 'cobertura', label: 'Cobertura' },
    { value: 'garden', label: 'Garden' },
    { value: 'duplex', label: 'Duplex' },
  ],
  priceRanges: [
    { value: 'all', label: 'Qualquer valor', min: 0, max: Infinity },
    { value: 'mcmv', label: 'MCMV (até R$ 264mil)', min: 0, max: 264000 },
    { value: '264-350', label: 'R$ 264mil - R$ 350mil', min: 264000, max: 350000 },
    { value: '350-500', label: 'R$ 350mil - R$ 500mil', min: 350000, max: 500000 },
    { value: '500-750', label: 'R$ 500mil - R$ 750mil', min: 500000, max: 750000 },
    { value: '750-1m', label: 'R$ 750mil - R$ 1 milhão', min: 750000, max: 1000000 },
    { value: '1m-2m', label: 'R$ 1 milhão - R$ 2 milhões', min: 1000000, max: 2000000 },
    { value: '2m+', label: 'Acima de R$ 2 milhões', min: 2000000, max: Infinity },
  ],
  areaRanges: [
    { value: 'all', label: 'Qualquer área' },
    { value: '0-40', label: 'Até 40m²' },
    { value: '40-60', label: '40m² - 60m²' },
    { value: '60-90', label: '60m² - 90m²' },
    { value: '90-120', label: '90m² - 120m²' },
    { value: '120-200', label: '120m² - 200m²' },
    { value: '200+', label: 'Acima de 200m²' },
  ],
  sunPosition: [
    { value: 'morning', label: '☀️ Sol da manhã (Nascente)', icon: '🌅' },
    { value: 'afternoon', label: '🌤️ Sol da tarde (Poente)', icon: '🌇' },
    { value: 'both', label: '☀️ Sol o dia todo', icon: '🌞' },
  ],
  floorPreference: [
    { value: 'low', label: '🏢 Andar baixo (1-5)' },
    { value: 'mid', label: '🏢 Andar médio (6-15)' },
    { value: 'high', label: '🏙️ Andar alto (16+)' },
    { value: 'top', label: '🌟 Último andar' },
  ],
  viewType: [
    { value: 'city', label: '🏙️ Vista cidade' },
    { value: 'park', label: '🌳 Vista parque/verde' },
    { value: 'sea', label: '🌊 Vista mar' },
    { value: 'pool', label: '🏊 Vista piscina/lazer' },
    { value: 'internal', label: '🏠 Vista interna' },
  ],
  amenitiesBuilding: [
    { value: 'pool', label: '🏊 Piscina', icon: '🏊' },
    { value: 'gym', label: '🏋️ Academia', icon: '🏋️' },
    { value: 'playground', label: '🎠 Playground', icon: '🎠' },
    { value: 'party-room', label: '🎉 Salão de festas', icon: '🎉' },
    { value: 'gourmet', label: '👨‍🍳 Espaço gourmet', icon: '👨‍🍳' },
    { value: 'coworking', label: '💼 Coworking', icon: '💼' },
    { value: 'pet-place', label: '🐕 Pet place', icon: '🐕' },
    { value: 'rooftop', label: '🌇 Rooftop', icon: '🌇' },
    { value: 'sauna', label: '🧖 Sauna', icon: '🧖' },
    { value: 'spa', label: '💆 Spa', icon: '💆' },
    { value: 'cinema', label: '🎬 Cinema', icon: '🎬' },
    { value: 'sports', label: '⚽ Quadra esportiva', icon: '⚽' },
    { value: 'bicicletario', label: '🚲 Bicicletário', icon: '🚲' },
    { value: 'delivery-room', label: '📦 Delivery room', icon: '📦' },
  ],
  parking: [
    { value: '1', label: '1 vaga' },
    { value: '2', label: '2 vagas' },
    { value: '3+', label: '3+ vagas' },
    { value: 'ev', label: '⚡ Vaga carro elétrico', special: true },
    { value: 'large', label: '🚐 Vaga grande/SUV', special: true },
    { value: 'covered', label: '🏠 Vaga coberta', special: true },
  ],
  sustainability: [
    { value: 'solar', label: '☀️ Energia solar', icon: '☀️' },
    { value: 'water-reuse', label: '💧 Reuso de água', icon: '💧' },
    { value: 'ev-charger', label: '⚡ Carregador EV', icon: '⚡' },
    { value: 'leed', label: '🌿 Certificação LEED', icon: '🌿' },
    { value: 'green-areas', label: '🌳 Áreas verdes', icon: '🌳' },
    { value: 'smart-building', label: '🏢 Smart building', icon: '🏢' },
  ],
  security: [
    { value: '24h', label: '🛡️ Portaria 24h' },
    { value: 'cameras', label: '📹 Câmeras CFTV' },
    { value: 'biometrics', label: '👆 Biometria' },
    { value: 'facial', label: '👤 Reconhecimento facial' },
    { value: 'smart-lock', label: '🔐 Fechadura digital' },
  ],
  unitFeatures: [
    { value: 'varanda', label: '🌅 Varanda' },
    { value: 'varanda-gourmet', label: '🍖 Varanda gourmet' },
    { value: 'churrasqueira', label: '🔥 Churrasqueira' },
    { value: 'ar-condicionado', label: '❄️ Ar condicionado' },
    { value: 'piso-porcelanato', label: '✨ Piso porcelanato' },
    { value: 'cozinha-americana', label: '🍳 Cozinha americana' },
    { value: 'closet', label: '👔 Closet' },
    { value: 'home-office', label: '💻 Home office' },
    { value: 'lavabo', label: '🚽 Lavabo' },
    { value: 'despensa', label: '📦 Despensa' },
    { value: 'aquecimento', label: '🔥 Aquecimento' },
  ],
  deliveryDate: [
    { value: 'all', label: 'Qualquer data' },
    { value: 'ready', label: '✅ Pronto' },
    { value: '2026', label: '📅 2026' },
    { value: '2027', label: '📅 2027' },
    { value: '2028', label: '📅 2028' },
    { value: '2029+', label: '📅 2029 ou depois' },
  ],
  paymentConditions: [
    { value: 'mcmv', label: '🏠 MCMV / Casa Verde Amarela' },
    { value: 'fgts', label: '💰 Aceita FGTS' },
    { value: 'financing', label: '🏦 Financiamento bancário' },
    { value: 'direct', label: '📝 Direto com construtora' },
    { value: 'consorcio', label: '🔄 Consórcio' },
    { value: 'permuta', label: '🔁 Aceita permuta' },
  ],
};

function EstoqueView({ empreendimentos, onSelectDevelopment }: { 
  empreendimentos: any[]; 
  onSelectDevelopment: (dev: any) => void 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  
  // Estados dos filtros
  const [filters, setFilters] = useState({
    phase: 'all',
    region: 'all',
    priceRange: 'all',
    areaRange: 'all',
    deliveryDate: 'all',
    typologies: [] as string[],
    sunPosition: [] as string[],
    floorPreference: [] as string[],
    viewType: [] as string[],
    amenitiesBuilding: [] as string[],
    parking: [] as string[],
    sustainability: [] as string[],
    security: [] as string[],
    unitFeatures: [] as string[],
    paymentConditions: [] as string[],
  });

  // Contar filtros ativos
  React.useEffect(() => {
    let count = 0;
    if (filters.phase !== 'all') count++;
    if (filters.region !== 'all') count++;
    if (filters.priceRange !== 'all') count++;
    if (filters.areaRange !== 'all') count++;
    if (filters.deliveryDate !== 'all') count++;
    count += filters.typologies.length;
    count += filters.sunPosition.length;
    count += filters.floorPreference.length;
    count += filters.viewType.length;
    count += filters.amenitiesBuilding.length;
    count += filters.parking.length;
    count += filters.sustainability.length;
    count += filters.security.length;
    count += filters.unitFeatures.length;
    count += filters.paymentConditions.length;
    setActiveFiltersCount(count);
  }, [filters]);

  const toggleArrayFilter = (category: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const arr = prev[category] as string[];
      if (arr.includes(value)) {
        return { ...prev, [category]: arr.filter(v => v !== value) };
      } else {
        return { ...prev, [category]: [...arr, value] };
      }
    });
  };

  const clearAllFilters = () => {
    setFilters({
      phase: 'all',
      region: 'all',
      priceRange: 'all',
      areaRange: 'all',
      deliveryDate: 'all',
      typologies: [],
      sunPosition: [],
      floorPreference: [],
      viewType: [],
      amenitiesBuilding: [],
      parking: [],
      sustainability: [],
      security: [],
      unitFeatures: [],
      paymentConditions: [],
    });
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* Barra de Busca Principal */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, construtora, bairro, cidade..."
              className="w-full pl-12 pr-4 py-3 text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          {/* Filtros Rápidos */}
          <select 
            value={filters.phase}
            onChange={(e) => setFilters(prev => ({ ...prev, phase: e.target.value }))}
            className="px-4 py-3 border border-gray-200 rounded-xl dark:bg-gray-700 dark:border-gray-600 min-w-[160px]"
          >
            {FILTER_CONFIG.phases.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          
          <select 
            value={filters.region}
            onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
            className="px-4 py-3 border border-gray-200 rounded-xl dark:bg-gray-700 dark:border-gray-600 min-w-[180px]"
          >
            {FILTER_CONFIG.regions.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          {/* Botão Filtros Avançados */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors",
              showAdvancedFilters || activeFiltersCount > 0
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            )}
          >
            <Filter className="h-5 w-5" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="bg-white text-indigo-600 text-xs px-2 py-0.5 rounded-full font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Tags de Filtros Ativos */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500">Filtros ativos:</span>
            {filters.sunPosition.map(f => (
              <span key={f} className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                {FILTER_CONFIG.sunPosition.find(s => s.value === f)?.label}
                <button onClick={() => toggleArrayFilter('sunPosition', f)} className="hover:text-yellow-600">×</button>
              </span>
            ))}
            {filters.parking.filter(p => ['ev', 'large', 'covered'].includes(p)).map(f => (
              <span key={f} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                {FILTER_CONFIG.parking.find(s => s.value === f)?.label}
                <button onClick={() => toggleArrayFilter('parking', f)} className="hover:text-green-600">×</button>
              </span>
            ))}
            {filters.sustainability.map(f => (
              <span key={f} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs">
                {FILTER_CONFIG.sustainability.find(s => s.value === f)?.label}
                <button onClick={() => toggleArrayFilter('sustainability', f)} className="hover:text-emerald-600">×</button>
              </span>
            ))}
            {filters.amenitiesBuilding.slice(0, 3).map(f => (
              <span key={f} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                {FILTER_CONFIG.amenitiesBuilding.find(s => s.value === f)?.label}
                <button onClick={() => toggleArrayFilter('amenitiesBuilding', f)} className="hover:text-purple-600">×</button>
              </span>
            ))}
            {filters.amenitiesBuilding.length > 3 && (
              <span className="text-xs text-gray-500">+{filters.amenitiesBuilding.length - 3} mais</span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Limpar todos
            </button>
          </div>
        )}
      </div>

      {/* Painel de Filtros Avançados */}
      {showAdvancedFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Motor de Busca Avançado
            </h3>
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-red-600"
            >
              Limpar filtros
            </button>
          </div>
          
          <div className="p-6 space-y-8">
            {/* Linha 1: Preço, Área, Entrega */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  💰 Faixa de Preço
                </label>
                <select 
                  value={filters.priceRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  {FILTER_CONFIG.priceRanges.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📐 Área do Imóvel
                </label>
                <select 
                  value={filters.areaRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, areaRange: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  {FILTER_CONFIG.areaRanges.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📅 Data de Entrega
                </label>
                <select 
                  value={filters.deliveryDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  {FILTER_CONFIG.deliveryDate.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tipologias */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                🛏️ Tipologia
              </label>
              <div className="flex flex-wrap gap-2">
                {FILTER_CONFIG.typologies.map(t => (
                  <button
                    key={t.value}
                    onClick={() => toggleArrayFilter('typologies', t.value)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      filters.typologies.includes(t.value)
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sol e Posição - DESTAQUE */}
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
              <label className="block text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-3">
                ☀️ Posição Solar (Importante para qualidade de vida)
              </label>
              <div className="flex flex-wrap gap-3">
                {FILTER_CONFIG.sunPosition.map(s => (
                  <button
                    key={s.value}
                    onClick={() => toggleArrayFilter('sunPosition', s.value)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                      filters.sunPosition.includes(s.value)
                        ? "bg-yellow-500 text-white shadow-lg shadow-yellow-500/30"
                        : "bg-white text-gray-700 hover:bg-yellow-100 border border-yellow-200 dark:bg-gray-800 dark:text-gray-300"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Andar e Vista */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  🏢 Preferência de Andar
                </label>
                <div className="flex flex-wrap gap-2">
                  {FILTER_CONFIG.floorPreference.map(f => (
                    <button
                      key={f.value}
                      onClick={() => toggleArrayFilter('floorPreference', f.value)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        filters.floorPreference.includes(f.value)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  👁️ Tipo de Vista
                </label>
                <div className="flex flex-wrap gap-2">
                  {FILTER_CONFIG.viewType.map(v => (
                    <button
                      key={v.value}
                      onClick={() => toggleArrayFilter('viewType', v.value)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        filters.viewType.includes(v.value)
                          ? "bg-cyan-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Vagas - DESTAQUE CARRO ELÉTRICO */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <label className="block text-sm font-medium text-green-800 dark:text-green-200 mb-3">
                🚗 Vagas de Garagem
              </label>
              <div className="flex flex-wrap gap-3">
                {FILTER_CONFIG.parking.map(p => (
                  <button
                    key={p.value}
                    onClick={() => toggleArrayFilter('parking', p.value)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                      filters.parking.includes(p.value)
                        ? p.value === 'ev' 
                          ? "bg-green-600 text-white shadow-lg shadow-green-500/30"
                          : "bg-green-500 text-white"
                        : "bg-white text-gray-700 hover:bg-green-100 border border-green-200 dark:bg-gray-800 dark:text-gray-300",
                      p.value === 'ev' && "ring-2 ring-green-400 ring-offset-2"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sustentabilidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                🌱 Sustentabilidade & Tecnologia
              </label>
              <div className="flex flex-wrap gap-2">
                {FILTER_CONFIG.sustainability.map(s => (
                  <button
                    key={s.value}
                    onClick={() => toggleArrayFilter('sustainability', s.value)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      filters.sustainability.includes(s.value)
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lazer do Condomínio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                🎯 Lazer & Áreas Comuns
              </label>
              <div className="flex flex-wrap gap-2">
                {FILTER_CONFIG.amenitiesBuilding.map(a => (
                  <button
                    key={a.value}
                    onClick={() => toggleArrayFilter('amenitiesBuilding', a.value)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      filters.amenitiesBuilding.includes(a.value)
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Segurança */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                🛡️ Segurança
              </label>
              <div className="flex flex-wrap gap-2">
                {FILTER_CONFIG.security.map(s => (
                  <button
                    key={s.value}
                    onClick={() => toggleArrayFilter('security', s.value)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      filters.security.includes(s.value)
                        ? "bg-slate-700 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Características da Unidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                🏠 Características da Unidade
              </label>
              <div className="flex flex-wrap gap-2">
                {FILTER_CONFIG.unitFeatures.map(f => (
                  <button
                    key={f.value}
                    onClick={() => toggleArrayFilter('unitFeatures', f.value)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      filters.unitFeatures.includes(f.value)
                        ? "bg-orange-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Condições de Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                💳 Condições de Pagamento
              </label>
              <div className="flex flex-wrap gap-2">
                {FILTER_CONFIG.paymentConditions.map(p => (
                  <button
                    key={p.value}
                    onClick={() => toggleArrayFilter('paymentConditions', p.value)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      filters.paymentConditions.includes(p.value)
                        ? "bg-teal-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer do Painel */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {activeFiltersCount > 0 ? `${activeFiltersCount} filtros ativos` : 'Nenhum filtro aplicado'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAdvancedFilters(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Fechar
              </button>
              <button
                onClick={() => setShowAdvancedFilters(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900 dark:text-white">{empreendimentos.length}</span> empreendimentos encontrados
        </p>
        <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600">
          <option>Ordenar: Mais relevantes</option>
          <option>Menor preço</option>
          <option>Maior preço</option>
          <option>Mais recentes</option>
          <option>Mais unidades disponíveis</option>
          <option>Entrega mais próxima</option>
        </select>
      </div>

      {/* Grid de Empreendimentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {empreendimentos.map((emp) => (
          <div 
            key={emp.id}
            onClick={() => onSelectDevelopment(emp)}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
          >
            <div className="relative">
              <img src={emp.image} alt={emp.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
              <span className={cn(
                "absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium",
                emp.phase === 'launch' ? "bg-green-500 text-white" :
                emp.phase === 'construction' ? "bg-yellow-500 text-white" :
                "bg-blue-500 text-white"
              )}>
                {emp.phase === 'launch' ? '🚀 Lançamento' : 
                 emp.phase === 'construction' ? '🏗️ Em construção' : '✅ Pronto'}
              </span>
              {/* Tags de destaque */}
              <div className="absolute top-3 right-3 flex flex-col gap-1">
                <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full">☀️ Sol manhã</span>
                <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">⚡ Vaga EV</span>
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{emp.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{emp.constructor}</p>
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                <MapPin className="h-3 w-3" />
                {emp.location}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Disponíveis</span>
                  <span className="font-medium text-green-600">{emp.availableUnits} de {emp.totalUnits}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${(emp.availableUnits / emp.totalUnits) * 100}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1">
                {emp.typologies.map((t: string) => (
                  <span key={t} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                    {t}
                  </span>
                ))}
              </div>

              <p className="mt-3 text-indigo-600 font-semibold">{emp.priceRange}</p>
              <p className="text-xs text-gray-400 mt-1">Entrega: {emp.deliveryDate}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// EMPREENDIMENTO DETAIL VIEW - CARD COMPLETO COM ABAS
// Integra: Visão Geral, Disponibilidade, Materiais
// ============================================

type EmpreendimentoTabType = 'disponibilidade' | 'materiais' | 'sobre';

function EmpreendimentoDetailView({ 
  empreendimento, 
  units, 
  espelho,
  onReservar 
}: { 
  empreendimento: any; 
  units: any[];
  espelho: typeof MOCK_ESPELHO_VENDAS;
  onReservar: (unit: any) => void;
}) {
  const [activeTab, setActiveTab] = useState<EmpreendimentoTabType>('disponibilidade');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedBloco, setSelectedBloco] = useState(espelho.blocos[0]?.nome || 'A');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-700';
      case 'reserved': return 'bg-yellow-100 text-yellow-700';
      case 'sold': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Disponível';
      case 'reserved': return 'Reservada';
      case 'sold': return 'Vendida';
      default: return 'Indisponível';
    }
  };

  const handleCopyLink = (nome: string) => {
    setCopiedLink(nome);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Categorias de materiais baseadas no empreendimento
  const categoriasMateriais = [
    {
      id: 'documentos',
      nome: 'Documentos de Vendas',
      icone: FileText,
      itens: [
        { nome: 'Book Digital', formato: 'PDF', tamanho: '14 MB', disponivel: true },
        { nome: 'Ficha Técnica', formato: 'PDF', tamanho: '1.7 MB', disponivel: true },
        { nome: 'Estudo de Rentabilidade', formato: 'PDF', tamanho: '2.1 MB', disponivel: empreendimento.materiais?.estudoRentabilidade },
        { nome: 'Custo Condominial', formato: 'PDF', tamanho: '338 KB', disponivel: false },
      ]
    },
    {
      id: 'tabelas',
      nome: 'Tabelas de Preços',
      icone: Table,
      destaque: true,
      itens: [
        { nome: 'Tabela de Preços Atual', formato: 'PDF', tamanho: '449 KB', disponivel: true, destaque: true },
        { nome: 'Tabela Promocional', formato: 'PDF', tamanho: '161 KB', disponivel: empreendimento.campanhaAtiva, destaque: empreendimento.campanhaAtiva },
      ]
    },
    {
      id: 'midia',
      nome: 'Mídia e Marketing',
      icone: Image,
      itens: [
        { nome: 'Plantas Humanizadas', formato: 'Pasta', disponivel: true, pasta: true },
        { nome: 'Réguas WhatsApp', formato: 'JPEG', disponivel: true, pasta: true },
        { nome: 'Imagens para Redes', formato: 'Pasta', disponivel: true, pasta: true },
      ]
    },
    {
      id: 'videos',
      nome: 'Vídeos',
      icone: Video,
      itens: [
        { nome: 'Vídeo Institucional', formato: 'MP4', tamanho: '35 MB', disponivel: true },
        { nome: 'Tour Virtual 360°', formato: 'Link', disponivel: empreendimento.hasVirtualTour, link: empreendimento.virtualTourUrl },
      ]
    },
    {
      id: 'obra',
      nome: 'Andamento da Obra',
      icone: Camera,
      itens: [
        { nome: 'Fotos Atualizadas', formato: 'Pasta', disponivel: empreendimento.phase === 'construction', pasta: true },
        { nome: 'Relatório de Obra', formato: 'PDF', disponivel: empreendimento.phase === 'construction' },
      ]
    },
    {
      id: 'juridico',
      nome: 'Documentos Jurídicos',
      icone: Shield,
      itens: [
        { nome: 'Ficha Cadastral PF', formato: 'PDF', tamanho: '187 KB', disponivel: true, editavel: true },
        { nome: 'Ficha Cadastral PJ', formato: 'PDF', tamanho: '145 KB', disponivel: true, editavel: true },
        { nome: 'Minuta do Contrato', formato: 'PDF', disponivel: true },
      ]
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header do Empreendimento */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="relative h-40 bg-gradient-to-r from-indigo-600 to-purple-700">
          <img 
            src={empreendimento.image} 
            alt={empreendimento.name} 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 p-6 flex items-end">
            <div className="flex items-center gap-4 w-full">
              <img 
                src={empreendimento.constructorLogo} 
                alt={empreendimento.constructor}
                className="w-16 h-16 rounded-xl bg-white p-1"
              />
              <div className="flex-1 text-white">
                <h1 className="text-2xl font-bold">{empreendimento.name}</h1>
                <p className="text-white/80">{empreendimento.constructor} • {empreendimento.location}</p>
              </div>
              <div className="text-right text-white">
                <p className="text-sm opacity-80">Entrega</p>
                <p className="text-xl font-bold">{empreendimento.deliveryDate}</p>
              </div>
              {empreendimento.campanhaAtiva && (
                <div className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg text-sm font-medium">
                  🔥 {empreendimento.campanha}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{empreendimento.availableUnits}</p>
            <p className="text-xs text-gray-500">Disponíveis</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{empreendimento.totalUnits}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{empreendimento.soldPercentage}%</p>
            <p className="text-xs text-gray-500">Vendido</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{empreendimento.priceRange}</p>
            <p className="text-xs text-gray-500">Faixa de Preço</p>
          </div>
        </div>

        {/* Tabs de Navegação */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('disponibilidade')}
              className={cn(
                "flex-1 px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors",
                activeTab === 'disponibilidade'
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <Table className="h-4 w-4" />
              Disponibilidade
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                {empreendimento.availableUnits}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('materiais')}
              className={cn(
                "flex-1 px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors",
                activeTab === 'materiais'
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <FileText className="h-4 w-4" />
              Materiais
              {empreendimento.campanhaAtiva && (
                <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                  Atualizado
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sobre')}
              className={cn(
                "flex-1 px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors",
                activeTab === 'sobre'
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <Building className="h-4 w-4" />
              Sobre
            </button>
          </div>
        </div>
      </div>

      {/* ===== TAB: DISPONIBILIDADE ===== */}
      {activeTab === 'disponibilidade' && (
        <div className="space-y-4">
          {/* Controles de View */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Legenda */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Status:</span>
                <span className="flex items-center gap-1 text-sm"><span className="w-3 h-3 rounded-full bg-green-500" /> Disponível</span>
                <span className="flex items-center gap-1 text-sm"><span className="w-3 h-3 rounded-full bg-yellow-500" /> Reservada</span>
                <span className="flex items-center gap-1 text-sm"><span className="w-3 h-3 rounded-full bg-red-500" /> Vendida</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Visualização:</span>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  "p-2 rounded-lg",
                  viewMode === 'table' ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-600"
                )}
              >
                <Table className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-lg",
                  viewMode === 'grid' ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-600"
                )}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* View Tabela */}
          {viewMode === 'table' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidade</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Torre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Andar</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipologia</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preço</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {units.map((unit) => (
                    <tr key={unit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium">{unit.unit}</td>
                      <td className="px-4 py-3">{unit.tower}</td>
                      <td className="px-4 py-3">{unit.floor}º</td>
                      <td className="px-4 py-3">{unit.typology}</td>
                      <td className="px-4 py-3">{unit.area}m²</td>
                      <td className="px-4 py-3 font-medium">R$ {unit.price.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit", getStatusColor(unit.status))}>
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            unit.status === 'available' ? "bg-green-500" : unit.status === 'reserved' ? "bg-yellow-500" : "bg-red-500"
                          )} />
                          {getStatusLabel(unit.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {unit.status === 'available' && (
                          <button 
                            onClick={() => onReservar(unit)}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                          >
                            Reservar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* View Grid (Espelho) */}
          {viewMode === 'grid' && (
            <div className="space-y-4">
              {/* Seleção de Bloco */}
              <div className="flex gap-2">
                {espelho.blocos.map((bloco) => (
                  <button
                    key={bloco.nome}
                    onClick={() => setSelectedBloco(bloco.nome)}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      selectedBloco === bloco.nome
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    )}
                  >
                    Bloco {bloco.nome}
                  </button>
                ))}
              </div>

              {/* Grid Visual */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 overflow-x-auto">
                <div className="min-w-[600px]">
                  {espelho.blocos
                    .filter(b => b.nome === selectedBloco)
                    .map((bloco) => (
                      <div key={bloco.nome} className="space-y-2">
                        {bloco.andares.map((andar) => (
                          <div key={andar.andar} className="flex items-center gap-2">
                            <div className="w-12 text-right text-sm font-medium text-gray-500">
                              {andar.andar}º
                            </div>
                            <div className="flex gap-1 flex-1">
                              {andar.unidades.map((unidade: any, idx: number) => {
                                const statusItem = espelho.legenda.find(l => l.status === unidade.status);
                                const isAvailable = unidade.status === 'disponivel';
                                return (
                                  <div
                                    key={idx}
                                    className={cn(
                                      "flex-1 h-16 rounded-lg flex flex-col items-center justify-center text-xs transition-all",
                                      isAvailable ? "cursor-pointer hover:scale-105 hover:shadow-lg" : "opacity-70"
                                    )}
                                    style={{ backgroundColor: statusItem?.cor || '#e5e7eb' }}
                                    onClick={() => isAvailable && onReservar({ 
                                      ...unidade, 
                                      floor: andar.andar,
                                      tower: bloco.nome
                                    })}
                                  >
                                    {unidade.id !== '-' && (
                                      <>
                                        <span className="font-bold text-white">{unidade.id}</span>
                                        <span className="text-white/80 text-[10px]">{unidade.tipologia}</span>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>

                {/* Legenda do Grid */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
                  {espelho.legenda.filter(l => l.status !== 'vazio').map((item) => (
                    <div key={item.status} className="flex items-center gap-2 text-sm">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.cor }} />
                      <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: MATERIAIS ===== */}
      {activeTab === 'materiais' && (
        <div className="space-y-4">
          {/* Filtro de Categorias */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('todos')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                selectedCategory === 'todos'
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50"
              )}
            >
              Todos os Materiais
            </button>
            {categoriasMateriais.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2",
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50",
                  cat.destaque && selectedCategory !== cat.id && "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
                )}
              >
                <cat.icone className="h-4 w-4" />
                {cat.nome}
              </button>
            ))}
          </div>

          {/* Lista de Materiais */}
          <div className="space-y-4">
            {categoriasMateriais
              .filter(cat => selectedCategory === 'todos' || selectedCategory === cat.id)
              .map((categoria) => (
                <div 
                  key={categoria.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <categoria.icone className="h-5 w-5 text-gray-500" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">{categoria.nome}</h3>
                    </div>
                    {categoria.destaque && (
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                        Atualizado
                      </span>
                    )}
                  </div>
                  
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {categoria.itens.map((item: any, idx) => (
                      <div 
                        key={idx}
                        className={cn(
                          "px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                          !item.disponivel && "opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            item.disponivel 
                              ? item.destaque ? "bg-orange-100 text-orange-600" : "bg-indigo-100 text-indigo-600"
                              : "bg-gray-100 text-gray-400"
                          )}>
                            {item.pasta ? <Image className="h-5 w-5" /> : 
                             item.link ? <Play className="h-5 w-5" /> : 
                             <FileText className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className={cn(
                              "font-medium",
                              item.destaque ? "text-orange-700 dark:text-orange-400" : "text-gray-900 dark:text-white"
                            )}>
                              {item.nome}
                              {item.destaque && <span className="ml-2">🔥</span>}
                            </p>
                            <p className="text-sm text-gray-500">
                              {item.formato}
                              {item.tamanho && ` • ${item.tamanho}`}
                              {item.editavel && ' • Editável'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.disponivel ? (
                            <>
                              {item.link ? (
                                <a 
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 flex items-center gap-1"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Abrir
                                </a>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => handleCopyLink(item.nome)}
                                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                                    title="Copiar link"
                                  >
                                    {copiedLink === item.nome ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </button>
                                  <button 
                                    className={cn(
                                      "px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1",
                                      item.destaque 
                                        ? "text-white bg-orange-500 hover:bg-orange-600"
                                        : "text-white bg-indigo-600 hover:bg-indigo-700"
                                    )}
                                  >
                                    <Download className="h-4 w-4" />
                                    Baixar
                                  </button>
                                </>
                              )}
                              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" title="Compartilhar">
                                <Share2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">Indisponível</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ===== TAB: SOBRE ===== */}
      {activeTab === 'sobre' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Info Geral */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informações Gerais
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Construtora</span>
                <span className="font-medium">{empreendimento.constructor}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Localização</span>
                <span className="font-medium">{empreendimento.location}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Fase</span>
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  empreendimento.phase === 'launch' ? "bg-green-100 text-green-700" :
                  empreendimento.phase === 'construction' ? "bg-yellow-100 text-yellow-700" :
                  "bg-blue-100 text-blue-700"
                )}>
                  {empreendimento.phase === 'launch' ? '🚀 Lançamento' : 
                   empreendimento.phase === 'construction' ? '🏗️ Em construção' : '✅ Pronto'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Entrega</span>
                <span className="font-medium">{empreendimento.deliveryDate}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Torres</span>
                <span className="font-medium">{empreendimento.towers}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Total de Unidades</span>
                <span className="font-medium">{empreendimento.totalUnits}</span>
              </div>
            </div>
          </div>

          {/* Tipologias */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Tipologias Disponíveis
            </h3>
            <div className="flex flex-wrap gap-2">
              {empreendimento.typologies?.map((tipo: string, idx: number) => (
                <span 
                  key={idx}
                  className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium"
                >
                  {tipo}
                </span>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 mb-2">Faixa de preço</p>
              <p className="text-xl font-bold text-indigo-600">{empreendimento.priceRange}</p>
            </div>
          </div>

          {/* Diferenciais */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 lg:col-span-2">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Star className="h-5 w-5" />
              Diferenciais
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="text-xl">☀️</span> Sol da Manhã
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="text-xl">⚡</span> Vaga para Carro Elétrico
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="text-xl">🏊</span> Lazer Completo
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="text-xl">🛡️</span> Segurança 24h
              </div>
            </div>
          </div>

          {/* Ações */}
          {empreendimento.campanhaAtiva && (
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1">🔥 {empreendimento.campanha}</h3>
                  <p className="text-white/80">Condições especiais por tempo limitado!</p>
                </div>
                <button className="px-6 py-3 bg-white text-orange-600 rounded-lg font-semibold hover:bg-gray-100">
                  Ver Condições
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// CHECKOUT RESERVA VIEW
// ============================================

function ReservaCheckoutView({ unit, development }: { unit: any; development: any }) {
  const [step, setStep] = useState(1);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {['Dados do Cliente', 'Confirmação', 'Pagamento'].map((label, idx) => (
          <div key={idx} className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              step > idx + 1 ? "bg-green-500 text-white" :
              step === idx + 1 ? "bg-indigo-600 text-white" :
              "bg-gray-200 text-gray-500"
            )}>
              {step > idx + 1 ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
            </div>
            <span className={cn(
              "ml-2 text-sm",
              step === idx + 1 ? "font-medium text-gray-900" : "text-gray-500"
            )}>{label}</span>
            {idx < 2 && <div className="w-24 h-0.5 bg-gray-200 mx-4" />}
          </div>
        ))}
      </div>

      {/* Resumo da Unidade */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">
              {development?.name} - Unidade {unit?.unit}
            </h3>
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              Torre {unit?.tower} • {unit?.floor}º andar • {unit?.typology} • {unit?.area}m²
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
              R$ {unit?.price?.toLocaleString()}
            </p>
            <p className="text-sm text-indigo-600">Sinal: R$ 5.000,00</p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Dados do Cliente Comprador</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="João da Silva"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
              <input 
                type="email" 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="joao@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
              <input 
                type="tel" 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button 
              onClick={() => setStep(2)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Confirmar Reserva</h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium mb-2">Condições da Reserva</h4>
              <ul className="text-sm space-y-2 text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Valor do sinal: R$ 5.000,00
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Prazo para formalização: 7 dias úteis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Documentação necessária será enviada por e-mail
                </li>
                <li className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  Reserva expira se o sinal não for pago em 48h
                </li>
              </ul>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Li e concordo com os termos de reserva</span>
            </label>
          </div>
          <div className="mt-6 flex justify-between">
            <button 
              onClick={() => setStep(1)}
              className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Voltar
            </button>
            <button 
              onClick={() => setStep(3)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Confirmar e Gerar Boleto
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Reserva Criada com Sucesso!</h3>
          <p className="text-gray-500 mb-6">
            O boleto do sinal foi enviado para o e-mail do cliente.
            <br />
            Prazo de pagamento: 48 horas
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">Código da Reserva</p>
            <p className="text-2xl font-mono font-bold">RES-2026-0001</p>
          </div>
          <div className="flex gap-4 justify-center">
            <button className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              Copiar Link do Boleto
            </button>
            <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Ver Dashboard de Reservas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// PARCERIAS VIEW
// ============================================

function ParceriasView() {
  const [activeTab, setActiveTab] = useState<'todas' | 'construtoras' | 'imobiliarias' | 'corretores'>('todas');
  const [showNewPartnership, setShowNewPartnership] = useState(false);

  // Mock de parcerias expandido
  const parcerias = [
    { 
      id: 1,
      name: 'Construtora Aurora', 
      type: 'construtora' as const, 
      status: 'active', 
      commission: '6%', 
      sales: 12,
      logo: 'https://ui-avatars.com/api/?name=CA&background=4f46e5&color=fff',
      since: 'Mar/2025',
      modelo: 'Exclusivo por empreendimento'
    },
    { 
      id: 2,
      name: 'Cyrela Brazil Realty', 
      type: 'construtora' as const, 
      status: 'active', 
      commission: '5.5%', 
      sales: 8,
      logo: 'https://ui-avatars.com/api/?name=CY&background=1e40af&color=fff',
      since: 'Jan/2025',
      modelo: 'Aberto - múltiplas imobiliárias'
    },
    { 
      id: 3,
      name: 'Imobiliária Premium', 
      type: 'imobiliaria' as const, 
      status: 'active', 
      commission: '50/50', 
      sales: 5,
      logo: 'https://ui-avatars.com/api/?name=IP&background=7c3aed&color=fff',
      since: 'Nov/2025',
      modelo: 'Divisão igualitária'
    },
    { 
      id: 4,
      name: 'Imobiliária ABC', 
      type: 'imobiliaria' as const, 
      status: 'pending', 
      commission: '60/40', 
      sales: 0,
      logo: 'https://ui-avatars.com/api/?name=ABC&background=8b5cf6&color=fff',
      since: 'Pendente',
      modelo: 'Quem indica o cliente leva 60%'
    },
    { 
      id: 5,
      name: 'João Ricardo Silva', 
      type: 'corretor' as const, 
      status: 'active', 
      commission: '50/50', 
      sales: 3,
      logo: 'https://ui-avatars.com/api/?name=JR&background=0ea5e9&color=fff',
      since: 'Dez/2025',
      modelo: 'Parceria pontual',
      creci: 'CRECI-F 123456'
    },
    { 
      id: 6,
      name: 'Maria Fernanda Costa', 
      type: 'corretor' as const, 
      status: 'active', 
      commission: '40/60', 
      sales: 2,
      logo: 'https://ui-avatars.com/api/?name=MF&background=14b8a6&color=fff',
      since: 'Jan/2026',
      modelo: 'Ela trouxe o cliente (60%)',
      creci: 'CRECI-F 234567'
    },
    { 
      id: 7,
      name: 'Carlos Eduardo Santos', 
      type: 'corretor' as const, 
      status: 'pending', 
      commission: '50/50', 
      sales: 0,
      logo: 'https://ui-avatars.com/api/?name=CE&background=f59e0b&color=fff',
      since: 'Pendente',
      modelo: 'Parceria em análise',
      creci: 'CRECI-F 345678'
    },
  ];

  const filteredParcerias = activeTab === 'todas' 
    ? parcerias 
    : parcerias.filter(p => p.type === activeTab.slice(0, -1) || p.type === activeTab.slice(0, -2));

  const getFilteredParcerias = () => {
    if (activeTab === 'todas') return parcerias;
    if (activeTab === 'construtoras') return parcerias.filter(p => p.type === 'construtora');
    if (activeTab === 'imobiliarias') return parcerias.filter(p => p.type === 'imobiliaria');
    if (activeTab === 'corretores') return parcerias.filter(p => p.type === 'corretor');
    return parcerias;
  };

  const stats = {
    construtoras: parcerias.filter(p => p.type === 'construtora' && p.status === 'active').length,
    imobiliarias: parcerias.filter(p => p.type === 'imobiliaria' && p.status === 'active').length,
    corretores: parcerias.filter(p => p.type === 'corretor' && p.status === 'active').length,
    pendentes: parcerias.filter(p => p.status === 'pending').length,
    totalVendas: parcerias.reduce((acc, p) => acc + p.sales, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Minhas Parcerias</h2>
          <p className="text-gray-500">Gerencie suas conexões com construtoras, imobiliárias e corretores</p>
        </div>
        <button 
          onClick={() => setShowNewPartnership(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 inline mr-2" />
          Nova Parceria
        </button>
      </div>

      {/* Stats - Expandido */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-indigo-500" />
            <p className="text-sm text-gray-500">Construtoras</p>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{stats.construtoras}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Home className="h-4 w-4 text-purple-500" />
            <p className="text-sm text-gray-500">Imobiliárias</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats.imobiliarias}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-sky-500" />
            <p className="text-sm text-gray-500">Corretores</p>
          </div>
          <p className="text-2xl font-bold text-sky-600">{stats.corretores}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="h-4 w-4 text-yellow-500" />
            <p className="text-sm text-gray-500">Pendentes</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-green-500" />
            <p className="text-sm text-gray-500">Vendas Conjuntas</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.totalVendas}</p>
        </div>
      </div>

      {/* Tabs de Filtro */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'todas', label: 'Todas', icon: Users, color: 'gray' },
          { key: 'construtoras', label: 'Construtoras', icon: Building2, color: 'indigo' },
          { key: 'imobiliarias', label: 'Imobiliárias', icon: Home, color: 'purple' },
          { key: 'corretores', label: 'Corretores', icon: User, color: 'sky' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
              activeTab === tab.key
                ? tab.color === 'indigo' ? "bg-indigo-600 text-white"
                : tab.color === 'purple' ? "bg-purple-600 text-white"
                : tab.color === 'sky' ? "bg-sky-600 text-white"
                : "bg-gray-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Info Box - Tipos de Parceria */}
      <div className="bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-sky-200 dark:border-sky-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Handshake className="h-5 w-5 text-sky-600" />
          Modelos de Parceria na Plataforma
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <p className="font-medium text-indigo-600 mb-1">🏗️ Com Construtoras</p>
            <p className="text-gray-600 dark:text-gray-400">Comissão fixa por empreendimento (5-7%)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <p className="font-medium text-purple-600 mb-1">🏠 Com Imobiliárias</p>
            <p className="text-gray-600 dark:text-gray-400">Divisão de comissão (50/50, 60/40, etc)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <p className="font-medium text-sky-600 mb-1">👤 Com Corretores</p>
            <p className="text-gray-600 dark:text-gray-400">Parceria pontual ou fixa entre profissionais</p>
          </div>
        </div>
      </div>

      {/* Lista de Parcerias */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-semibold">
            {activeTab === 'todas' ? 'Todas as Parcerias' : 
             activeTab === 'construtoras' ? 'Parcerias com Construtoras' :
             activeTab === 'imobiliarias' ? 'Parcerias com Imobiliárias' :
             'Parcerias com Corretores'}
          </h3>
          <span className="text-sm text-gray-500">{getFilteredParcerias().length} parceria(s)</span>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {getFilteredParcerias().map((p) => (
            <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-center gap-4">
                <img 
                  src={p.logo} 
                  alt={p.name}
                  className={cn(
                    "w-12 h-12 object-cover",
                    p.type === 'corretor' ? "rounded-full" : "rounded-xl"
                  )}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                    {p.type === 'corretor' && (
                      <span className="text-xs text-sky-600 font-medium">{(p as any).creci}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      p.type === 'construtora' ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" :
                      p.type === 'imobiliaria' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                      "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                    )}>
                      {p.type === 'construtora' ? '🏗️ Construtora' : 
                       p.type === 'imobiliaria' ? '🏠 Imobiliária' : '👤 Corretor'}
                    </span>
                    <span>•</span>
                    <span>Desde {p.since}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{p.modelo}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{p.commission}</p>
                  <p className="text-xs text-gray-500">comissão</p>
                </div>
                {p.sales > 0 && (
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{p.sales}</p>
                    <p className="text-xs text-gray-500">vendas</p>
                  </div>
                )}
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium",
                  p.status === 'active' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                )}>
                  {p.status === 'active' ? '✅ Ativa' : '⏳ Pendente'}
                </span>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Nova Parceria */}
      {showNewPartnership && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nova Parceria</h3>
              <button 
                onClick={() => setShowNewPartnership(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <p className="text-gray-600 dark:text-gray-400">Escolha o tipo de parceria que deseja estabelecer:</p>
              
              {/* Opções de Parceria */}
              <div className="space-y-4">
                <button className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center group-hover:bg-indigo-200">
                      <Building2 className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Parceria com Construtora</p>
                      <p className="text-sm text-gray-500">Vender empreendimentos de construtoras parceiras</p>
                    </div>
                  </div>
                </button>

                <button className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left group">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:bg-purple-200">
                      <Home className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Parceria com Imobiliária</p>
                      <p className="text-sm text-gray-500">Dividir comissões em vendas conjuntas</p>
                    </div>
                  </div>
                </button>

                <button className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all text-left group">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center group-hover:bg-sky-200">
                      <User className="h-6 w-6 text-sky-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Parceria com Corretor</p>
                      <p className="text-sm text-gray-500">Colaborar com outro corretor em negociações</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Explicação */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">💡 Como funciona?</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• <strong>Corretor + Corretor:</strong> Um tem o imóvel, outro tem o cliente</li>
                  <li>• <strong>Corretor + Imobiliária:</strong> Acesso a carteira ou estrutura maior</li>
                  <li>• <strong>Imobiliária + Imobiliária:</strong> Ampliar alcance de mercado</li>
                  <li>• Todos os modelos com contrato digital e divisão transparente</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CONTRATOS VIEW
// ============================================

function ContratosView() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Contratos Digitais</h2>
          <p className="text-gray-500">Contratos com assinatura eletrônica e validade jurídica</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Contratos Assinados</p>
          <p className="text-2xl font-bold text-green-600">24</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Aguardando Assinatura</p>
          <p className="text-2xl font-bold text-yellow-600">5</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Expirados</p>
          <p className="text-2xl font-bold text-gray-400">2</p>
        </div>
      </div>

      {/* Lista de Contratos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold">Contratos Recentes</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {[
            { id: 'CTR-001', title: 'Contrato de Parceria - Construtora Aurora', date: '28/01/2026', status: 'signed' },
            { id: 'CTR-002', title: 'Acordo de Intermediação - Imobiliária ABC', date: '25/01/2026', status: 'pending' },
            { id: 'CTR-003', title: 'Termo de Comissionamento - Cyrela', date: '20/01/2026', status: 'signed' },
          ].map((c, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileSignature className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-sm text-gray-500">{c.id} • {c.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  c.status === 'signed' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                )}>
                  {c.status === 'signed' ? '✅ Assinado' : '✍️ Aguardando'}
                </span>
                <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                  Ver Contrato
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <Shield className="h-10 w-10 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Validade Jurídica Garantida</h3>
            <p className="text-sm opacity-90">
              Todos os contratos são assinados eletronicamente com certificação ICP-Brasil, 
              garantindo validade jurídica conforme MP 2.200-2/2001 e Lei 14.063/2020.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DEMANDAS VIEW - MATCH REVERSO / BUSCA PUBLICADA
// ============================================

// Dados mock de demandas
const MOCK_DEMANDAS = [
  {
    id: 'DEM-001',
    titulo: 'Cliente busca 3 quartos na Barra da Tijuca',
    corretor: {
      nome: 'Carlos Mendes',
      imobiliaria: 'Lopes Consultoria',
      avatar: 'https://ui-avatars.com/api/?name=CM&background=6366f1&color=fff',
      rating: 4.8,
    },
    perfilCliente: 'Família com 2 filhos, primeira moradia',
    orcamento: { min: 800000, max: 1200000 },
    criterios: {
      regiao: 'Barra da Tijuca, RJ',
      tipologia: '3 quartos (1 suíte)',
      areaMin: 90,
      areaMax: 130,
      caracteristicas: ['Sol da manhã', 'Vaga para carro elétrico', '2 vagas', 'Varanda gourmet', 'Lazer completo'],
      entrega: 'Até 2027',
    },
    prazo: '2026-02-10',
    status: 'active',
    propostas: 8,
    visualizacoes: 156,
    createdAt: '2026-01-28',
  },
  {
    id: 'DEM-002',
    titulo: 'Investidor busca studios para renda',
    corretor: {
      nome: 'Ana Paula Silva',
      imobiliaria: 'Coelho da Fonseca',
      avatar: 'https://ui-avatars.com/api/?name=APS&background=10b981&color=fff',
      rating: 4.9,
    },
    perfilCliente: 'Investidor, busca rentabilidade',
    orcamento: { min: 250000, max: 400000 },
    criterios: {
      regiao: 'Vila Mariana, SP ou Pinheiros, SP',
      tipologia: 'Studio ou 1 quarto',
      areaMin: 25,
      areaMax: 45,
      caracteristicas: ['Próximo metrô', 'Alto potencial de locação', 'Condomínio baixo'],
      entrega: 'Pronto ou até 2026',
    },
    prazo: '2026-02-05',
    status: 'active',
    propostas: 12,
    visualizacoes: 234,
    createdAt: '2026-01-25',
  },
  {
    id: 'DEM-003',
    titulo: 'Aposentado busca térreo/garden em condomínio',
    corretor: {
      nome: 'Roberto Almeida',
      imobiliaria: 'Imobiliária ABC',
      avatar: 'https://ui-avatars.com/api/?name=RA&background=f59e0b&color=fff',
      rating: 4.5,
    },
    perfilCliente: 'Casal aposentado, downsizing',
    orcamento: { min: 500000, max: 700000 },
    criterios: {
      regiao: 'Santo André, SP ou São Bernardo, SP',
      tipologia: '2 quartos',
      areaMin: 60,
      areaMax: 90,
      caracteristicas: ['Térreo ou garden', 'Pet friendly', 'Acessibilidade', 'Área verde'],
      entrega: 'Pronto',
    },
    prazo: '2026-02-15',
    status: 'active',
    propostas: 5,
    visualizacoes: 89,
    createdAt: '2026-01-30',
  },
  {
    id: 'DEM-004',
    titulo: 'Jovem casal MCMV - primeiro imóvel',
    corretor: {
      nome: 'Fernanda Costa',
      imobiliaria: 'Lopes Consultoria',
      avatar: 'https://ui-avatars.com/api/?name=FC&background=ec4899&color=fff',
      rating: 4.7,
    },
    perfilCliente: 'Casal jovem, renda familiar R$ 6.500',
    orcamento: { min: 180000, max: 264000 },
    criterios: {
      regiao: 'Grande São Paulo',
      tipologia: '2 quartos',
      areaMin: 40,
      areaMax: 55,
      caracteristicas: ['MCMV', 'Aceita FGTS', 'Próximo transporte público', 'Lazer'],
      entrega: 'Até 2028',
    },
    prazo: '2026-02-20',
    status: 'active',
    propostas: 15,
    visualizacoes: 312,
    createdAt: '2026-01-31',
  },
  {
    id: 'DEM-005',
    titulo: 'Alto padrão Jardins - vista definitiva',
    corretor: {
      nome: 'Ricardo Gomes',
      imobiliaria: 'Coelho da Fonseca',
      avatar: 'https://ui-avatars.com/api/?name=RG&background=8b5cf6&color=fff',
      rating: 5.0,
    },
    perfilCliente: 'Empresário, upgrade de moradia',
    orcamento: { min: 3000000, max: 5000000 },
    criterios: {
      regiao: 'Jardins, SP',
      tipologia: '4 suítes ou cobertura',
      areaMin: 200,
      areaMax: 400,
      caracteristicas: ['Andar alto', 'Vista definitiva', '4+ vagas', 'Lazer premium', 'Segurança 24h'],
      entrega: 'Pronto ou até 2026',
    },
    prazo: '2026-02-08',
    status: 'closed',
    propostas: 6,
    visualizacoes: 178,
    createdAt: '2026-01-20',
  },
];

function DemandasView({ onCriarDemanda, onVerDemanda }: { 
  onCriarDemanda: () => void;
  onVerDemanda: (demanda: any) => void;
}) {
  const [filtroStatus, setFiltroStatus] = useState<'all' | 'active' | 'closed'>('all');
  const [userType, setUserType] = useState<'corretor' | 'construtora'>('corretor');

  const demandasFiltradas = MOCK_DEMANDAS.filter(d => 
    filtroStatus === 'all' || d.status === filtroStatus
  );

  return (
    <div className="space-y-6">
      {/* Header com Explicação */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Megaphone className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">📢 Demandas Publicadas - Match Reverso</h2>
            <p className="text-white/90 text-sm">
              Corretores publicam demandas de seus clientes compradores, e construtoras parceiras 
              respondem com unidades que atendem aos critérios. É a forma mais eficiente de conectar 
              compradores qualificados com os melhores empreendimentos!
            </p>
          </div>
        </div>
      </div>

      {/* Toggle Corretor/Construtora */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setUserType('corretor')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              userType === 'corretor' 
                ? "bg-white dark:bg-gray-800 shadow text-orange-600" 
                : "text-gray-600 dark:text-gray-400"
            )}
          >
            👔 Sou Corretor
          </button>
          <button
            onClick={() => setUserType('construtora')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              userType === 'construtora' 
                ? "bg-white dark:bg-gray-800 shadow text-orange-600" 
                : "text-gray-600 dark:text-gray-400"
            )}
          >
            🏗️ Sou Construtora
          </button>
        </div>

        {userType === 'corretor' && (
          <button
            onClick={onCriarDemanda}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 shadow-lg shadow-orange-500/30 transition-all"
          >
            <Plus className="h-5 w-5" />
            Publicar Nova Demanda
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Megaphone className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Demandas Ativas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">127</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Send className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Propostas Enviadas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">456</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Trophy className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Matches Fechados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">89</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Volume Demandado</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">R$ 87M</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por região, tipologia, características..."
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFiltroStatus('all')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filtroStatus === 'all' ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            )}
          >
            Todas
          </button>
          <button
            onClick={() => setFiltroStatus('active')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filtroStatus === 'active' ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            )}
          >
            🟢 Ativas
          </button>
          <button
            onClick={() => setFiltroStatus('closed')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filtroStatus === 'closed' ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            )}
          >
            ⚫ Encerradas
          </button>
        </div>
      </div>

      {/* Lista de Demandas */}
      <div className="space-y-4">
        {demandasFiltradas.map((demanda) => (
          <DemandaCard 
            key={demanda.id} 
            demanda={demanda} 
            userType={userType}
            onVerDetalhes={() => onVerDemanda(demanda)}
          />
        ))}
      </div>
    </div>
  );
}

function DemandaCard({ demanda, userType, onVerDetalhes }: { 
  demanda: any; 
  userType: 'corretor' | 'construtora';
  onVerDetalhes: () => void;
}) {
  const diasRestantes = Math.ceil((new Date(demanda.prazo).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const urgente = diasRestantes <= 3;

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-xl border overflow-hidden hover:shadow-lg transition-shadow",
      demanda.status === 'active' 
        ? "border-gray-200 dark:border-gray-700" 
        : "border-gray-200 dark:border-gray-700 opacity-70"
    )}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <img 
              src={demanda.corretor.avatar} 
              alt={demanda.corretor.nome}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {demanda.titulo}
              </h3>
              <p className="text-sm text-gray-500">
                {demanda.corretor.nome} • {demanda.corretor.imobiliaria}
                <span className="ml-2">
                  <Star className="h-3 w-3 text-yellow-400 inline fill-yellow-400" />
                  {demanda.corretor.rating}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {demanda.status === 'active' ? (
              <>
                {urgente && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium animate-pulse">
                    🔥 Urgente
                  </span>
                )}
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  🟢 Ativa
                </span>
              </>
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                ⚫ Encerrada
              </span>
            )}
          </div>
        </div>

        {/* Info do Cliente */}
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
          <User className="h-4 w-4" />
          <span>{demanda.perfilCliente}</span>
        </div>

        {/* Orçamento */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-700 dark:text-green-400">
              R$ {(demanda.orcamento.min / 1000).toFixed(0)}mil - R$ {demanda.orcamento.max >= 1000000 ? `${(demanda.orcamento.max / 1000000).toFixed(1)}M` : `${(demanda.orcamento.max / 1000).toFixed(0)}mil`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            {demanda.criterios.regiao}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Building className="h-4 w-4" />
            {demanda.criterios.tipologia}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            📐 {demanda.criterios.areaMin}-{demanda.criterios.areaMax}m²
          </div>
        </div>

        {/* Características */}
        <div className="flex flex-wrap gap-2 mb-4">
          {demanda.criterios.caracteristicas.map((car: string) => (
            <span 
              key={car} 
              className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                car.includes('Sol') ? "bg-yellow-100 text-yellow-800" :
                car.includes('elétrico') ? "bg-green-100 text-green-800" :
                car.includes('MCMV') || car.includes('FGTS') ? "bg-blue-100 text-blue-800" :
                "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              )}
            >
              {car}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Timer className="h-4 w-4" />
              {demanda.status === 'active' ? `${diasRestantes} dias restantes` : 'Encerrada'}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {demanda.visualizacoes} visualizações
            </span>
            <span className="flex items-center gap-1">
              <Send className="h-4 w-4" />
              {demanda.propostas} propostas
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onVerDetalhes}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            >
              Ver Detalhes
            </button>
            {userType === 'construtora' && demanda.status === 'active' && (
              <button className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 flex items-center gap-2">
                <Send className="h-4 w-4" />
                Enviar Proposta
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CRIAR DEMANDA VIEW
// ============================================

function CriarDemandaView({ onPublicar, onCancelar }: {
  onPublicar: () => void;
  onCancelar: () => void;
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    titulo: '',
    perfilCliente: '',
    orcamentoMin: '',
    orcamentoMax: '',
    regiao: '',
    tipologia: '',
    areaMin: '',
    areaMax: '',
    caracteristicas: [] as string[],
    entrega: '',
    prazo: '',
    observacoes: '',
  });

  const caracteristicasDisponiveis = [
    { value: 'sol-manha', label: '☀️ Sol da manhã' },
    { value: 'sol-tarde', label: '🌤️ Sol da tarde' },
    { value: 'vaga-ev', label: '⚡ Vaga carro elétrico' },
    { value: '2-vagas', label: '🚗 2 vagas' },
    { value: '3-vagas', label: '🚗 3+ vagas' },
    { value: 'varanda', label: '🌅 Varanda' },
    { value: 'varanda-gourmet', label: '🍖 Varanda gourmet' },
    { value: 'andar-alto', label: '🏙️ Andar alto' },
    { value: 'andar-baixo', label: '🏢 Andar baixo' },
    { value: 'terreo', label: '🏠 Térreo/Garden' },
    { value: 'vista-mar', label: '🌊 Vista mar' },
    { value: 'vista-verde', label: '🌳 Vista verde' },
    { value: 'lazer-completo', label: '🏊 Lazer completo' },
    { value: 'pet-friendly', label: '🐕 Pet friendly' },
    { value: 'proximo-metro', label: '🚇 Próximo metrô' },
    { value: 'mcmv', label: '🏠 MCMV' },
    { value: 'fgts', label: '💰 Aceita FGTS' },
    { value: 'permuta', label: '🔁 Aceita permuta' },
  ];

  const toggleCaracteristica = (value: string) => {
    setFormData(prev => ({
      ...prev,
      caracteristicas: prev.caracteristicas.includes(value)
        ? prev.caracteristicas.filter(c => c !== value)
        : [...prev.caracteristicas, value]
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {['Perfil do Cliente', 'Critérios de Busca', 'Características', 'Revisão'].map((label, idx) => (
          <div key={idx} className="flex items-center">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
              step > idx + 1 ? "bg-green-500 text-white" :
              step === idx + 1 ? "bg-orange-600 text-white" :
              "bg-gray-200 text-gray-500 dark:bg-gray-700"
            )}>
              {step > idx + 1 ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
            </div>
            <span className={cn(
              "ml-2 text-sm hidden sm:block",
              step === idx + 1 ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500"
            )}>{label}</span>
            {idx < 3 && <div className="w-12 sm:w-24 h-0.5 bg-gray-200 dark:bg-gray-700 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Perfil do Cliente */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-orange-600" />
            Perfil do Cliente Comprador
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Título da Demanda *
              </label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Cliente busca 3 quartos na Barra da Tijuca"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Perfil do Cliente *
              </label>
              <select
                value={formData.perfilCliente}
                onChange={(e) => setFormData(prev => ({ ...prev, perfilCliente: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">Selecione o perfil...</option>
                <option value="primeira-moradia">🏠 Primeira moradia</option>
                <option value="familia">👨‍👩‍👧‍👦 Família (upgrade)</option>
                <option value="investidor">📈 Investidor (renda)</option>
                <option value="investidor-revenda">💰 Investidor (revenda)</option>
                <option value="aposentado">🧓 Aposentado (downsizing)</option>
                <option value="jovem-casal">💑 Jovem casal</option>
                <option value="solteiro">🧑 Solteiro(a)</option>
                <option value="empresario">💼 Empresário</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Orçamento Mínimo *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    value={formData.orcamentoMin}
                    onChange={(e) => setFormData(prev => ({ ...prev, orcamentoMin: e.target.value }))}
                    placeholder="200.000"
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Orçamento Máximo *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    value={formData.orcamentoMax}
                    onChange={(e) => setFormData(prev => ({ ...prev, orcamentoMax: e.target.value }))}
                    placeholder="350.000"
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-medium"
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Critérios de Busca */}
      {step === 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-600" />
            Critérios de Busca
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Região Desejada *
              </label>
              <input
                type="text"
                value={formData.regiao}
                onChange={(e) => setFormData(prev => ({ ...prev, regiao: e.target.value }))}
                placeholder="Ex: Barra da Tijuca, RJ ou Zona Sul de São Paulo"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipologia *
                </label>
                <select
                  value={formData.tipologia}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipologia: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Selecione...</option>
                  <option value="studio">Studio</option>
                  <option value="1-quarto">1 Quarto</option>
                  <option value="2-quartos">2 Quartos</option>
                  <option value="3-quartos">3 Quartos</option>
                  <option value="3-suites">3 Suítes</option>
                  <option value="4-quartos">4+ Quartos</option>
                  <option value="cobertura">Cobertura</option>
                  <option value="garden">Garden</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Previsão de Entrega
                </label>
                <select
                  value={formData.entrega}
                  onChange={(e) => setFormData(prev => ({ ...prev, entrega: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Qualquer</option>
                  <option value="pronto">Pronto para morar</option>
                  <option value="2026">Até 2026</option>
                  <option value="2027">Até 2027</option>
                  <option value="2028">Até 2028</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Área Mínima (m²)
                </label>
                <input
                  type="number"
                  value={formData.areaMin}
                  onChange={(e) => setFormData(prev => ({ ...prev, areaMin: e.target.value }))}
                  placeholder="60"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Área Máxima (m²)
                </label>
                <input
                  type="number"
                  value={formData.areaMax}
                  onChange={(e) => setFormData(prev => ({ ...prev, areaMax: e.target.value }))}
                  placeholder="100"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 text-gray-600 hover:text-gray-800"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-medium"
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Características */}
      {step === 3 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            Características Importantes
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Selecione as características que são importantes para o seu cliente:
          </p>
          <div className="flex flex-wrap gap-3">
            {caracteristicasDisponiveis.map((car) => (
              <button
                key={car.value}
                onClick={() => toggleCaracteristica(car.value)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  formData.caracteristicas.includes(car.value)
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-500/30"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                )}
              >
                {car.label}
              </button>
            ))}
          </div>
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Observações Adicionais
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Informações adicionais que podem ajudar as construtoras a entenderem melhor a demanda..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prazo para Receber Propostas *
            </label>
            <input
              type="date"
              value={formData.prazo}
              onChange={(e) => setFormData(prev => ({ ...prev, prazo: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 text-gray-600 hover:text-gray-800"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-medium"
            >
              Revisar
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Revisão */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Revisão da Demanda
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <h4 className="font-semibold text-orange-800 dark:text-orange-200">{formData.titulo || 'Título não informado'}</h4>
                <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                  Perfil: {formData.perfilCliente || 'Não informado'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Orçamento</p>
                  <p className="text-lg font-bold text-green-800 dark:text-green-200">
                    R$ {formData.orcamentoMin || '0'} - R$ {formData.orcamentoMax || '0'}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Região</p>
                  <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                    {formData.regiao || 'Não informada'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.caracteristicas.map((car) => {
                  const label = caracteristicasDisponiveis.find(c => c.value === car)?.label || car;
                  return (
                    <span key={car} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-6 text-white">
            <div className="flex items-start gap-4">
              <Megaphone className="h-8 w-8 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-2">Ao publicar esta demanda:</h4>
                <ul className="text-sm space-y-1 text-white/90">
                  <li>✅ Todas as construtoras parceiras serão notificadas</li>
                  <li>✅ Construtoras poderão enviar propostas com unidades que atendem</li>
                  <li>✅ Você receberá notificação a cada nova proposta</li>
                  <li>✅ Prazo para propostas: {formData.prazo || 'Não definido'}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-3 text-gray-600 hover:text-gray-800"
            >
              Voltar
            </button>
            <div className="flex gap-3">
              <button
                onClick={onCancelar}
                className="px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={onPublicar}
                className="px-8 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-medium flex items-center gap-2 shadow-lg shadow-orange-500/30"
              >
                <Send className="h-5 w-5" />
                Publicar Demanda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// DEMANDA DETALHES VIEW
// ============================================

function DemandaDetalhesView({ demanda, onVoltar }: {
  demanda: any;
  onVoltar: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'detalhes' | 'propostas'>('detalhes');

  // Mock de propostas recebidas
  const propostas = [
    {
      id: 'PROP-001',
      construtora: { nome: 'Construtora Aurora', logo: 'https://ui-avatars.com/api/?name=CA&background=6366f1&color=fff' },
      empreendimento: 'Residencial Aurora Park',
      unidade: 'Apto 1201 - Torre A',
      tipologia: '3 quartos (1 suíte)',
      area: 95,
      preco: 950000,
      condicoes: 'Entrada 20% + financiamento',
      diferenciais: ['Sol da manhã', 'Vista livre', 'Vaga EV disponível'],
      status: 'pending',
      enviadoEm: '2026-01-29',
    },
    {
      id: 'PROP-002',
      construtora: { nome: 'Cyrela Brazil Realty', logo: 'https://ui-avatars.com/api/?name=CBR&background=f59e0b&color=fff' },
      empreendimento: 'Edifício Solaris',
      unidade: 'Apto 801 - Torre Única',
      tipologia: '3 quartos',
      area: 88,
      preco: 890000,
      condicoes: 'Entrada 15% + saldo em 36x',
      diferenciais: ['Pronto para morar', 'Lazer completo', '2 vagas'],
      status: 'pending',
      enviadoEm: '2026-01-30',
    },
    {
      id: 'PROP-003',
      construtora: { nome: 'MRV Engenharia', logo: 'https://ui-avatars.com/api/?name=MRV&background=10b981&color=fff' },
      empreendimento: 'Parque das Flores Premium',
      unidade: 'Apto 502 - Torre B',
      tipologia: '3 quartos',
      area: 82,
      preco: 820000,
      condicoes: 'Aceita FGTS + financiamento',
      diferenciais: ['Melhor preço', 'Entrega 2027', 'Churrasqueira'],
      status: 'pending',
      enviadoEm: '2026-01-31',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <button
        onClick={onVoltar}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        Voltar para Demandas
      </button>

      {/* Header da Demanda */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <img 
              src={demanda.corretor.avatar} 
              alt={demanda.corretor.nome}
              className="w-16 h-16 rounded-full"
            />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{demanda.titulo}</h2>
              <p className="text-gray-500 mt-1">
                Publicada por {demanda.corretor.nome} • {demanda.corretor.imobiliaria}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium",
                  demanda.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                )}>
                  {demanda.status === 'active' ? '🟢 Ativa' : '⚫ Encerrada'}
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Prazo: {new Date(demanda.prazo).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">{demanda.propostas}</p>
              <p className="text-sm text-gray-500">propostas</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
          <button
            onClick={() => setActiveTab('detalhes')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'detalhes' ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-700"
            )}
          >
            📋 Detalhes da Demanda
          </button>
          <button
            onClick={() => setActiveTab('propostas')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
              activeTab === 'propostas' ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-700"
            )}
          >
            📨 Propostas Recebidas
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              activeTab === 'propostas' ? "bg-white text-orange-600" : "bg-orange-600 text-white"
            )}>
              {propostas.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'detalhes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Critérios */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" />
              Critérios de Busca
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Região</span>
                <span className="font-medium">{demanda.criterios.regiao}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Tipologia</span>
                <span className="font-medium">{demanda.criterios.tipologia}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Área</span>
                <span className="font-medium">{demanda.criterios.areaMin} - {demanda.criterios.areaMax}m²</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Entrega</span>
                <span className="font-medium">{demanda.criterios.entrega}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Orçamento</span>
                <span className="font-medium text-green-600">
                  R$ {(demanda.orcamento.min / 1000).toFixed(0)}mil - R$ {demanda.orcamento.max >= 1000000 ? `${(demanda.orcamento.max / 1000000).toFixed(1)}M` : `${(demanda.orcamento.max / 1000).toFixed(0)}mil`}
                </span>
              </div>
            </div>
          </div>

          {/* Características */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              Características Desejadas
            </h3>
            <div className="flex flex-wrap gap-2">
              {demanda.criterios.caracteristicas.map((car: string) => (
                <span 
                  key={car}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium",
                    car.includes('Sol') ? "bg-yellow-100 text-yellow-800" :
                    car.includes('elétrico') ? "bg-green-100 text-green-800" :
                    "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  )}
                >
                  {car}
                </span>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Perfil do Cliente
              </h4>
              <p className="text-gray-600 dark:text-gray-400">{demanda.perfilCliente}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'propostas' && (
        <div className="space-y-4">
          {propostas.map((proposta) => (
            <div key={proposta.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <img 
                      src={proposta.construtora.logo} 
                      alt={proposta.construtora.nome}
                      className="w-12 h-12 rounded-lg"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{proposta.empreendimento}</h4>
                      <p className="text-sm text-gray-500">{proposta.construtora.nome}</p>
                      <p className="text-sm text-gray-400 mt-1">{proposta.unidade}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      R$ {(proposta.preco / 1000).toFixed(0)}mil
                    </p>
                    <p className="text-sm text-gray-500">{proposta.area}m² • {proposta.tipologia}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {proposta.diferenciais.map((dif: string) => (
                    <span key={dif} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                      ✓ {dif}
                    </span>
                  ))}
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
                  <p className="text-sm"><strong>Condições:</strong> {proposta.condicoes}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500">
                    Enviada em {new Date(proposta.enviadoEm).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-1">
                      <ThumbsDown className="h-4 w-4" />
                      Recusar
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      Aceitar Proposta
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1">
                      <ExternalLink className="h-4 w-4" />
                      Ver Unidade
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// CADASTRO CONSTRUTORA VIEW
// ============================================

function CadastroConstrutoraView({ onConcluir, onCancelar }: {
  onConcluir: () => void;
  onCancelar: () => void;
}) {
  const [step, setStep] = useState<CadastroStep>(1);
  const [formData, setFormData] = useState({
    // Step 1 - Dados da Empresa
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    inscricaoEstadual: '',
    dataFundacao: '',
    site: '',
    // Endereço
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    // Step 2 - Contato
    emailComercial: '',
    telefoneComercial: '',
    whatsappComercial: '',
    responsavelNome: '',
    responsavelCargo: '',
    responsavelEmail: '',
    responsavelTelefone: '',
    // Step 3 - Atuação
    segmentos: [] as string[],
    regiaoAtuacao: [] as string[],
    qtdLancamentosAno: '',
    qtdUnidadesEntregues: '',
    descricao: '',
    diferenciais: '',
    // Step 4 - Parceria
    modeloComissao: '',
    percentualComissao: '',
    tempoExclusividade: '',
    requisitosMinimos: [] as string[],
    aceitaParceriaOnline: true,
    // Documentos
    logoFile: null as File | null,
    certidaoNegativaFile: null as File | null,
    contratoSocialFile: null as File | null,
  });

  const segmentosDisponiveis = [
    'MCMV', 'Econômico', 'Médio', 'Alto Padrão', 'Luxo', 'Comercial', 'Loteamentos'
  ];

  const estadosBrasil = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  const requisitosOptions = [
    'CRECI ativo',
    'Mínimo 5 corretores',
    'Mínimo 10 corretores',
    'Mínimo 20 corretores',
    'Experiência em lançamentos',
    'Estrutura própria de marketing',
    'Certificação de qualidade',
    'Seguro de responsabilidade civil',
  ];

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: string, value: string) => {
    setFormData(prev => {
      const arr = prev[field as keyof typeof prev] as string[];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(v => v !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
  };

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatCEP = (value: string) => {
    return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
  };

  const formatTelefone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.razaoSocial && formData.cnpj && formData.cidade && formData.estado;
      case 2:
        return formData.emailComercial && formData.telefoneComercial && formData.responsavelNome;
      case 3:
        return formData.segmentos.length > 0 && formData.descricao;
      case 4:
        return formData.modeloComissao;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps - Clicáveis */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div 
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => setStep(s as CadastroStep)}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all",
                  step >= s 
                    ? "bg-indigo-600 text-white" 
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500",
                  "group-hover:scale-110 group-hover:shadow-lg"
                )}>
                  {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
                </div>
                <span className={cn(
                  "text-xs mt-2 font-medium transition-colors",
                  step >= s ? "text-indigo-600" : "text-gray-400",
                  "group-hover:text-indigo-500"
                )}>
                  {s === 1 && 'Dados da Empresa'}
                  {s === 2 && 'Contato'}
                  {s === 3 && 'Atuação'}
                  {s === 4 && 'Parceria'}
                </span>
              </div>
              {s < 4 && (
                <div className={cn(
                  "flex-1 h-1 mx-4 rounded",
                  step > s ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        {/* Step 1 - Dados da Empresa */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                Dados da Empresa
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Informações básicas da construtora/incorporadora
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Razão Social *
                </label>
                <input
                  type="text"
                  value={formData.razaoSocial}
                  onChange={(e) => updateField('razaoSocial', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Razão social conforme CNPJ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={formData.nomeFantasia}
                  onChange={(e) => updateField('nomeFantasia', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Nome comercial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CNPJ *
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => updateField('cnpj', formatCNPJ(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="00.000.000/0001-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Inscrição Estadual
                </label>
                <input
                  type="text"
                  value={formData.inscricaoEstadual}
                  onChange={(e) => updateField('inscricaoEstadual', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Inscrição estadual"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data de Fundação
                </label>
                <input
                  type="date"
                  value={formData.dataFundacao}
                  onChange={(e) => updateField('dataFundacao', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Site
                </label>
                <input
                  type="url"
                  value={formData.site}
                  onChange={(e) => updateField('site', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="https://www.suaconstrutora.com.br"
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-medium flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-gray-400" />
                Endereço da Sede
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CEP *
                  </label>
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => updateField('cep', formatCEP(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="00000-000"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    value={formData.logradouro}
                    onChange={(e) => updateField('logradouro', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.numero}
                    onChange={(e) => updateField('numero', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Nº"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={formData.complemento}
                    onChange={(e) => updateField('complemento', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Sala, Andar, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={formData.bairro}
                    onChange={(e) => updateField('bairro', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Bairro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => updateField('cidade', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estado *
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => updateField('estado', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Selecione</option>
                    {estadosBrasil.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Upload Logo */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-medium mb-4">Logo da Empresa</h3>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer">
                <Image className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Arraste uma imagem ou <span className="text-indigo-600">clique para selecionar</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG até 5MB. Recomendado: 400x400px</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 - Contato */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" />
                Informações de Contato
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Dados para comunicação comercial
              </p>
            </div>

            {/* Contato Comercial */}
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-4">
                <Building className="h-4 w-4 text-gray-400" />
                Contato Comercial
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-mail Comercial *
                  </label>
                  <input
                    type="email"
                    value={formData.emailComercial}
                    onChange={(e) => updateField('emailComercial', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="comercial@empresa.com.br"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone Comercial *
                  </label>
                  <input
                    type="tel"
                    value={formData.telefoneComercial}
                    onChange={(e) => updateField('telefoneComercial', formatTelefone(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    WhatsApp Comercial
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsappComercial}
                    onChange={(e) => updateField('whatsappComercial', formatTelefone(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            {/* Responsável */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-medium flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-gray-400" />
                Responsável pelo Comercial
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.responsavelNome}
                    onChange={(e) => updateField('responsavelNome', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Nome do responsável"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cargo
                  </label>
                  <select
                    value={formData.responsavelCargo}
                    onChange={(e) => updateField('responsavelCargo', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Selecione</option>
                    <option value="Diretor Comercial">Diretor Comercial</option>
                    <option value="Gerente Comercial">Gerente Comercial</option>
                    <option value="Coordenador Comercial">Coordenador Comercial</option>
                    <option value="Analista Comercial">Analista Comercial</option>
                    <option value="Sócio/Proprietário">Sócio/Proprietário</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-mail do Responsável
                  </label>
                  <input
                    type="email"
                    value={formData.responsavelEmail}
                    onChange={(e) => updateField('responsavelEmail', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="responsavel@empresa.com.br"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone do Responsável
                  </label>
                  <input
                    type="tel"
                    value={formData.responsavelTelefone}
                    onChange={(e) => updateField('responsavelTelefone', formatTelefone(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Atuação */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Building className="h-5 w-5 text-indigo-600" />
                Atuação e Portfólio
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Informações sobre sua atuação no mercado
              </p>
            </div>

            {/* Segmentos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Segmentos de Atuação *
              </label>
              <div className="flex flex-wrap gap-2">
                {segmentosDisponiveis.map((seg) => (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => toggleArrayField('segmentos', seg)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                      formData.segmentos.includes(seg)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-indigo-400"
                    )}
                  >
                    {formData.segmentos.includes(seg) && <CheckCircle2 className="h-4 w-4 inline mr-1" />}
                    {seg}
                  </button>
                ))}
              </div>
            </div>

            {/* Região de Atuação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Região de Atuação
              </label>
              <div className="flex flex-wrap gap-2">
                {estadosBrasil.map((uf) => (
                  <button
                    key={uf}
                    type="button"
                    onClick={() => toggleArrayField('regiaoAtuacao', uf)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                      formData.regiaoAtuacao.includes(uf)
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-green-400"
                    )}
                  >
                    {uf}
                  </button>
                ))}
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lançamentos por Ano (média)
                </label>
                <select
                  value={formData.qtdLancamentosAno}
                  onChange={(e) => updateField('qtdLancamentosAno', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Selecione</option>
                  <option value="1-5">1 a 5 lançamentos</option>
                  <option value="6-10">6 a 10 lançamentos</option>
                  <option value="11-20">11 a 20 lançamentos</option>
                  <option value="21-50">21 a 50 lançamentos</option>
                  <option value="50+">Mais de 50 lançamentos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unidades Já Entregues (total)
                </label>
                <select
                  value={formData.qtdUnidadesEntregues}
                  onChange={(e) => updateField('qtdUnidadesEntregues', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Selecione</option>
                  <option value="0-500">Até 500 unidades</option>
                  <option value="501-2000">501 a 2.000 unidades</option>
                  <option value="2001-5000">2.001 a 5.000 unidades</option>
                  <option value="5001-10000">5.001 a 10.000 unidades</option>
                  <option value="10000+">Mais de 10.000 unidades</option>
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descrição da Empresa *
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => updateField('descricao', e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                placeholder="Descreva a história, missão e visão da sua construtora..."
              />
              <p className="text-xs text-gray-400 mt-1">{formData.descricao.length}/500 caracteres</p>
            </div>

            {/* Diferenciais */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Diferenciais Competitivos
              </label>
              <textarea
                value={formData.diferenciais}
                onChange={(e) => updateField('diferenciais', e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                placeholder="O que diferencia sua construtora das demais? (certificações, prêmios, tecnologias, etc.)"
              />
            </div>
          </div>
        )}

        {/* Step 4 - Parceria */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Handshake className="h-5 w-5 text-indigo-600" />
                Condições de Parceria
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Defina como quer trabalhar com imobiliárias parceiras
              </p>
            </div>

            {/* Modelo de Comissão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Modelo de Comissão *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['Percentual sobre VGV', 'Valor fixo por unidade', 'Negociável por empreendimento'].map((modelo) => (
                  <button
                    key={modelo}
                    type="button"
                    onClick={() => updateField('modeloComissao', modelo)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      formData.modeloComissao === modelo
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-indigo-300"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {formData.modeloComissao === modelo ? (
                        <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                      <span className="font-medium">{modelo}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {formData.modeloComissao === 'Percentual sobre VGV' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Percentual de Comissão
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="10"
                      value={formData.percentualComissao}
                      onChange={(e) => updateField('percentualComissao', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 pr-12"
                      placeholder="5"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prazo de Exclusividade (dias)
                  </label>
                  <select
                    value={formData.tempoExclusividade}
                    onChange={(e) => updateField('tempoExclusividade', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Sem exclusividade</option>
                    <option value="15">15 dias</option>
                    <option value="30">30 dias</option>
                    <option value="45">45 dias</option>
                    <option value="60">60 dias</option>
                    <option value="90">90 dias</option>
                  </select>
                </div>
              </div>
            )}

            {/* Requisitos para Parceiros */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Requisitos Mínimos para Parceiros
              </label>
              <div className="space-y-2">
                {requisitosOptions.map((req) => (
                  <label
                    key={req}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.requisitosMinimos.includes(req)}
                      onChange={() => toggleArrayField('requisitosMinimos', req)}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm">{req}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Aceita Parceria Online */}
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-indigo-900 dark:text-indigo-100">
                    Aceitar parcerias pelo marketplace
                  </p>
                  <p className="text-sm text-indigo-700 dark:text-indigo-300">
                    Imobiliárias poderão solicitar parceria diretamente pela plataforma
                  </p>
                </div>
                <div className={cn(
                  "w-14 h-8 rounded-full p-1 transition-colors",
                  formData.aceitaParceriaOnline ? "bg-indigo-600" : "bg-gray-300"
                )}>
                  <div className={cn(
                    "w-6 h-6 bg-white rounded-full transition-transform",
                    formData.aceitaParceriaOnline ? "translate-x-6" : "translate-x-0"
                  )} />
                </div>
              </label>
            </div>

            {/* Upload de Documentos */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                Documentos para Verificação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:border-indigo-500 transition-colors cursor-pointer">
                  <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium">Certidão Negativa de Débitos</p>
                  <p className="text-xs text-gray-400">PDF até 10MB</p>
                </div>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:border-indigo-500 transition-colors cursor-pointer">
                  <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium">Contrato Social</p>
                  <p className="text-xs text-gray-400">PDF até 10MB</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep((step - 1) as CadastroStep)}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Voltar
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancelar}
              className="px-6 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            {step < 4 ? (
              <button
                onClick={() => setStep((step + 1) as CadastroStep)}
                disabled={!isStepValid()}
                className={cn(
                  "px-6 py-2.5 rounded-lg font-medium transition-colors",
                  isStepValid()
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                Próximo →
              </button>
            ) : (
              <button
                onClick={onConcluir}
                disabled={!isStepValid()}
                className={cn(
                  "px-8 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2",
                  isStepValid()
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <CheckCircle2 className="h-5 w-5" />
                Concluir Cadastro
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Card */}
      {step === 4 && (
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 text-white">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Revisão do Cadastro
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="opacity-80">Empresa</p>
              <p className="font-medium">{formData.razaoSocial || '—'}</p>
            </div>
            <div>
              <p className="opacity-80">CNPJ</p>
              <p className="font-medium">{formData.cnpj || '—'}</p>
            </div>
            <div>
              <p className="opacity-80">Segmentos</p>
              <p className="font-medium">{formData.segmentos.join(', ') || '—'}</p>
            </div>
            <div>
              <p className="opacity-80">Comissão</p>
              <p className="font-medium">{formData.percentualComissao ? `${formData.percentualComissao}%` : formData.modeloComissao || '—'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CADASTRO IMOBILIÁRIA VIEW
// ============================================

function CadastroImobiliariaView({ onConcluir, onCancelar }: {
  onConcluir: () => void;
  onCancelar: () => void;
}) {
  const [step, setStep] = useState<CadastroStep>(1);
  const [formData, setFormData] = useState({
    // Step 1 - Dados da Empresa
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    creci: '',
    tipoCreci: 'J', // J = Jurídica, F = Física
    dataFundacao: '',
    site: '',
    // Endereço
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    // Step 2 - Contato e Responsável
    emailComercial: '',
    telefoneComercial: '',
    whatsappComercial: '',
    responsavelNome: '',
    responsavelCargo: '',
    responsavelCreci: '',
    responsavelEmail: '',
    responsavelTelefone: '',
    // Step 3 - Estrutura
    qtdCorretores: '',
    qtdFiliais: '',
    estruturaMarketing: false,
    segmentos: [] as string[],
    especialidades: [] as string[],
    regiaoAtuacao: [] as string[],
    descricao: '',
    diferenciais: '',
    // Step 4 - Parceria
    aceitaParceria: true,
    modeloDivisao: '50/50',
    exclusividadeCliente: '30',
    responsabilidadeAtendimento: 'quem-traz',
    responsabilidadeDocumentacao: 'parceiro-imovel',
    aceitaDemandas: true,
    // Documentos
    logoFile: null as File | null,
  });

  const segmentosDisponiveis = [
    'MCMV', 'Econômico', 'Médio', 'Alto Padrão', 'Luxo', 'Comercial', 'Loteamentos', 'Usados'
  ];

  const especialidadesDisponiveis = [
    'Lançamentos', 'Imóveis Usados', 'Alto Padrão', 'Compactos/Studios', 
    'Comercial', 'Loteamentos', 'Rural', 'Temporada', 'Locação'
  ];

  const estadosBrasil = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: string, value: string) => {
    setFormData(prev => {
      const arr = prev[field as keyof typeof prev] as string[];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(v => v !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
  };

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatCEP = (value: string) => {
    return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
  };

  const formatTelefone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.razaoSocial && formData.cnpj && formData.creci && formData.cidade && formData.estado;
      case 2:
        return formData.emailComercial && formData.telefoneComercial && formData.responsavelNome;
      case 3:
        return formData.qtdCorretores && formData.descricao;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps - Clicáveis */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div 
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => setStep(s as CadastroStep)}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all",
                  step >= s 
                    ? "bg-purple-600 text-white" 
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500",
                  "group-hover:scale-110 group-hover:shadow-lg"
                )}>
                  {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
                </div>
                <span className={cn(
                  "text-xs mt-2 font-medium transition-colors",
                  step >= s ? "text-purple-600" : "text-gray-400",
                  "group-hover:text-purple-500"
                )}>
                  {s === 1 && 'Dados da Empresa'}
                  {s === 2 && 'Contato'}
                  {s === 3 && 'Estrutura'}
                  {s === 4 && 'Parceria'}
                </span>
              </div>
              {s < 4 && (
                <div className={cn(
                  "flex-1 h-1 mx-4 rounded",
                  step > s ? "bg-purple-600" : "bg-gray-200 dark:bg-gray-700"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        {/* Step 1 - Dados da Empresa */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Home className="h-5 w-5 text-purple-600" />
                Dados da Imobiliária
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Informações básicas e documentação
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Razão Social *
                </label>
                <input
                  type="text"
                  value={formData.razaoSocial}
                  onChange={(e) => updateField('razaoSocial', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Razão social conforme CNPJ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={formData.nomeFantasia}
                  onChange={(e) => updateField('nomeFantasia', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Nome comercial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CNPJ *
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => updateField('cnpj', formatCNPJ(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="00.000.000/0001-00"
                />
              </div>

              {/* CRECI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CRECI *
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.tipoCreci}
                    onChange={(e) => updateField('tipoCreci', e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="J">CRECI-J</option>
                    <option value="F">CRECI-F</option>
                  </select>
                  <input
                    type="text"
                    value={formData.creci}
                    onChange={(e) => updateField('creci', e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="12345"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">J = Pessoa Jurídica, F = Pessoa Física</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data de Fundação
                </label>
                <input
                  type="date"
                  value={formData.dataFundacao}
                  onChange={(e) => updateField('dataFundacao', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Site
                </label>
                <input
                  type="url"
                  value={formData.site}
                  onChange={(e) => updateField('site', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="https://www.suaimobiliaria.com.br"
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-medium flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-gray-400" />
                Endereço da Sede
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CEP *
                  </label>
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => updateField('cep', formatCEP(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="00000-000"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    value={formData.logradouro}
                    onChange={(e) => updateField('logradouro', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.numero}
                    onChange={(e) => updateField('numero', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Nº"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={formData.complemento}
                    onChange={(e) => updateField('complemento', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Sala, Andar, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={formData.bairro}
                    onChange={(e) => updateField('bairro', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Bairro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => updateField('cidade', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estado *
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => updateField('estado', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Selecione</option>
                    {estadosBrasil.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Upload Logo */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-medium mb-4">Logo da Imobiliária</h3>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
                <Image className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Arraste uma imagem ou <span className="text-purple-600">clique para selecionar</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG até 5MB. Recomendado: 400x400px</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 - Contato */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600" />
                Informações de Contato
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Dados para comunicação e responsável técnico
              </p>
            </div>

            {/* Contato Comercial */}
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-4">
                <Building className="h-4 w-4 text-gray-400" />
                Contato Comercial
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-mail Comercial *
                  </label>
                  <input
                    type="email"
                    value={formData.emailComercial}
                    onChange={(e) => updateField('emailComercial', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="comercial@imobiliaria.com.br"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone Comercial *
                  </label>
                  <input
                    type="tel"
                    value={formData.telefoneComercial}
                    onChange={(e) => updateField('telefoneComercial', formatTelefone(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    WhatsApp Comercial
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsappComercial}
                    onChange={(e) => updateField('whatsappComercial', formatTelefone(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            {/* Responsável Técnico */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-medium flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-gray-400" />
                Responsável Técnico (Corretor Responsável)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.responsavelNome}
                    onChange={(e) => updateField('responsavelNome', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Nome do corretor responsável"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CRECI do Responsável
                  </label>
                  <input
                    type="text"
                    value={formData.responsavelCreci}
                    onChange={(e) => updateField('responsavelCreci', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="CRECI-F 12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-mail do Responsável
                  </label>
                  <input
                    type="email"
                    value={formData.responsavelEmail}
                    onChange={(e) => updateField('responsavelEmail', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="responsavel@imobiliaria.com.br"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone do Responsável
                  </label>
                  <input
                    type="tel"
                    value={formData.responsavelTelefone}
                    onChange={(e) => updateField('responsavelTelefone', formatTelefone(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Estrutura */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Estrutura e Atuação
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Informações sobre sua equipe e mercado de atuação
              </p>
            </div>

            {/* Estrutura */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantidade de Corretores *
                </label>
                <select
                  value={formData.qtdCorretores}
                  onChange={(e) => updateField('qtdCorretores', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Selecione</option>
                  <option value="1-5">1 a 5 corretores</option>
                  <option value="6-10">6 a 10 corretores</option>
                  <option value="11-20">11 a 20 corretores</option>
                  <option value="21-50">21 a 50 corretores</option>
                  <option value="51-100">51 a 100 corretores</option>
                  <option value="100+">Mais de 100 corretores</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Número de Filiais
                </label>
                <select
                  value={formData.qtdFiliais}
                  onChange={(e) => updateField('qtdFiliais', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Selecione</option>
                  <option value="0">Sede única</option>
                  <option value="1-3">1 a 3 filiais</option>
                  <option value="4-10">4 a 10 filiais</option>
                  <option value="10+">Mais de 10 filiais</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.estruturaMarketing}
                    onChange={(e) => updateField('estruturaMarketing', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm">Equipe de Marketing própria</span>
                </label>
              </div>
            </div>

            {/* Especialidades */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Especialidades
              </label>
              <div className="flex flex-wrap gap-2">
                {especialidadesDisponiveis.map((esp) => (
                  <button
                    key={esp}
                    type="button"
                    onClick={() => toggleArrayField('especialidades', esp)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                      formData.especialidades.includes(esp)
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-purple-400"
                    )}
                  >
                    {formData.especialidades.includes(esp) && <CheckCircle2 className="h-4 w-4 inline mr-1" />}
                    {esp}
                  </button>
                ))}
              </div>
            </div>

            {/* Segmentos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Segmentos de Interesse
              </label>
              <div className="flex flex-wrap gap-2">
                {segmentosDisponiveis.map((seg) => (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => toggleArrayField('segmentos', seg)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                      formData.segmentos.includes(seg)
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-green-400"
                    )}
                  >
                    {seg}
                  </button>
                ))}
              </div>
            </div>

            {/* Região de Atuação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Região de Atuação
              </label>
              <div className="flex flex-wrap gap-2">
                {estadosBrasil.map((uf) => (
                  <button
                    key={uf}
                    type="button"
                    onClick={() => toggleArrayField('regiaoAtuacao', uf)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                      formData.regiaoAtuacao.includes(uf)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-400"
                    )}
                  >
                    {uf}
                  </button>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descrição da Imobiliária *
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => updateField('descricao', e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                placeholder="Conte sobre a história, especialidades e diferenciais da sua imobiliária..."
              />
              <p className="text-xs text-gray-400 mt-1">{formData.descricao.length}/500 caracteres</p>
            </div>
          </div>
        )}

        {/* Step 4 - Parceria */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Handshake className="h-5 w-5 text-purple-600" />
                Configurações de Parceria
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Defina como deseja trabalhar com outras imobiliárias
              </p>
            </div>

            {/* Aceita Parceria */}
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-purple-900 dark:text-purple-100">
                    Aceitar parcerias com outras imobiliárias
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Permite que outras imobiliárias proponham parcerias de venda
                  </p>
                </div>
                <div className={cn(
                  "w-14 h-8 rounded-full p-1 transition-colors",
                  formData.aceitaParceria ? "bg-purple-600" : "bg-gray-300"
                )}>
                  <div className={cn(
                    "w-6 h-6 bg-white rounded-full transition-transform",
                    formData.aceitaParceria ? "translate-x-6" : "translate-x-0"
                  )} />
                </div>
              </label>
            </div>

            {formData.aceitaParceria && (
              <>
                {/* Modelo de Divisão */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Modelo de Divisão de Comissão Preferido
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['50/50', '60/40', '40/60', 'Negociável'].map((modelo) => (
                      <button
                        key={modelo}
                        type="button"
                        onClick={() => updateField('modeloDivisao', modelo)}
                        className={cn(
                          "p-4 rounded-xl border-2 text-center transition-all",
                          formData.modeloDivisao === modelo
                            ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                            : "border-gray-200 dark:border-gray-600 hover:border-purple-300"
                        )}
                      >
                        <div className="text-2xl font-bold text-purple-600 mb-1">
                          {modelo === 'Negociável' ? '?' : modelo.split('/')[0]}
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">{modelo}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    50/50 = divisão igual | 60/40 = você recebe 60% | 40/60 = parceiro recebe 60%
                  </p>
                </div>

                {/* Regras de Parceria */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Exclusividade do Cliente (dias)
                    </label>
                    <select
                      value={formData.exclusividadeCliente}
                      onChange={(e) => updateField('exclusividadeCliente', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="15">15 dias</option>
                      <option value="30">30 dias</option>
                      <option value="45">45 dias</option>
                      <option value="60">60 dias</option>
                      <option value="90">90 dias</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Responsabilidade pelo Atendimento
                    </label>
                    <select
                      value={formData.responsabilidadeAtendimento}
                      onChange={(e) => updateField('responsabilidadeAtendimento', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="quem-traz">Quem traz o cliente</option>
                      <option value="quem-tem-imovel">Quem tem o imóvel</option>
                      <option value="negociavel">Negociável por caso</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Aceita Demandas */}
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-orange-900 dark:text-orange-100 flex items-center gap-2">
                    <Megaphone className="h-5 w-5" />
                    Receber Demandas de Compra
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Receba alertas quando corretores publicarem demandas de clientes que combinam com seus empreendimentos
                  </p>
                </div>
                <div className={cn(
                  "w-14 h-8 rounded-full p-1 transition-colors",
                  formData.aceitaDemandas ? "bg-orange-600" : "bg-gray-300"
                )}>
                  <div className={cn(
                    "w-6 h-6 bg-white rounded-full transition-transform",
                    formData.aceitaDemandas ? "translate-x-6" : "translate-x-0"
                  )} />
                </div>
              </label>
            </div>

            {/* Termos */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 mt-0.5 text-purple-600 rounded focus:ring-purple-500"
                />
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Li e aceito os <a href="#" className="text-purple-600 underline">Termos de Uso</a> e 
                  a <a href="#" className="text-purple-600 underline">Política de Privacidade</a> da plataforma.
                  Declaro que as informações prestadas são verdadeiras.
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep((step - 1) as CadastroStep)}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Voltar
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancelar}
              className="px-6 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            {step < 4 ? (
              <button
                onClick={() => setStep((step + 1) as CadastroStep)}
                disabled={!isStepValid()}
                className={cn(
                  "px-6 py-2.5 rounded-lg font-medium transition-colors",
                  isStepValid()
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                Próximo →
              </button>
            ) : (
              <button
                onClick={onConcluir}
                className="px-8 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" />
                Concluir Cadastro
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Card */}
      {step === 4 && (
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 text-white">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Revisão do Cadastro
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="opacity-80">Empresa</p>
              <p className="font-medium">{formData.razaoSocial || '—'}</p>
            </div>
            <div>
              <p className="opacity-80">CRECI</p>
              <p className="font-medium">{formData.creci ? `CRECI-${formData.tipoCreci} ${formData.creci}` : '—'}</p>
            </div>
            <div>
              <p className="opacity-80">Corretores</p>
              <p className="font-medium">{formData.qtdCorretores || '—'}</p>
            </div>
            <div>
              <p className="opacity-80">Divisão Preferida</p>
              <p className="font-medium">{formData.modeloDivisao}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CADASTRO EMPREENDIMENTO VIEW
// ============================================

function CadastroEmpreendimentoView({ onConcluir, onCancelar }: {
  onConcluir: () => void;
  onCancelar: () => void;
}) {
  const [step, setStep] = useState<CadastroStep>(1);
  const [formData, setFormData] = useState({
    // Step 1 - Dados Básicos
    nome: '',
    construtora: '',
    fase: 'launch', // launch, construction, ready
    dataEntrega: '',
    descricao: '',
    diferenciais: '',
    // Localização
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    // Step 2 - Estrutura
    totalTorres: '',
    totalAndares: '',
    totalUnidades: '',
    tipologias: [] as string[],
    tipologiaCustom: '',
    precoMinimo: '',
    precoMaximo: '',
    areaMinima: '',
    areaMaxima: '',
    // Step 3 - Unidades (Espelho)
    blocos: [
      { nome: 'A', andares: 10, unidadesPorAndar: 4 }
    ] as { nome: string; andares: number; unidadesPorAndar: number }[],
    // Step 4 - Materiais
    bookDigital: null as File | null,
    tabelaPrecos: null as File | null,
    tabelaPromocional: null as File | null,
    fichaTecnica: null as File | null,
    plantasHumanizadas: null as File | null,
    estudoRentabilidade: null as File | null,
    custoCondominial: null as File | null,
    videoInstitucional: null as File | null,
    tourVirtualUrl: '',
    fotosObra: null as FileList | null,
    reguasWhatsapp: null as File | null,
    // Step 5 - Vendas
    comissaoBase: '',
    comissaoModelo: 'percentual', // percentual, fixo
    campanhaAtiva: false,
    campanhaNome: '',
    campanhaDesconto: '',
    campanhaValidade: '',
    imobiliariasAutorizadas: 'todas', // todas, selecionadas
    condicoesEspeciais: '',
    observacoes: '',
  });

  const tipologiasDisponiveis = [
    '1 quarto', '2 quartos', '3 quartos', '4 quartos',
    '1 suíte', '2 suítes', '3 suítes', '4 suítes',
    'Duplex', 'Triplex', 'Garden', 'Cobertura', 
    'Loft', 'Studio', 'Penthouse', 'Loja', 'Sala Comercial'
  ];

  const fasesObra = [
    { value: 'launch', label: 'Lançamento', icon: '🚀' },
    { value: 'construction', label: 'Em Construção', icon: '🏗️' },
    { value: 'ready', label: 'Pronto para Morar', icon: '🏠' },
  ];

  const construtorasMock = [
    { id: '1', nome: 'Construtora Calper' },
    { id: '2', nome: 'MRV Engenharia' },
    { id: '3', nome: 'Cyrela Brazil Realty' },
    { id: '4', nome: 'Patrimar Engenharia' },
    { id: '5', nome: 'Construtora Calçada' },
  ];

  const estadosBrasil = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: string, value: string) => {
    setFormData(prev => {
      const arr = prev[field as keyof typeof prev] as string[];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(v => v !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
  };

  const addBloco = () => {
    const nextLetter = String.fromCharCode(65 + formData.blocos.length);
    setFormData(prev => ({
      ...prev,
      blocos: [...prev.blocos, { nome: nextLetter, andares: 10, unidadesPorAndar: 4 }]
    }));
  };

  const updateBloco = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      blocos: prev.blocos.map((b, i) => i === index ? { ...b, [field]: value } : b)
    }));
  };

  const removeBloco = (index: number) => {
    if (formData.blocos.length > 1) {
      setFormData(prev => ({
        ...prev,
        blocos: prev.blocos.filter((_, i) => i !== index)
      }));
    }
  };

  const formatCEP = (value: string) => {
    return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
  };

  const formatCurrency = (value: string) => {
    const num = value.replace(/\D/g, '');
    return num ? Number(num).toLocaleString('pt-BR') : '';
  };

  const getTotalUnidadesCalculado = () => {
    return formData.blocos.reduce((total, bloco) => {
      return total + (bloco.andares * bloco.unidadesPorAndar);
    }, 0);
  };

  const stepLabels = ['Dados Básicos', 'Estrutura', 'Unidades', 'Materiais', 'Vendas'];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Progress Steps - Clicáveis */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <React.Fragment key={s}>
              <div 
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => setStep(s as CadastroStep)}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all",
                  step >= s 
                    ? "bg-emerald-600 text-white" 
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500",
                  "group-hover:scale-110 group-hover:shadow-lg"
                )}>
                  {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
                </div>
                <span className={cn(
                  "text-xs mt-2 font-medium transition-colors text-center",
                  step >= s ? "text-emerald-600" : "text-gray-400",
                  "group-hover:text-emerald-500"
                )}>
                  {stepLabels[s - 1]}
                </span>
              </div>
              {s < 5 && (
                <div className={cn(
                  "flex-1 h-1 mx-2 rounded",
                  step > s ? "bg-emerald-600" : "bg-gray-200 dark:bg-gray-700"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        
        {/* ===== STEP 1 - DADOS BÁSICOS ===== */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Building className="h-5 w-5 text-emerald-600" />
                Dados do Empreendimento
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Informações básicas e localização
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Empreendimento *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => updateField('nome', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Ex: Residencial Aurora Park"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Construtora *
                </label>
                <select
                  value={formData.construtora}
                  onChange={(e) => updateField('construtora', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Selecione a construtora</option>
                  {construtorasMock.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fase da Obra *
                </label>
                <div className="flex gap-2">
                  {fasesObra.map(fase => (
                    <button
                      key={fase.value}
                      type="button"
                      onClick={() => updateField('fase', fase.value)}
                      className={cn(
                        "flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                        formData.fase === fase.value
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "border-gray-200 text-gray-600 hover:border-emerald-300 dark:border-gray-600 dark:text-gray-300"
                      )}
                    >
                      {fase.icon} {fase.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data de Entrega Prevista
                </label>
                <input
                  type="month"
                  value={formData.dataEntrega}
                  onChange={(e) => updateField('dataEntrega', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição do Empreendimento
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => updateField('descricao', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Descreva o empreendimento, sua proposta de valor..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Diferenciais
                </label>
                <textarea
                  value={formData.diferenciais}
                  onChange={(e) => updateField('diferenciais', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Lazer completo, vista mar, perto do metrô..."
                />
              </div>
            </div>

            {/* Localização */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-emerald-600" />
                Localização
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => updateField('cep', formatCEP(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="00000-000"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    value={formData.logradouro}
                    onChange={(e) => updateField('logradouro', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Rua, Avenida, etc"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.numero}
                    onChange={(e) => updateField('numero', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Nº"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bairro *
                  </label>
                  <input
                    type="text"
                    value={formData.bairro}
                    onChange={(e) => updateField('bairro', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Bairro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => updateField('cidade', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estado *
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => updateField('estado', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">UF</option>
                    {estadosBrasil.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 2 - ESTRUTURA ===== */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-600" />
                Estrutura do Empreendimento
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Torres, unidades, tipologias e faixas de preço
              </p>
            </div>

            {/* Estrutura Geral */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total de Torres/Blocos
                </label>
                <input
                  type="number"
                  value={formData.totalTorres}
                  onChange={(e) => updateField('totalTorres', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Ex: 4"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Andares por Torre
                </label>
                <input
                  type="number"
                  value={formData.totalAndares}
                  onChange={(e) => updateField('totalAndares', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Ex: 15"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total de Unidades *
                </label>
                <input
                  type="number"
                  value={formData.totalUnidades}
                  onChange={(e) => updateField('totalUnidades', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Ex: 240"
                  min="1"
                />
              </div>
              <div className="flex items-end">
                <div className="w-full p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Calculado</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {getTotalUnidadesCalculado()} un.
                  </p>
                </div>
              </div>
            </div>

            {/* Tipologias */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-3">Tipologias Disponíveis *</h3>
              <div className="flex flex-wrap gap-2">
                {tipologiasDisponiveis.map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => toggleArrayField('tipologias', tipo)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                      formData.tipologias.includes(tipo)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "border-gray-200 text-gray-600 hover:border-emerald-300 dark:border-gray-600 dark:text-gray-300"
                    )}
                  >
                    {formData.tipologias.includes(tipo) && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                    {tipo}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={formData.tipologiaCustom}
                  onChange={(e) => updateField('tipologiaCustom', e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 text-sm"
                  placeholder="Adicionar tipologia personalizada..."
                />
                <button
                  type="button"
                  onClick={() => {
                    if (formData.tipologiaCustom && !formData.tipologias.includes(formData.tipologiaCustom)) {
                      setFormData(prev => ({
                        ...prev,
                        tipologias: [...prev.tipologias, prev.tipologiaCustom],
                        tipologiaCustom: ''
                      }));
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Faixas de Preço e Área */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-3">Faixas de Preço e Área</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Faixa de Preço
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Mínimo</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                        <input
                          type="text"
                          value={formData.precoMinimo}
                          onChange={(e) => updateField('precoMinimo', formatCurrency(e.target.value))}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                          placeholder="250.000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Máximo</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                        <input
                          type="text"
                          value={formData.precoMaximo}
                          onChange={(e) => updateField('precoMaximo', formatCurrency(e.target.value))}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                          placeholder="850.000"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    Faixa de Área
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Mínima</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.areaMinima}
                          onChange={(e) => updateField('areaMinima', e.target.value)}
                          className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                          placeholder="45"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">m²</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Máxima</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.areaMaxima}
                          onChange={(e) => updateField('areaMaxima', e.target.value)}
                          className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                          placeholder="150"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">m²</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 3 - UNIDADES (Espelho) ===== */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Grid3X3 className="h-5 w-5 text-emerald-600" />
                Configuração das Unidades
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Configure os blocos/torres e a estrutura de unidades para gerar o espelho de vendas
              </p>
            </div>

            {/* Blocos */}
            <div className="space-y-4">
              {formData.blocos.map((bloco, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building className="h-4 w-4 text-emerald-600" />
                      Bloco/Torre {bloco.nome}
                    </h3>
                    {formData.blocos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBloco(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nome/Identificação
                      </label>
                      <input
                        type="text"
                        value={bloco.nome}
                        onChange={(e) => updateBloco(index, 'nome', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                        placeholder="A, B, Torre Norte..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Número de Andares
                      </label>
                      <input
                        type="number"
                        value={bloco.andares}
                        onChange={(e) => updateBloco(index, 'andares', Number(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Unidades por Andar
                      </label>
                      <input
                        type="number"
                        value={bloco.unidadesPorAndar}
                        onChange={(e) => updateBloco(index, 'unidadesPorAndar', Number(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                        min="1"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="w-full p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-center">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">Subtotal</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                          {bloco.andares * bloco.unidadesPorAndar} un.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addBloco}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:text-emerald-600 hover:border-emerald-300 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Adicionar Bloco/Torre
              </button>
            </div>

            {/* Preview do Espelho */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Eye className="h-5 w-5 text-emerald-600" />
                Preview do Espelho de Vendas
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-x-auto">
                <div className="flex gap-6">
                  {formData.blocos.map((bloco, blocoIdx) => (
                    <div key={blocoIdx} className="min-w-[200px]">
                      <h4 className="text-sm font-semibold text-center mb-2 text-gray-700 dark:text-gray-300">
                        Bloco {bloco.nome}
                      </h4>
                      <div className="space-y-1">
                        {Array.from({ length: Math.min(bloco.andares, 5) }, (_, andarIdx) => {
                          const andar = bloco.andares - andarIdx;
                          return (
                            <div key={andarIdx} className="flex items-center gap-1">
                              <span className="w-6 text-right text-xs text-gray-400">{andar}º</span>
                              <div className="flex gap-0.5 flex-1">
                                {Array.from({ length: bloco.unidadesPorAndar }, (_, unidadeIdx) => (
                                  <div
                                    key={unidadeIdx}
                                    className="flex-1 h-6 bg-green-500 rounded text-[8px] text-white flex items-center justify-center"
                                  >
                                    {andar}0{unidadeIdx + 1}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {bloco.andares > 5 && (
                          <p className="text-xs text-center text-gray-400 py-1">
                            ... e mais {bloco.andares - 5} andares
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2 text-center">
                Total: <strong className="text-emerald-600">{getTotalUnidadesCalculado()} unidades</strong> em {formData.blocos.length} bloco(s)
              </p>
            </div>
          </div>
        )}

        {/* ===== STEP 4 - MATERIAIS ===== */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                Materiais de Marketing
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Faça upload dos materiais que as imobiliárias poderão baixar
              </p>
            </div>

            {/* Documentos de Vendas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Book Digital */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <FileText className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Book Digital</h4>
                    <p className="text-xs text-gray-500">PDF com apresentação completa</p>
                  </div>
                </div>
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <Upload className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {formData.bookDigital ? formData.bookDigital.name : 'Clique para upload'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => updateField('bookDigital', e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Tabela de Preços */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Table className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Tabela de Preços *</h4>
                    <p className="text-xs text-gray-500">PDF ou Excel com valores</p>
                  </div>
                </div>
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <Upload className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {formData.tabelaPrecos ? formData.tabelaPrecos.name : 'Clique para upload'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => updateField('tabelaPrecos', e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Tabela Promocional */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Percent className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Tabela Promocional</h4>
                    <p className="text-xs text-gray-500">Condições especiais vigentes</p>
                  </div>
                </div>
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <Upload className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {formData.tabelaPromocional ? formData.tabelaPromocional.name : 'Clique para upload'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => updateField('tabelaPromocional', e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Ficha Técnica */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Ficha Técnica</h4>
                    <p className="text-xs text-gray-500">Especificações do empreendimento</p>
                  </div>
                </div>
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <Upload className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {formData.fichaTecnica ? formData.fichaTecnica.name : 'Clique para upload'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => updateField('fichaTecnica', e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Plantas Humanizadas */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Image className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Plantas Humanizadas</h4>
                    <p className="text-xs text-gray-500">Imagens das plantas decoradas</p>
                  </div>
                </div>
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <Upload className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {formData.plantasHumanizadas ? formData.plantasHumanizadas.name : 'Clique para upload (múltiplos)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => updateField('plantasHumanizadas', e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Estudo de Rentabilidade */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Estudo de Rentabilidade</h4>
                    <p className="text-xs text-gray-500">Análise de investimento</p>
                  </div>
                </div>
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <Upload className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {formData.estudoRentabilidade ? formData.estudoRentabilidade.name : 'Clique para upload'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.xlsx"
                    className="hidden"
                    onChange={(e) => updateField('estudoRentabilidade', e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            {/* Vídeos e Tour */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Video className="h-5 w-5 text-emerald-600" />
                Vídeos e Tour Virtual
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <Play className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Vídeo Institucional</h4>
                      <p className="text-xs text-gray-500">MP4, MOV (máx 100MB)</p>
                    </div>
                  </div>
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <Upload className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {formData.videoInstitucional ? formData.videoInstitucional.name : 'Clique para upload'}
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => updateField('videoInstitucional', e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                      <ExternalLink className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Tour Virtual 360°</h4>
                      <p className="text-xs text-gray-500">Link Matterport ou similar</p>
                    </div>
                  </div>
                  <input
                    type="url"
                    value={formData.tourVirtualUrl}
                    onChange={(e) => updateField('tourVirtualUrl', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    placeholder="https://my.matterport.com/show/?m=..."
                  />
                </div>
              </div>
            </div>

            {/* Materiais WhatsApp */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Share2 className="h-5 w-5 text-emerald-600" />
                Materiais para Redes/WhatsApp
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Image className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Réguas WhatsApp</h4>
                      <p className="text-xs text-gray-500">Imagens prontas para compartilhar</p>
                    </div>
                  </div>
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <Upload className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {formData.reguasWhatsapp ? formData.reguasWhatsapp.name : 'Clique para upload (múltiplos)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => updateField('reguasWhatsapp', e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <Camera className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Fotos da Obra</h4>
                      <p className="text-xs text-gray-500">Andamento da construção</p>
                    </div>
                  </div>
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <Upload className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Clique para upload (múltiplos)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => updateField('fotosObra', e.target.files || null)}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 5 - VENDAS ===== */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Configurações de Venda
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Comissão, campanhas e condições para imobiliárias
              </p>
            </div>

            {/* Comissão */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Percent className="h-5 w-5 text-emerald-600" />
                Modelo de Comissionamento
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Comissão
                  </label>
                  <select
                    value={formData.comissaoModelo}
                    onChange={(e) => updateField('comissaoModelo', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="percentual">Percentual sobre VGV</option>
                    <option value="fixo">Valor Fixo por Unidade</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {formData.comissaoModelo === 'percentual' ? 'Percentual (%)' : 'Valor Fixo (R$)'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.comissaoBase}
                      onChange={(e) => updateField('comissaoBase', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                      placeholder={formData.comissaoModelo === 'percentual' ? '5' : '15.000'}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {formData.comissaoModelo === 'percentual' ? '%' : 'R$'}
                    </span>
                  </div>
                </div>
                <div className="flex items-end">
                  <div className="w-full p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-center">
                    <p className="text-xs text-emerald-600">Exemplo: Unidade R$500k</p>
                    <p className="text-lg font-bold text-emerald-700">
                      {formData.comissaoModelo === 'percentual' 
                        ? `R$ ${((500000 * Number(formData.comissaoBase || 0)) / 100).toLocaleString()}`
                        : `R$ ${Number(formData.comissaoBase || 0).toLocaleString()}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Campanha Ativa */}
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Zap className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Campanha Promocional</h3>
                    <p className="text-xs text-gray-500">Ativar condição especial vigente</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('campanhaAtiva', !formData.campanhaAtiva)}
                  className={cn(
                    "relative w-14 h-7 rounded-full transition-colors",
                    formData.campanhaAtiva ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <span className={cn(
                    "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow",
                    formData.campanhaAtiva ? "translate-x-8" : "translate-x-1"
                  )} />
                </button>
              </div>

              {formData.campanhaAtiva && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome da Campanha
                    </label>
                    <input
                      type="text"
                      value={formData.campanhaNome}
                      onChange={(e) => updateField('campanhaNome', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Ex: Condição Especial Fevereiro"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Desconto/Benefício
                    </label>
                    <input
                      type="text"
                      value={formData.campanhaDesconto}
                      onChange={(e) => updateField('campanhaDesconto', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Ex: 10% entrada + IPTU grátis"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Válida até
                    </label>
                    <input
                      type="date"
                      value={formData.campanhaValidade}
                      onChange={(e) => updateField('campanhaValidade', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Imobiliárias Autorizadas */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                Imobiliárias Autorizadas
              </h3>
              <div className="flex gap-4">
                <label className={cn(
                  "flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  formData.imobiliariasAutorizadas === 'todas'
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-emerald-300"
                )}>
                  <input
                    type="radio"
                    name="imobiliarias"
                    value="todas"
                    checked={formData.imobiliariasAutorizadas === 'todas'}
                    onChange={(e) => updateField('imobiliariasAutorizadas', e.target.value)}
                    className="hidden"
                  />
                  <div className="text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                    <h4 className="font-medium">Todas as Imobiliárias</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Qualquer imobiliária cadastrada pode vender
                    </p>
                  </div>
                </label>
                <label className={cn(
                  "flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  formData.imobiliariasAutorizadas === 'selecionadas'
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-emerald-300"
                )}>
                  <input
                    type="radio"
                    name="imobiliarias"
                    value="selecionadas"
                    checked={formData.imobiliariasAutorizadas === 'selecionadas'}
                    onChange={(e) => updateField('imobiliariasAutorizadas', e.target.value)}
                    className="hidden"
                  />
                  <div className="text-center">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                    <h4 className="font-medium">Apenas Selecionadas</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Somente parceiras aprovadas
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Condições Especiais / Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => updateField('observacoes', e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                placeholder="Informações adicionais para as imobiliárias parceiras..."
              />
            </div>

            {/* Resumo Final */}
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Resumo do Empreendimento
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="opacity-80">Nome</p>
                  <p className="font-medium">{formData.nome || '—'}</p>
                </div>
                <div>
                  <p className="opacity-80">Localização</p>
                  <p className="font-medium">{formData.cidade && formData.estado ? `${formData.cidade}, ${formData.estado}` : '—'}</p>
                </div>
                <div>
                  <p className="opacity-80">Total Unidades</p>
                  <p className="font-medium">{getTotalUnidadesCalculado()} un.</p>
                </div>
                <div>
                  <p className="opacity-80">Tipologias</p>
                  <p className="font-medium">{formData.tipologias.length > 0 ? formData.tipologias.slice(0, 2).join(', ') + (formData.tipologias.length > 2 ? '...' : '') : '—'}</p>
                </div>
                <div>
                  <p className="opacity-80">Faixa de Preço</p>
                  <p className="font-medium">
                    {formData.precoMinimo && formData.precoMaximo 
                      ? `R$ ${formData.precoMinimo} - R$ ${formData.precoMaximo}` 
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="opacity-80">Comissão</p>
                  <p className="font-medium">
                    {formData.comissaoBase 
                      ? formData.comissaoModelo === 'percentual' 
                        ? `${formData.comissaoBase}%` 
                        : `R$ ${formData.comissaoBase}` 
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="opacity-80">Campanha</p>
                  <p className="font-medium">{formData.campanhaAtiva ? '🔥 Ativa' : 'Não'}</p>
                </div>
                <div>
                  <p className="opacity-80">Entrega</p>
                  <p className="font-medium">{formData.dataEntrega || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={step === 1 ? onCancelar : () => setStep((step - 1) as CadastroStep)}
          className="px-6 py-3 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {step === 1 ? 'Cancelar' : '← Voltar'}
        </button>

        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((step + 1) as CadastroStep)}
            className="px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium flex items-center gap-2 shadow-lg shadow-emerald-500/30"
          >
            Próximo
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onConcluir}
            className="px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium flex items-center gap-2 shadow-lg shadow-emerald-500/30"
          >
            <CheckCircle2 className="h-5 w-5" />
            Cadastrar Empreendimento
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// CADASTRO DE CORRETOR VIEW
// ============================================
function CadastroCorretorView({ onConcluir, onCancelar }: {
  onConcluir: () => void;
  onCancelar: () => void;
}) {
  const [step, setStep] = useState<CadastroStep>(1);
  
  const steps = [
    { number: 1, title: 'Dados Pessoais', icon: User },
    { number: 2, title: 'Contato', icon: MessageSquare },
    { number: 3, title: 'Atuação', icon: MapPin },
    { number: 4, title: 'Parceria', icon: Handshake }
  ];

  return (
    <div className="space-y-8">
      {/* Progress Steps - Clickable */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {steps.map((s, index) => (
            <div key={s.number} className="flex items-center">
              <button
                onClick={() => setStep(s.number as CadastroStep)}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all hover:scale-105 ${
                  step === s.number 
                    ? 'bg-sky-100 dark:bg-sky-900/30' 
                    : step > s.number
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                  step === s.number 
                    ? 'bg-sky-600 text-white' 
                    : step > s.number 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                }`}>
                  {step > s.number ? <CheckCircle2 className="h-5 w-5" /> : s.number}
                </div>
                <div className="hidden md:block text-left">
                  <p className={`text-sm font-medium ${
                    step === s.number 
                      ? 'text-sky-700 dark:text-sky-300' 
                      : step > s.number
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>{s.title}</p>
                </div>
              </button>
              {index < steps.length - 1 && (
                <div className={`w-12 h-1 mx-2 rounded ${
                  step > s.number ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
              <User className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dados Pessoais</h2>
              <p className="text-gray-500">Informações básicas do corretor</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Foto do Corretor */}
            <div className="md:col-span-2 flex items-center gap-6">
              <div className="h-32 w-32 bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/20 dark:to-blue-900/20 rounded-2xl flex items-center justify-center border-2 border-dashed border-sky-300 dark:border-sky-600">
                <div className="text-center">
                  <Camera className="h-8 w-8 text-sky-400 mx-auto mb-2" />
                  <span className="text-xs text-sky-500">Foto</span>
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white mb-2">Foto Profissional</p>
                <p className="text-sm text-gray-500 mb-3">Recomendado: 400x400px, fundo neutro</p>
                <button className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700">
                  Upload Foto
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                placeholder="Nome completo"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CPF *
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CRECI-F *
              </label>
              <div className="flex gap-2">
                <select className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent">
                  <option>SP</option>
                  <option>RJ</option>
                  <option>MG</option>
                  <option>PR</option>
                  <option>SC</option>
                  <option>RS</option>
                  <option>BA</option>
                  <option>GO</option>
                  <option>DF</option>
                </select>
                <input
                  type="text"
                  placeholder="Número do CRECI-F"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">CRECI Pessoa Física</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data de Nascimento
              </label>
              <input
                type="date"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gênero
              </label>
              <select className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent">
                <option value="">Selecione...</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
                <option value="nao_informar">Prefiro não informar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                RG
              </label>
              <input
                type="text"
                placeholder="Número do RG"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Informações de Contato</h2>
              <p className="text-gray-500">Como parceiros podem te contatar</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                E-mail Principal *
              </label>
              <input
                type="email"
                placeholder="corretor@email.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telefone Celular *
              </label>
              <input
                type="tel"
                placeholder="(00) 00000-0000"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 mb-4">
                <input type="checkbox" className="rounded border-gray-300 text-sky-600 focus:ring-sky-500" defaultChecked />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Usar número do celular como WhatsApp Business
                </span>
              </label>
              <input
                type="tel"
                placeholder="WhatsApp (se diferente)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    placeholder="Cidade"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estado *
                  </label>
                  <select className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent">
                    <option>SP</option>
                    <option>RJ</option>
                    <option>MG</option>
                    <option>PR</option>
                    <option>SC</option>
                    <option>RS</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bairro de Atuação Principal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Jardins, Moema, Itaim Bibi"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Redes Sociais (Opcional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-pink-600 font-bold text-sm">IG</span>
                  </div>
                  <input
                    type="text"
                    placeholder="@seu_instagram"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">in</span>
                  </div>
                  <input
                    type="text"
                    placeholder="linkedin.com/in/seuperfil"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
              <MapPin className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Área de Atuação</h2>
              <p className="text-gray-500">Especialidades e regiões de trabalho</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Vínculo Profissional */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Vínculo Profissional *</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="relative cursor-pointer">
                  <input type="radio" name="vinculo" className="peer sr-only" defaultChecked />
                  <div className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600 peer-checked:border-sky-500 peer-checked:bg-sky-50 dark:peer-checked:bg-sky-900/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
                        <User className="h-6 w-6 text-sky-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Corretor Autônomo</p>
                        <p className="text-sm text-gray-500">Atuo de forma independente</p>
                      </div>
                    </div>
                  </div>
                </label>

                <label className="relative cursor-pointer">
                  <input type="radio" name="vinculo" className="peer sr-only" />
                  <div className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600 peer-checked:border-sky-500 peer-checked:bg-sky-50 dark:peer-checked:bg-sky-900/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Vinculado a Imobiliária</p>
                        <p className="text-sm text-gray-500">Trabalho para uma imobiliária</p>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Especialidades */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Especialidades *</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Alto Padrão', checked: true },
                  { label: 'Médio Padrão', checked: true },
                  { label: 'Econômico', checked: false },
                  { label: 'Minha Casa Minha Vida', checked: false },
                  { label: 'Lançamentos', checked: true },
                  { label: 'Prontos', checked: true },
                  { label: 'Comercial', checked: false },
                  { label: 'Loteamentos', checked: false }
                ].map((esp) => (
                  <label key={esp.label} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      defaultChecked={esp.checked}
                      className="rounded border-gray-300 text-sky-600 focus:ring-sky-500" 
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{esp.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Regiões */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Regiões de Atuação *</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Zona Sul', checked: true },
                  { label: 'Zona Oeste', checked: true },
                  { label: 'Centro', checked: false },
                  { label: 'Zona Norte', checked: false },
                  { label: 'Zona Leste', checked: false },
                  { label: 'Grande São Paulo', checked: false }
                ].map((reg) => (
                  <label key={reg.label} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      defaultChecked={reg.checked}
                      className="rounded border-gray-300 text-sky-600 focus:ring-sky-500" 
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{reg.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Experiência */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tempo de Experiência *
                </label>
                <select className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent">
                  <option value="">Selecione...</option>
                  <option value="iniciante">Menos de 1 ano</option>
                  <option value="junior">1 a 3 anos</option>
                  <option value="pleno">3 a 5 anos</option>
                  <option value="senior">5 a 10 anos</option>
                  <option value="expert">Mais de 10 anos</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vendas nos últimos 12 meses
                </label>
                <select className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent">
                  <option value="">Selecione...</option>
                  <option value="0">Nenhuma (iniciando)</option>
                  <option value="1-5">1 a 5 unidades</option>
                  <option value="6-15">6 a 15 unidades</option>
                  <option value="16-30">16 a 30 unidades</option>
                  <option value="30+">Mais de 30 unidades</option>
                </select>
              </div>
            </div>

            {/* Sobre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mini Bio (Opcional)
              </label>
              <textarea
                rows={4}
                placeholder="Fale um pouco sobre sua experiência, diferenciais e forma de trabalhar..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">Esta bio será exibida para construtoras na Vitrine</p>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
              <Handshake className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Preferências de Parceria</h2>
              <p className="text-gray-500">Como você prefere trabalhar com construtoras</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Modelo de Comissão */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Modelo de Comissão Aceito *</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'padrao', label: 'Padrão da Construtora', desc: 'Aceito a comissão padrão oferecida', checked: true },
                  { value: 'negociavel', label: 'Negociável', desc: 'Prefiro negociar caso a caso', checked: false },
                  { value: 'minimo', label: 'Comissão Mínima', desc: 'Tenho um mínimo esperado', checked: false }
                ].map((modelo) => (
                  <label key={modelo.value} className="relative cursor-pointer">
                    <input type="radio" name="modelo_comissao" className="peer sr-only" defaultChecked={modelo.checked} />
                    <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 peer-checked:border-sky-500 peer-checked:bg-sky-50 dark:peer-checked:bg-sky-900/20 transition-all h-full">
                      <p className="font-semibold text-gray-900 dark:text-white">{modelo.label}</p>
                      <p className="text-sm text-gray-500 mt-1">{modelo.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Disponibilidade Demandas */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Disponibilidade para Demandas *</h3>
              <div className="p-6 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 rounded-xl border border-sky-200 dark:border-sky-700">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm">
                    <Bell className="h-6 w-6 text-sky-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white mb-2">
                      Participar das Demandas de Construtoras
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Receba notificações quando construtoras buscarem corretores para novos empreendimentos. 
                      Você poderá se candidatar diretamente!
                    </p>
                    <label className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        defaultChecked
                        className="h-5 w-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500" 
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Sim, quero receber demandas de construtoras
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferência de Empreendimentos */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Interesse em Tipos de Empreendimento</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Residencial Vertical', emoji: '🏢' },
                  { label: 'Residencial Horizontal', emoji: '🏠' },
                  { label: 'Comercial', emoji: '🏪' },
                  { label: 'Loteamentos', emoji: '🗺️' },
                  { label: 'Studios/Compactos', emoji: '🏨' },
                  { label: 'Alto Luxo', emoji: '💎' },
                  { label: 'MCMV', emoji: '🏘️' },
                  { label: 'Multiuso', emoji: '🏗️' }
                ].map((tipo) => (
                  <label key={tipo.label} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      defaultChecked={['Residencial Vertical', 'Studios/Compactos', 'Alto Luxo'].includes(tipo.label)}
                      className="rounded border-gray-300 text-sky-600 focus:ring-sky-500" 
                    />
                    <span className="text-lg">{tipo.emoji}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{tipo.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Documentos */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Documentos para Verificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl hover:border-sky-400 transition-colors cursor-pointer">
                  <div className="text-center py-4">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="font-medium text-gray-700 dark:text-gray-300">Carteira CRECI</p>
                    <p className="text-xs text-gray-400 mt-1">PDF ou imagem, máx 5MB</p>
                  </div>
                </div>
                <div className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl hover:border-sky-400 transition-colors cursor-pointer">
                  <div className="text-center py-4">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="font-medium text-gray-700 dark:text-gray-300">Documento de Identidade</p>
                    <p className="text-xs text-gray-400 mt-1">RG ou CNH</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Termos */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <label className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  className="mt-1 rounded border-gray-300 text-sky-600 focus:ring-sky-500" 
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Li e concordo com os <a href="#" className="text-sky-600 hover:underline">Termos de Uso</a> e 
                  <a href="#" className="text-sky-600 hover:underline"> Política de Privacidade</a> da plataforma. 
                  Declaro que as informações fornecidas são verdadeiras e autorizo a verificação do CRECI junto ao órgão competente.
                </span>
              </label>
            </div>

            {/* Preview Card */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Preview do seu Perfil na Vitrine</h3>
              <div className="max-w-sm p-6 bg-gradient-to-br from-white to-sky-50 dark:from-gray-800 dark:to-sky-900/20 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    JR
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">João Ricardo</h4>
                    <p className="text-sm text-gray-500">CRECI-F 12345 • SP</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 text-amber-400 fill-current" />
                      <span className="text-xs text-gray-500">Novo na plataforma</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-xs">
                    Alto Padrão
                  </span>
                  <span className="px-2 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-xs">
                    Lançamentos
                  </span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                    Zona Sul
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">3-5 anos exp.</span>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                    ✓ Autônomo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={step === 1 ? onCancelar : () => setStep((step - 1) as CadastroStep)}
          className="px-6 py-3 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {step === 1 ? 'Cancelar' : '← Voltar'}
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((step + 1) as CadastroStep)}
            className="px-8 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 font-medium flex items-center gap-2 shadow-lg shadow-sky-500/30"
          >
            Próximo
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onConcluir}
            className="px-8 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 font-medium flex items-center gap-2 shadow-lg shadow-sky-500/30"
          >
            <CheckCircle2 className="h-5 w-5" />
            Cadastrar Corretor
          </button>
        )}
      </div>
    </div>
  );
}

export default RealEstateMockModule;
