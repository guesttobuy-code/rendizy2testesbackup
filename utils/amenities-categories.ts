/**
 * RENDIZY - Categorias Completas de Amenidades
 * 
 * Estrutura completa de amenidades separadas por categoria,
 * para uso tanto em Location Amenities quanto Listing Amenities.
 * 
 * @version 1.0.103.80
 * @date 2025-10-30
 */

export type AmenityCategory = {
  id: string;
  name: string;
  icon: string;
  amenities: Amenity[];
};

export type Amenity = {
  id: string;
  name: string;
  icon?: string;
};

/**
 * LOCATION AMENITIES
 * Amenidades do local (prédio, hotel, condomínio)
 */
export const LOCATION_AMENITIES: AmenityCategory[] = [
  {
    id: 'outdoor-view',
    name: 'Ao ar livre / Vista',
    icon: '🏞️',
    amenities: [
      { id: 'pool', name: 'Piscina', icon: '🏊' },
      { id: 'hot-tub', name: 'Banheira de hidromassagem', icon: '🛁' },
      { id: 'garden', name: 'Jardim', icon: '🌳' },
      { id: 'terrace', name: 'Terraço', icon: '🏞️' },
      { id: 'balcony', name: 'Varanda', icon: '🪟' },
      { id: 'patio', name: 'Pátio', icon: '🏡' },
      { id: 'bbq-area', name: 'Área para churrasco', icon: '🍖' },
      { id: 'outdoor-furniture', name: 'Mobília externa', icon: '🪑' },
      { id: 'outdoor-dining', name: 'Área de refeições externa', icon: '🍽️' },
      { id: 'beach-access', name: 'Acesso à praia', icon: '🏖️' },
      { id: 'lake-access', name: 'Acesso ao lago', icon: '🏞️' },
      { id: 'mountain-view', name: 'Vista para montanha', icon: '⛰️' },
      { id: 'sea-view', name: 'Vista para o mar', icon: '🌊' },
      { id: 'city-view', name: 'Vista da cidade', icon: '🌃' },
      { id: 'garden-view', name: 'Vista do jardim', icon: '🌺' },
      { id: 'pool-view', name: 'Vista da piscina', icon: '🏊' },
      { id: 'firepit', name: 'Fogueira', icon: '🔥' },
      { id: 'sun-deck', name: 'Deck para sol', icon: '☀️' },
      { id: 'hammock', name: 'Rede', icon: '🪢' },
      { id: 'playground', name: 'Playground', icon: '🛝' },
      { id: 'sports-court', name: 'Quadra esportiva', icon: '🏀' },
      { id: 'bike-storage', name: 'Guarda de bicicletas', icon: '🚴' }
    ]
  },
  {
    id: 'parking-facilities',
    name: 'Estacionamento e instalações',
    icon: '🚗',
    amenities: [
      { id: 'parking', name: 'Estacionamento gratuito', icon: '🅿️' },
      { id: 'parking-paid', name: 'Estacionamento pago', icon: '💳' },
      { id: 'garage', name: 'Garagem', icon: '🏠' },
      { id: 'covered-parking', name: 'Estacionamento coberto', icon: '🏘️' },
      { id: 'ev-charging', name: 'Carregador de veículo elétrico', icon: '🔌' },
      { id: 'elevator', name: 'Elevador', icon: '🛗' },
      { id: 'wheelchair-accessible', name: 'Acessível para cadeira de rodas', icon: '♿' },
      { id: 'gym', name: 'Academia', icon: '🏋️' },
      { id: 'spa', name: 'Spa', icon: '💆' }
    ]
  },
  {
    id: 'services-location',
    name: 'Serviços',
    icon: '🛎️',
    amenities: [
      { id: 'reception-24h', name: 'Recepção 24 horas', icon: '🕐' },
      { id: 'concierge', name: 'Concierge', icon: '🎩' },
      { id: 'security-24h', name: 'Segurança 24 horas', icon: '👮' },
      { id: 'doorman', name: 'Porteiro', icon: '🚪' },
      { id: 'valet-parking', name: 'Serviço de manobrista', icon: '🚗' },
      { id: 'luggage-storage', name: 'Guarda-volumes', icon: '🧳' },
      { id: 'express-checkin', name: 'Check-in expresso', icon: '⚡' },
      { id: 'express-checkout', name: 'Check-out expresso', icon: '⚡' },
      { id: 'airport-shuttle', name: 'Transfer aeroporto', icon: '✈️' },
      { id: 'restaurant', name: 'Restaurante', icon: '🍽️' },
      { id: 'bar', name: 'Bar', icon: '🍸' },
      { id: 'cafe', name: 'Café', icon: '☕' },
      { id: 'convenience-store', name: 'Loja de conveniência', icon: '🏪' },
      { id: 'laundry-service', name: 'Serviço de lavanderia', icon: '🧺' },
      { id: 'dry-cleaning', name: 'Lavanderia a seco', icon: '👔' }
    ]
  }
];

/**
 * LISTING AMENITIES  
 * Amenidades da acomodação específica (apartamento, quarto, casa)
 */
export const LISTING_AMENITIES: AmenityCategory[] = [
  {
    id: 'bathroom',
    name: 'Banheiro',
    icon: '🚿',
    amenities: [
      { id: 'private-bathroom', name: 'Banheiro privativo', icon: '🚪' },
      { id: 'shared-bathroom', name: 'Banheiro compartilhado', icon: '👥' },
      { id: 'bathtub', name: 'Banheira', icon: '🛁' },
      { id: 'shower', name: 'Chuveiro', icon: '🚿' },
      { id: 'hairdryer', name: 'Secador de cabelo', icon: '💨' },
      { id: 'towels', name: 'Toalhas', icon: '🧖' },
      { id: 'toiletries', name: 'Artigos de higiene pessoal', icon: '🧴' },
      { id: 'toilet', name: 'Vaso sanitário', icon: '🚽' }
    ]
  },
  {
    id: 'climate-control',
    name: 'Climatização',
    icon: '🌡️',
    amenities: [
      { id: 'air-conditioning', name: 'Ar condicionado', icon: '❄️' },
      { id: 'heating', name: 'Aquecimento', icon: '🔥' },
      { id: 'fan', name: 'Ventilador', icon: '🌀' }
    ]
  },
  {
    id: 'kitchen-dining',
    name: 'Cozinha e sala de jantar',
    icon: '🍳',
    amenities: [
      { id: 'kitchen', name: 'Cozinha completa', icon: '🍳' },
      { id: 'kitchenette', name: 'Kitchenette', icon: '🔪' },
      { id: 'microwave', name: 'Micro-ondas', icon: '📦' },
      { id: 'refrigerator', name: 'Geladeira', icon: '🧊' },
      { id: 'stove', name: 'Fogão', icon: '🔥' },
      { id: 'oven', name: 'Forno', icon: '🍞' },
      { id: 'dishwasher', name: 'Lava-louças', icon: '🍽️' },
      { id: 'coffee-maker', name: 'Cafeteira', icon: '☕' },
      { id: 'kettle', name: 'Chaleira', icon: '🫖' },
      { id: 'toaster', name: 'Torradeira', icon: '🍞' },
      { id: 'blender', name: 'Liquidificador', icon: '🥤' },
      { id: 'dining-table', name: 'Mesa de jantar', icon: '🍽️' },
      { id: 'cookware', name: 'Utensílios de cozinha', icon: '🍴' },
      { id: 'dishes', name: 'Louças', icon: '🍽️' }
    ]
  },
  {
    id: 'entertainment',
    name: 'Entretenimento',
    icon: '📺',
    amenities: [
      { id: 'tv', name: 'TV', icon: '📺' },
      { id: 'cable-tv', name: 'TV a cabo', icon: '📡' },
      { id: 'smart-tv', name: 'Smart TV', icon: '📱' },
      { id: 'streaming', name: 'Serviços de streaming (Netflix, etc)', icon: '🎬' },
      { id: 'dvd-player', name: 'DVD player', icon: '💿' },
      { id: 'sound-system', name: 'Sistema de som', icon: '🔊' },
      { id: 'bluetooth-speaker', name: 'Caixa de som Bluetooth', icon: '🔉' },
      { id: 'board-games', name: 'Jogos de tabuleiro', icon: '🎲' },
      { id: 'books', name: 'Livros', icon: '📚' },
      { id: 'video-games', name: 'Video games', icon: '🎮' },
      { id: 'piano', name: 'Piano', icon: '🎹' },
      { id: 'guitar', name: 'Violão', icon: '🎸' }
    ]
  },
  {
    id: 'internet-office',
    name: 'Internet e escritório',
    icon: '💻',
    amenities: [
      { id: 'wifi', name: 'Wi-Fi', icon: '📶' },
      { id: 'ethernet', name: 'Ethernet', icon: '🔌' },
      { id: 'workspace', name: 'Espaço de trabalho', icon: '💼' },
      { id: 'desk', name: 'Mesa de trabalho', icon: '🪑' },
      { id: 'office-chair', name: 'Cadeira de escritório', icon: '💺' },
      { id: 'printer', name: 'Impressora', icon: '🖨️' }
    ]
  },
  {
    id: 'bedroom-laundry',
    name: 'Quarto e Lavanderia',
    icon: '🛏️',
    amenities: [
      { id: 'bed-linen', name: 'Roupa de cama', icon: '🛏️' },
      { id: 'extra-pillows', name: 'Travesseiros extras', icon: '🛌' },
      { id: 'closet', name: 'Guarda-roupa', icon: '🚪' },
      { id: 'hangers', name: 'Cabides', icon: '👔' },
      { id: 'iron', name: 'Ferro de passar', icon: '🧺' },
      { id: 'ironing-board', name: 'Tábua de passar', icon: '📏' },
      { id: 'washer', name: 'Máquina de lavar', icon: '🧼' },
      { id: 'dryer', name: 'Secadora', icon: '💨' },
      { id: 'drying-rack', name: 'Varal', icon: '👕' }
    ]
  },
  {
    id: 'services-listing',
    name: 'Serviços',
    icon: '🧹',
    amenities: [
      { id: 'daily-cleaning', name: 'Limpeza diária', icon: '🧹' },
      { id: 'weekly-cleaning', name: 'Limpeza semanal', icon: '📅' },
      { id: 'change-bedding', name: 'Troca de roupa de cama', icon: '🛏️' },
      { id: 'change-towels', name: 'Troca de toalhas', icon: '🧖' },
      { id: 'room-service', name: 'Serviço de quarto', icon: '🛎️' },
      { id: 'breakfast-included', name: 'Café da manhã incluído', icon: '🥐' },
      { id: 'private-entrance', name: 'Entrada privativa', icon: '🚪' },
      { id: 'lockbox', name: 'Caixa de chaves', icon: '🔐' },
      { id: 'smart-lock', name: 'Fechadura inteligente', icon: '🔒' },
      { id: 'safe', name: 'Cofre', icon: '🔐' }
    ]
  },
  {
    id: 'safety-security',
    name: 'Segurança',
    icon: '🔒',
    amenities: [
      { id: 'smoke-detector', name: 'Detector de fumaça', icon: '🚨' },
      { id: 'carbon-detector', name: 'Detector de monóxido de carbono', icon: '⚠️' },
      { id: 'fire-extinguisher', name: 'Extintor de incêndio', icon: '🧯' },
      { id: 'first-aid-kit', name: 'Kit de primeiros socorros', icon: '🩹' },
      { id: 'security-cameras', name: 'Câmeras de segurança', icon: '📹' }
    ]
  },
  {
    id: 'family-friendly',
    name: 'Família',
    icon: '👶',
    amenities: [
      { id: 'crib', name: 'Berço', icon: '🍼' },
      { id: 'high-chair', name: 'Cadeira alta', icon: '🪑' },
      { id: 'baby-monitor', name: 'Babá eletrônica', icon: '📻' },
      { id: 'changing-table', name: 'Trocador', icon: '🧷' },
      { id: 'baby-bath', name: 'Banheira de bebê', icon: '🛁' },
      { id: 'toys', name: 'Brinquedos', icon: '🧸' }
    ]
  },
  {
    id: 'pets',
    name: 'Pets',
    icon: '🐾',
    amenities: [
      { id: 'pets-allowed', name: 'Pets permitidos', icon: '🐕' },
      { id: 'pet-bowl', name: 'Tigela para pet', icon: '🥣' },
      { id: 'pet-bed', name: 'Cama para pet', icon: '🛏️' }
    ]
  }
];

/**
 * Helper function para buscar amenidade por ID
 */
export function findAmenityById(id: string): Amenity | null {
  // Buscar em location amenities
  for (const category of LOCATION_AMENITIES) {
    const amenity = category.amenities.find(a => a.id === id);
    if (amenity) return amenity;
  }
  
  // Buscar em listing amenities
  for (const category of LISTING_AMENITIES) {
    const amenity = category.amenities.find(a => a.id === id);
    if (amenity) return amenity;
  }
  
  return null;
}

/**
 * Helper function para obter todas as amenidades (location + listing)
 */
export function getAllAmenities(): AmenityCategory[] {
  return [...LOCATION_AMENITIES, ...LISTING_AMENITIES];
}
