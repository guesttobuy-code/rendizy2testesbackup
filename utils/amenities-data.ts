/**
 * RENDIZY - Amenities Database
 * 
 * Base de dados completa de amenities para Property Management System
 * Total: 252 amenities organizadas em 13 categorias
 * 
 * Baseado em:
 * - Airbnb (host amenities)
 * - Booking.com (facilities)
 * - VRBO (amenities)
 * - Google Vacation Rentals
 * 
 * @version 1.0.78
 * @date 2025-10-28
 */

export type AmenityCategory = 
  | 'accessibility'
  | 'outdoor'
  | 'bathroom'
  | 'climate'
  | 'kitchen'
  | 'entertainment'
  | 'parking'
  | 'family'
  | 'internet'
  | 'cleaning'
  | 'bedroom'
  | 'security'
  | 'services';

export interface Amenity {
  id: string;
  name: string;
  category: AmenityCategory;
  icon?: string;
  channels: ('airbnb' | 'booking' | 'vrbo' | 'direct')[];
  description?: string;
}

export interface AmenityCategoryInfo {
  id: AmenityCategory;
  name: string;
  icon: string;
  count: number;
  color: string;
}

// ============================================================================
// CATEGORIAS
// ============================================================================

export const AMENITY_CATEGORIES: Record<AmenityCategory, AmenityCategoryInfo> = {
  accessibility: {
    id: 'accessibility',
    name: 'Acessibilidade',
    icon: '♿',
    count: 8,
    color: 'text-purple-500',
  },
  outdoor: {
    id: 'outdoor',
    name: 'Ao ar livre / Vista',
    icon: '🌳',
    count: 34,
    color: 'text-green-500',
  },
  bathroom: {
    id: 'bathroom',
    name: 'Banheiro',
    icon: '🚿',
    count: 28,
    color: 'text-blue-500',
  },
  climate: {
    id: 'climate',
    name: 'Climatização',
    icon: '❄️',
    count: 3,
    color: 'text-cyan-500',
  },
  kitchen: {
    id: 'kitchen',
    name: 'Cozinha e Sala de Jantar',
    icon: '🍽️',
    count: 33,
    color: 'text-orange-500',
  },
  entertainment: {
    id: 'entertainment',
    name: 'Entretenimento',
    icon: '📺',
    count: 48,
    color: 'text-pink-500',
  },
  parking: {
    id: 'parking',
    name: 'Estacionamento e Instalações',
    icon: '🅿️',
    count: 21,
    color: 'text-indigo-500',
  },
  family: {
    id: 'family',
    name: 'Família',
    icon: '👨‍👩‍👧‍👦',
    count: 17,
    color: 'text-rose-500',
  },
  internet: {
    id: 'internet',
    name: 'Internet e Escritório',
    icon: '💻',
    count: 13,
    color: 'text-blue-600',
  },
  cleaning: {
    id: 'cleaning',
    name: 'Limpeza e Desinfecção',
    icon: '🧹',
    count: 4,
    color: 'text-teal-500',
  },
  bedroom: {
    id: 'bedroom',
    name: 'Quarto e Lavanderia',
    icon: '🛏️',
    count: 27,
    color: 'text-violet-500',
  },
  security: {
    id: 'security',
    name: 'Segurança Doméstica',
    icon: '🔒',
    count: 22,
    color: 'text-red-500',
  },
  services: {
    id: 'services',
    name: 'Serviços',
    icon: '🛎️',
    count: 11,
    color: 'text-amber-500',
  },
};

// ============================================================================
// AMENITIES DATABASE
// ============================================================================

export const AMENITIES: Amenity[] = [
  // ========================================
  // ACESSIBILIDADE (8)
  // ========================================
  {
    id: 'acc_001',
    name: 'Acessível para cadeira de rodas',
    category: 'accessibility',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'acc_002',
    name: 'Banheiro acessível',
    category: 'accessibility',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'acc_003',
    name: 'Elevador',
    category: 'accessibility',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'acc_004',
    name: 'Entrada acessível',
    category: 'accessibility',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'acc_005',
    name: 'Corrimão em escadas',
    category: 'accessibility',
    channels: ['airbnb', 'booking', 'direct'],
  },
  {
    id: 'acc_006',
    name: 'Piso térreo sem escadas',
    category: 'accessibility',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'acc_007',
    name: 'Vaga de estacionamento acessível',
    category: 'accessibility',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'acc_008',
    name: 'Largura de porta acessível',
    category: 'accessibility',
    channels: ['airbnb', 'booking', 'direct'],
  },

  // ========================================
  // AO AR LIVRE / VISTA (34)
  // ========================================
  {
    id: 'out_001',
    name: 'Varanda',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_002',
    name: 'Terraço',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_003',
    name: 'Piscina',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_004',
    name: 'Piscina aquecida',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_005',
    name: 'Piscina privativa',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_006',
    name: 'Piscina compartilhada',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_007',
    name: 'Jacuzzi/Hidromassagem',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_008',
    name: 'Jardim',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_009',
    name: 'Jardim privativo',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_010',
    name: 'Churrasqueira',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_011',
    name: 'Churrasqueira a carvão',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_012',
    name: 'Churrasqueira a gás',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_013',
    name: 'Área para refeições ao ar livre',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_014',
    name: 'Mobília de jardim',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_015',
    name: 'Espreguiçadeiras',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_016',
    name: 'Rede',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_017',
    name: 'Vista para o mar',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_018',
    name: 'Vista para a montanha',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_019',
    name: 'Vista para a cidade',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_020',
    name: 'Vista para o jardim',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_021',
    name: 'Vista para a piscina',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_022',
    name: 'Praia privativa',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_023',
    name: 'Acesso à praia',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_024',
    name: 'Sauna',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_025',
    name: 'Academia',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_026',
    name: 'Quadra de tênis',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_027',
    name: 'Campo de futebol',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_028',
    name: 'Playground',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_029',
    name: 'Área de fogueira',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_030',
    name: 'Deck',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_031',
    name: 'Gazebo',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_032',
    name: 'Guarda-sol',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_033',
    name: 'Área de piquenique',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'out_034',
    name: 'Lago privativo',
    category: 'outdoor',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },

  // ========================================
  // BANHEIRO (28)
  // ========================================
  {
    id: 'bat_001',
    name: 'Secador de cabelo',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_002',
    name: 'Shampoo',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_003',
    name: 'Condicionador',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_004',
    name: 'Sabonete líquido',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_005',
    name: 'Banheira',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_006',
    name: 'Banheira de hidromassagem',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_007',
    name: 'Chuveiro com água quente',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_008',
    name: 'Ducha higiênica',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_009',
    name: 'Toalhas',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_010',
    name: 'Toalhas de banho',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_011',
    name: 'Toalhas de rosto',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_012',
    name: 'Roupão',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_013',
    name: 'Chinelos',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_014',
    name: 'Papel higiênico',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_015',
    name: 'Sabonete em barra',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_016',
    name: 'Gel de banho',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_017',
    name: 'Creme hidratante',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_018',
    name: 'Espelho de aumento',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'direct'],
  },
  {
    id: 'bat_019',
    name: 'Balança',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_020',
    name: 'Kit de primeiros socorros',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_021',
    name: 'Banheiro privativo',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_022',
    name: 'Bidê',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_023',
    name: 'Produtos de limpeza',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_024',
    name: 'Ganchos para toalhas',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'direct'],
  },
  {
    id: 'bat_025',
    name: 'Aquecedor de toalhas',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_026',
    name: 'Banheiro com janela',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'direct'],
  },
  {
    id: 'bat_027',
    name: 'Ducha com múltiplos jatos',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bat_028',
    name: 'Box de vidro',
    category: 'bathroom',
    channels: ['airbnb', 'booking', 'direct'],
  },

  // ========================================
  // CLIMATIZAÇÃO (3)
  // ========================================
  {
    id: 'cli_001',
    name: 'Ar-condicionado',
    category: 'climate',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'cli_002',
    name: 'Aquecedor',
    category: 'climate',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'cli_003',
    name: 'Ventilador de teto',
    category: 'climate',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },

  // ========================================
  // COZINHA E SALA DE JANTAR (33)
  // ========================================
  {
    id: 'kit_001',
    name: 'Cozinha',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_002',
    name: 'Cozinha completa',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_003',
    name: 'Micro-ondas',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_004',
    name: 'Geladeira',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_005',
    name: 'Freezer',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_006',
    name: 'Fogão',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_007',
    name: 'Forno',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_008',
    name: 'Forno elétrico',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_009',
    name: 'Cooktop',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_010',
    name: 'Lava-louças',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_011',
    name: 'Cafeteira',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_012',
    name: 'Cafeteira Nespresso',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_013',
    name: 'Chaleira elétrica',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_014',
    name: 'Torradeira',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_015',
    name: 'Liquidificador',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_016',
    name: 'Mixer',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_017',
    name: 'Batedeira',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_018',
    name: 'Processador de alimentos',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_019',
    name: 'Panelas e frigideiras',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_020',
    name: 'Utensílios de cozinha',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_021',
    name: 'Pratos e talheres',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_022',
    name: 'Copos e taças',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_023',
    name: 'Saca-rolhas',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_024',
    name: 'Tábua de corte',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_025',
    name: 'Facas de cozinha',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_026',
    name: 'Mesa de jantar',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_027',
    name: 'Cadeiras de jantar',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_028',
    name: 'Bancada americana',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_029',
    name: 'Banquetas',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_030',
    name: 'Dispensador de água',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_031',
    name: 'Máquina de gelo',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_032',
    name: 'Adega de vinhos',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'kit_033',
    name: 'Frigobar',
    category: 'kitchen',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },

  // ========================================
  // ENTRETENIMENTO (48)
  // ========================================
  {
    id: 'ent_001',
    name: 'TV',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_002',
    name: 'TV a cabo',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_003',
    name: 'TV por assinatura',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_004',
    name: 'Netflix',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_005',
    name: 'Amazon Prime Video',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_006',
    name: 'Disney+',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_007',
    name: 'HBO Max',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_008',
    name: 'Spotify',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_009',
    name: 'Smart TV',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_010',
    name: 'TV 4K',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_011',
    name: 'Chromecast',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_012',
    name: 'Apple TV',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_013',
    name: 'Roku',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_014',
    name: 'Fire TV Stick',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_015',
    name: 'Console de videogame',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_016',
    name: 'PlayStation',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_017',
    name: 'Xbox',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_018',
    name: 'Nintendo Switch',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_019',
    name: 'Home theater',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_020',
    name: 'Soundbar',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_021',
    name: 'Sistema de som',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_022',
    name: 'Caixa de som Bluetooth',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_023',
    name: 'Alexa',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_024',
    name: 'Google Home',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_025',
    name: 'Livros',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_026',
    name: 'Revistas',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_027',
    name: 'Jogos de tabuleiro',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_028',
    name: 'Baralho',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_029',
    name: 'Mesa de bilhar',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_030',
    name: 'Mesa de ping-pong',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_031',
    name: 'Pebolim',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_032',
    name: 'Sinuca',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_033',
    name: 'Dardos',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_034',
    name: 'Piano',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_035',
    name: 'Violão',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_036',
    name: 'Karaokê',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_037',
    name: 'Projetor',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_038',
    name: 'Tela de projeção',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_039',
    name: 'DVD player',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_040',
    name: 'Blu-ray player',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_041',
    name: 'Rádio',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_042',
    name: 'Equipamento de ginástica',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_043',
    name: 'Esteira',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_044',
    name: 'Bicicleta ergométrica',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_045',
    name: 'Halteres',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_046',
    name: 'Tapete de yoga',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_047',
    name: 'Bicicletas',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ent_048',
    name: 'Stand-up paddle',
    category: 'entertainment',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },

  // ========================================
  // ESTACIONAMENTO E INSTALAÇÕES (21)
  // ========================================
  {
    id: 'par_001',
    name: 'Estacionamento gratuito',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_002',
    name: 'Estacionamento pago',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_003',
    name: 'Garagem coberta',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_004',
    name: 'Garagem privativa',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_005',
    name: 'Vaga para 1 carro',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_006',
    name: 'Vaga para 2 carros',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_007',
    name: 'Carregador para veículos elétricos',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_008',
    name: 'Portaria 24h',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_009',
    name: 'Segurança 24h',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_010',
    name: 'Condomínio fechado',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_011',
    name: 'Portão eletrônico',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_012',
    name: 'Interfone',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_013',
    name: 'Salão de festas',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_014',
    name: 'Churrasqueira compartilhada',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_015',
    name: 'Área de lazer',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_016',
    name: 'Bicicletário',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_017',
    name: 'Depósito',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_018',
    name: 'Lavanderia compartilhada',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_019',
    name: 'Espaço coworking',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_020',
    name: 'Cinema',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'par_021',
    name: 'Spa compartilhado',
    category: 'parking',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },

  // ========================================
  // FAMÍLIA (17)
  // ========================================
  {
    id: 'fam_001',
    name: 'Berço',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_002',
    name: 'Cadeira alta',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_003',
    name: 'Banheira para bebê',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_004',
    name: 'Trocador',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_005',
    name: 'Babá eletrônica',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_006',
    name: 'Proteção de tomadas',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_007',
    name: 'Proteção de escadas',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_008',
    name: 'Proteção de cantos',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_009',
    name: 'Protetores de gavetas',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_010',
    name: 'Jogos infantis',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_011',
    name: 'Brinquedos',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_012',
    name: 'Livros infantis',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_013',
    name: 'Pratos e talheres infantis',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_014',
    name: 'Aquecedor de mamadeira',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_015',
    name: 'Carrinho de bebê',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_016',
    name: 'Piscina para crianças',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'fam_017',
    name: 'Área kids',
    category: 'family',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },

  // ========================================
  // INTERNET E ESCRITÓRIO (13)
  // ========================================
  {
    id: 'int_001',
    name: 'Wi-Fi',
    category: 'internet',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'int_002',
    name: 'Wi-Fi de alta velocidade',
    category: 'internet',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'int_003',
    name: 'Internet (via cabo)',
    category: 'internet',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'int_004',
    name: 'Mesa de trabalho',
    category: 'internet',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'int_005',
    name: 'Cadeira de escritório',
    category: 'internet',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'int_006',
    name: 'Espaço dedicado para trabalho',
    category: 'internet',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'int_007',
    name: 'Monitor externo',
    category: 'internet',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'int_008',
    name: 'Impressora',
    category: 'internet',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'int_009',
    name: 'Scanner',
    category: 'internet',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'int_010',
    name: 'Telefone',
    category: 'internet',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'int_011',
    name: 'Tomada perto da cama',
    category: 'internet',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'int_012',
    name: 'Tomada USB',
    category: 'internet',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'int_013',
    name: 'Quarto à prova de som',
    category: 'internet',
    channels: ['airbnb', 'booking', 'direct'],
  },

  // ========================================
  // LIMPEZA E DESINFECÇÃO (4)
  // ========================================
  {
    id: 'cle_001',
    name: 'Produtos de limpeza disponíveis',
    category: 'cleaning',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'cle_002',
    name: 'Desinfetante',
    category: 'cleaning',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'cle_003',
    name: 'Álcool em gel',
    category: 'cleaning',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'cle_004',
    name: 'Processo de limpeza aprimorado',
    category: 'cleaning',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
    description: 'Protocolo de limpeza de 5 etapas do Airbnb',
  },

  // ========================================
  // QUARTO E LAVANDERIA (27)
  // ========================================
  {
    id: 'bed_001',
    name: 'Roupa de cama',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_002',
    name: 'Lençóis',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_003',
    name: 'Fronhas',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_004',
    name: 'Cobertor',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_005',
    name: 'Edredom',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_006',
    name: 'Travesseiros extras',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_007',
    name: 'Travesseiro antialérgico',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_008',
    name: 'Colchão ortopédico',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_009',
    name: 'Blackout',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_010',
    name: 'Cortinas',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_011',
    name: 'Persianas',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_012',
    name: 'Cabides',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_013',
    name: 'Guarda-roupa',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_014',
    name: 'Closet',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_015',
    name: 'Cômoda',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_016',
    name: 'Espelho de corpo inteiro',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_017',
    name: 'Criado-mudo',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_018',
    name: 'Abajur',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_019',
    name: 'Despertador',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_020',
    name: 'Máquina de lavar',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_021',
    name: 'Secadora',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_022',
    name: 'Ferro de passar',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_023',
    name: 'Tábua de passar',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_024',
    name: 'Varal',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_025',
    name: 'Cesto de roupa suja',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_026',
    name: 'Sabão em pó',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'bed_027',
    name: 'Amaciante',
    category: 'bedroom',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },

  // ========================================
  // SEGURANÇA DOMÉSTICA (22)
  // ========================================
  {
    id: 'sec_001',
    name: 'Detector de fumaça',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_002',
    name: 'Detector de monóxido de carbono',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_003',
    name: 'Extintor de incêndio',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_004',
    name: 'Kit de primeiros socorros',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_005',
    name: 'Cofre',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_006',
    name: 'Fechadura inteligente',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_007',
    name: 'Câmeras de segurança externas',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
    description: 'Apenas em áreas externas',
  },
  {
    id: 'sec_008',
    name: 'Sistema de alarme',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_009',
    name: 'Cerca elétrica',
    category: 'security',
    channels: ['airbnb', 'booking', 'direct'],
  },
  {
    id: 'sec_010',
    name: 'Circuito fechado de TV',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_011',
    name: 'Janelas com tela',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_012',
    name: 'Grades nas janelas',
    category: 'security',
    channels: ['airbnb', 'booking', 'direct'],
  },
  {
    id: 'sec_013',
    name: 'Porta blindada',
    category: 'security',
    channels: ['airbnb', 'booking', 'direct'],
  },
  {
    id: 'sec_014',
    name: 'Olho mágico',
    category: 'security',
    channels: ['airbnb', 'booking', 'direct'],
  },
  {
    id: 'sec_015',
    name: 'Corrente na porta',
    category: 'security',
    channels: ['airbnb', 'booking', 'direct'],
  },
  {
    id: 'sec_016',
    name: 'Iluminação externa',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_017',
    name: 'Iluminação com sensor de movimento',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_018',
    name: 'Proteção de piscina',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_019',
    name: 'Cerca ao redor da piscina',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_020',
    name: 'Portão de segurança para escadas',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_021',
    name: 'Gerador de energia',
    category: 'security',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'sec_022',
    name: 'Nobreak',
    category: 'security',
    channels: ['airbnb', 'booking', 'direct'],
  },

  // ========================================
  // SERVIÇOS (11)
  // ========================================
  {
    id: 'ser_001',
    name: 'Check-in e check-out 24h',
    category: 'services',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ser_002',
    name: 'Check-in automático',
    category: 'services',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ser_003',
    name: 'Check-in antecipado',
    category: 'services',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ser_004',
    name: 'Check-out tardio',
    category: 'services',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ser_005',
    name: 'Serviço de limpeza diária',
    category: 'services',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ser_006',
    name: 'Café da manhã incluído',
    category: 'services',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ser_007',
    name: 'Concierge',
    category: 'services',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ser_008',
    name: 'Transfer aeroporto',
    category: 'services',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ser_009',
    name: 'Aluguel de carro',
    category: 'services',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ser_010',
    name: 'Pacote de boas-vindas',
    category: 'services',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
  {
    id: 'ser_011',
    name: 'Guia local',
    category: 'services',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Obtém amenities por categoria
 */
export function getAmenitiesByCategory(category: AmenityCategory): Amenity[] {
  return AMENITIES.filter(a => a.category === category);
}

/**
 * Obtém amenities por canal
 */
export function getAmenitiesByChannel(channel: 'airbnb' | 'booking' | 'vrbo' | 'direct'): Amenity[] {
  return AMENITIES.filter(a => a.channels.includes(channel));
}

/**
 * Busca amenities por texto
 */
export function searchAmenities(query: string): Amenity[] {
  const lowerQuery = query.toLowerCase();
  return AMENITIES.filter(a => 
    a.name.toLowerCase().includes(lowerQuery) ||
    a.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Obtém amenity por ID
 */
export function getAmenityById(id: string): Amenity | undefined {
  return AMENITIES.find(a => a.id === id);
}

/**
 * Valida se uma lista de IDs de amenities é válida
 */
export function validateAmenityIds(ids: string[]): boolean {
  return ids.every(id => AMENITIES.some(a => a.id === id));
}

/**
 * Conta amenities selecionadas por categoria
 */
export function countAmenitiesByCategory(selectedIds: string[]): Record<AmenityCategory, number> {
  const counts: Record<string, number> = {};
  
  Object.keys(AMENITY_CATEGORIES).forEach(cat => {
    counts[cat] = 0;
  });

  selectedIds.forEach(id => {
    const amenity = getAmenityById(id);
    if (amenity) {
      counts[amenity.category]++;
    }
  });

  return counts as Record<AmenityCategory, number>;
}
