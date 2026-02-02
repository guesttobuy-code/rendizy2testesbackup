-- ============================================================================
-- RENDIZY - MODELO DE DADOS UNIVERSAL PARA OTAs
-- Migração 7: SEED AMENITIES - Amenidades Canônicas e Mapeamento Expedia
-- ============================================================================
-- Versão: 1.0
-- Data: 2026-02-03
-- Objetivo: Tabela completa de amenidades com códigos Expedia
-- Fonte: Expedia Rapid Content API Amenities Reference
-- ============================================================================

-- ============================================================================
-- 1. AMENIDADES CANÔNICAS RENDIZY
-- Organizadas por categoria para facilitar gestão
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CATEGORIA: INTERNET & TECNOLOGIA
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('wifi', 'internet', 'Wi-Fi', 'WiFi', 'WiFi', '📶', 1),
('wifi_free', 'internet', 'Wi-Fi Gratuito', 'Free WiFi', 'WiFi Gratis', '📶', 2),
('wifi_paid', 'internet', 'Wi-Fi Pago', 'Paid WiFi', 'WiFi de Pago', '📶', 3),
('high_speed_internet', 'internet', 'Internet Alta Velocidade', 'High Speed Internet', 'Internet Alta Velocidad', '⚡', 4),
('wired_internet', 'internet', 'Internet a Cabo', 'Wired Internet', 'Internet por Cable', '🔌', 5),
('smart_tv', 'internet', 'Smart TV', 'Smart TV', 'Smart TV', '📺', 10),
('streaming_services', 'internet', 'Serviços de Streaming', 'Streaming Services', 'Servicios de Streaming', '🎬', 11),
('netflix', 'internet', 'Netflix', 'Netflix', 'Netflix', '🎬', 12),
('amazon_prime', 'internet', 'Amazon Prime', 'Amazon Prime', 'Amazon Prime', '🎬', 13),
('bluetooth_speaker', 'internet', 'Caixa de Som Bluetooth', 'Bluetooth Speaker', 'Altavoz Bluetooth', '🔊', 20)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: ESTACIONAMENTO
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('parking', 'parking', 'Estacionamento', 'Parking', 'Estacionamiento', '🅿️', 100),
('parking_free', 'parking', 'Estacionamento Gratuito', 'Free Parking', 'Estacionamiento Gratuito', '🅿️', 101),
('parking_paid', 'parking', 'Estacionamento Pago', 'Paid Parking', 'Estacionamiento de Pago', '🅿️', 102),
('parking_street', 'parking', 'Estacionamento na Rua', 'Street Parking', 'Estacionamiento en la Calle', '🚗', 103),
('parking_garage', 'parking', 'Garagem', 'Garage Parking', 'Garaje', '🏢', 104),
('parking_covered', 'parking', 'Estacionamento Coberto', 'Covered Parking', 'Estacionamiento Cubierto', '🏠', 105),
('parking_ev_charger', 'parking', 'Carregador de Carro Elétrico', 'EV Charger', 'Cargador de Vehículo Eléctrico', '⚡', 106),
('parking_accessible', 'parking', 'Estacionamento Acessível', 'Accessible Parking', 'Estacionamiento Accesible', '♿', 107),
('valet_parking', 'parking', 'Manobrista', 'Valet Parking', 'Servicio de Aparcacoches', '🚘', 108)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: PISCINA & ÁREA EXTERNA
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('pool', 'pool', 'Piscina', 'Pool', 'Piscina', '🏊', 200),
('pool_private', 'pool', 'Piscina Privativa', 'Private Pool', 'Piscina Privada', '🏊', 201),
('pool_shared', 'pool', 'Piscina Compartilhada', 'Shared Pool', 'Piscina Compartida', '🏊', 202),
('pool_heated', 'pool', 'Piscina Aquecida', 'Heated Pool', 'Piscina Climatizada', '🌡️', 203),
('pool_indoor', 'pool', 'Piscina Coberta', 'Indoor Pool', 'Piscina Interior', '🏊', 204),
('pool_outdoor', 'pool', 'Piscina ao Ar Livre', 'Outdoor Pool', 'Piscina Exterior', '☀️', 205),
('pool_infinity', 'pool', 'Piscina de Borda Infinita', 'Infinity Pool', 'Piscina Infinita', '🌊', 206),
('pool_rooftop', 'pool', 'Piscina no Terraço', 'Rooftop Pool', 'Piscina en la Azotea', '🌆', 207),
('pool_kids', 'pool', 'Piscina Infantil', 'Kids Pool', 'Piscina para Niños', '👶', 208),
('hot_tub', 'pool', 'Banheira de Hidromassagem', 'Hot Tub', 'Jacuzzi', '🛁', 210),
('jacuzzi', 'pool', 'Jacuzzi', 'Jacuzzi', 'Jacuzzi', '🛁', 211),
('sauna', 'pool', 'Sauna', 'Sauna', 'Sauna', '🧖', 212),
('steam_room', 'pool', 'Sauna a Vapor', 'Steam Room', 'Baño de Vapor', '♨️', 213)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: COZINHA
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('kitchen', 'kitchen', 'Cozinha', 'Kitchen', 'Cocina', '🍳', 300),
('kitchen_full', 'kitchen', 'Cozinha Completa', 'Full Kitchen', 'Cocina Completa', '🍳', 301),
('kitchenette', 'kitchen', 'Kitchenette', 'Kitchenette', 'Cocina Americana', '🍳', 302),
('refrigerator', 'kitchen', 'Geladeira', 'Refrigerator', 'Refrigerador', '🧊', 310),
('minibar', 'kitchen', 'Frigobar', 'Minibar', 'Minibar', '🍺', 311),
('microwave', 'kitchen', 'Microondas', 'Microwave', 'Microondas', '📻', 312),
('oven', 'kitchen', 'Forno', 'Oven', 'Horno', '🔥', 313),
('stove', 'kitchen', 'Fogão', 'Stove', 'Cocina', '🔥', 314),
('dishwasher', 'kitchen', 'Lava-louças', 'Dishwasher', 'Lavavajillas', '🍽️', 315),
('coffee_maker', 'kitchen', 'Cafeteira', 'Coffee Maker', 'Cafetera', '☕', 316),
('espresso_machine', 'kitchen', 'Máquina de Espresso', 'Espresso Machine', 'Máquina de Espresso', '☕', 317),
('kettle', 'kitchen', 'Chaleira', 'Kettle', 'Hervidor', '🫖', 318),
('toaster', 'kitchen', 'Torradeira', 'Toaster', 'Tostadora', '🍞', 319),
('blender', 'kitchen', 'Liquidificador', 'Blender', 'Licuadora', '🧃', 320),
('cookware', 'kitchen', 'Panelas e Utensílios', 'Cookware', 'Utensilios de Cocina', '🍳', 321),
('dishes', 'kitchen', 'Louças e Talheres', 'Dishes & Utensils', 'Vajilla y Cubiertos', '🍽️', 322),
('wine_glasses', 'kitchen', 'Taças de Vinho', 'Wine Glasses', 'Copas de Vino', '🍷', 323),
('barbecue', 'kitchen', 'Churrasqueira', 'BBQ/Grill', 'Barbacoa', '🍖', 330),
('outdoor_dining', 'kitchen', 'Área de Refeição Externa', 'Outdoor Dining', 'Comedor Exterior', '🪑', 331)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: QUARTO
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('air_conditioning', 'room', 'Ar-condicionado', 'Air Conditioning', 'Aire Acondicionado', '❄️', 400),
('heating', 'room', 'Aquecimento', 'Heating', 'Calefacción', '🔥', 401),
('ceiling_fan', 'room', 'Ventilador de Teto', 'Ceiling Fan', 'Ventilador de Techo', '💨', 402),
('fireplace', 'room', 'Lareira', 'Fireplace', 'Chimenea', '🔥', 403),
('blackout_curtains', 'room', 'Cortinas Blackout', 'Blackout Curtains', 'Cortinas Opacas', '🌙', 404),
('soundproofing', 'room', 'Isolamento Acústico', 'Soundproofing', 'Insonorización', '🔇', 405),
('safe', 'room', 'Cofre', 'Safe', 'Caja Fuerte', '🔒', 406),
('iron', 'room', 'Ferro de Passar', 'Iron', 'Plancha', '👔', 407),
('ironing_board', 'room', 'Tábua de Passar', 'Ironing Board', 'Tabla de Planchar', '👔', 408),
('closet', 'room', 'Armário', 'Closet', 'Armario', '🚪', 409),
('hangers', 'room', 'Cabides', 'Hangers', 'Perchas', '👕', 410),
('desk', 'room', 'Mesa de Trabalho', 'Desk', 'Escritorio', '💼', 411),
('workspace', 'room', 'Área de Trabalho', 'Workspace', 'Zona de Trabajo', '💻', 412)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: BANHEIRO
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('private_bathroom', 'bathroom', 'Banheiro Privativo', 'Private Bathroom', 'Baño Privado', '🚿', 500),
('shared_bathroom', 'bathroom', 'Banheiro Compartilhado', 'Shared Bathroom', 'Baño Compartido', '🚿', 501),
('bathtub', 'bathroom', 'Banheira', 'Bathtub', 'Bañera', '🛁', 502),
('shower', 'bathroom', 'Chuveiro', 'Shower', 'Ducha', '🚿', 503),
('rain_shower', 'bathroom', 'Chuveiro de Chuva', 'Rain Shower', 'Ducha de Lluvia', '🌧️', 504),
('bidet', 'bathroom', 'Bidê', 'Bidet', 'Bidé', '🚽', 505),
('hair_dryer', 'bathroom', 'Secador de Cabelo', 'Hair Dryer', 'Secador de Pelo', '💇', 506),
('toiletries', 'bathroom', 'Artigos de Higiene', 'Toiletries', 'Artículos de Tocador', '🧴', 507),
('shampoo', 'bathroom', 'Shampoo', 'Shampoo', 'Champú', '🧴', 508),
('body_wash', 'bathroom', 'Sabonete Líquido', 'Body Wash', 'Gel de Ducha', '🧼', 509),
('towels', 'bathroom', 'Toalhas', 'Towels', 'Toallas', '🛁', 510),
('bathrobes', 'bathroom', 'Roupões', 'Bathrobes', 'Albornoces', '🥋', 511),
('slippers', 'bathroom', 'Chinelos', 'Slippers', 'Zapatillas', '🥿', 512)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: LAVANDERIA
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('washer', 'laundry', 'Máquina de Lavar', 'Washer', 'Lavadora', '🧺', 600),
('dryer', 'laundry', 'Secadora', 'Dryer', 'Secadora', '🧺', 601),
('washer_dryer', 'laundry', 'Lava e Seca', 'Washer/Dryer', 'Lavadora-Secadora', '🧺', 602),
('laundry_service', 'laundry', 'Serviço de Lavanderia', 'Laundry Service', 'Servicio de Lavandería', '👔', 603),
('dry_cleaning', 'laundry', 'Lavagem a Seco', 'Dry Cleaning', 'Limpieza en Seco', '👔', 604),
('detergent', 'laundry', 'Sabão em Pó', 'Detergent', 'Detergente', '🧼', 605),
('clothesline', 'laundry', 'Varal', 'Clothesline', 'Tendedero', '👕', 606)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: ENTRETENIMENTO
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('tv', 'entertainment', 'TV', 'TV', 'TV', '📺', 700),
('cable_tv', 'entertainment', 'TV a Cabo', 'Cable TV', 'TV por Cable', '📺', 701),
('satellite_tv', 'entertainment', 'TV por Satélite', 'Satellite TV', 'TV por Satélite', '📡', 702),
('dvd_player', 'entertainment', 'DVD Player', 'DVD Player', 'Reproductor de DVD', '📀', 703),
('game_console', 'entertainment', 'Videogame', 'Game Console', 'Consola de Videojuegos', '🎮', 704),
('board_games', 'entertainment', 'Jogos de Tabuleiro', 'Board Games', 'Juegos de Mesa', '🎲', 705),
('books', 'entertainment', 'Livros', 'Books', 'Libros', '📚', 706),
('sound_system', 'entertainment', 'Sistema de Som', 'Sound System', 'Sistema de Sonido', '🔊', 707),
('piano', 'entertainment', 'Piano', 'Piano', 'Piano', '🎹', 708),
('pool_table', 'entertainment', 'Mesa de Sinuca', 'Pool Table', 'Mesa de Billar', '🎱', 709)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: FAMÍLIA & CRIANÇAS
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('baby_crib', 'family', 'Berço', 'Baby Crib', 'Cuna', '👶', 800),
('high_chair', 'family', 'Cadeirão', 'High Chair', 'Trona', '👶', 801),
('baby_bath', 'family', 'Banheira de Bebê', 'Baby Bath', 'Bañera de Bebé', '🛁', 802),
('baby_monitor', 'family', 'Monitor de Bebê', 'Baby Monitor', 'Monitor de Bebé', '📱', 803),
('changing_table', 'family', 'Trocador', 'Changing Table', 'Cambiador', '👶', 804),
('baby_safety', 'family', 'Segurança para Bebês', 'Baby Safety', 'Seguridad para Bebés', '🔒', 805),
('playground', 'family', 'Playground', 'Playground', 'Parque Infantil', '🛝', 806),
('toys', 'family', 'Brinquedos', 'Toys', 'Juguetes', '🧸', 807),
('kids_books', 'family', 'Livros Infantis', 'Children Books', 'Libros Infantiles', '📖', 808),
('baby_stroller', 'family', 'Carrinho de Bebê', 'Baby Stroller', 'Cochecito de Bebé', '👶', 809)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: PET FRIENDLY
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('pets_allowed', 'pets', 'Pets Permitidos', 'Pets Allowed', 'Mascotas Permitidas', '🐾', 900),
('dogs_allowed', 'pets', 'Cachorros Permitidos', 'Dogs Allowed', 'Perros Permitidos', '🐕', 901),
('cats_allowed', 'pets', 'Gatos Permitidos', 'Cats Allowed', 'Gatos Permitidos', '🐈', 902),
('pet_bowls', 'pets', 'Comedouro para Pets', 'Pet Bowls', 'Cuencos para Mascotas', '🥣', 903),
('pet_bed', 'pets', 'Cama para Pets', 'Pet Bed', 'Cama para Mascotas', '🛏️', 904),
('fenced_yard', 'pets', 'Quintal Cercado', 'Fenced Yard', 'Patio Cercado', '🏡', 905)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: ACESSIBILIDADE
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('wheelchair_accessible', 'accessibility', 'Acessível para Cadeirantes', 'Wheelchair Accessible', 'Accesible para Sillas de Ruedas', '♿', 1000),
('elevator', 'accessibility', 'Elevador', 'Elevator', 'Ascensor', '🛗', 1001),
('ground_floor', 'accessibility', 'Térreo', 'Ground Floor', 'Planta Baja', '🏠', 1002),
('accessible_bathroom', 'accessibility', 'Banheiro Acessível', 'Accessible Bathroom', 'Baño Accesible', '♿', 1003),
('grab_bars', 'accessibility', 'Barras de Apoio', 'Grab Bars', 'Barras de Apoyo', '🦯', 1004),
('roll_in_shower', 'accessibility', 'Chuveiro sem Degrau', 'Roll-in Shower', 'Ducha a Ras de Suelo', '🚿', 1005),
('visual_aids', 'accessibility', 'Auxílios Visuais', 'Visual Aids', 'Ayudas Visuales', '👁️', 1006),
('hearing_aids', 'accessibility', 'Auxílios Auditivos', 'Hearing Aids', 'Ayudas Auditivas', '👂', 1007)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: SEGURANÇA
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('smoke_detector', 'safety', 'Detector de Fumaça', 'Smoke Detector', 'Detector de Humo', '🚨', 1100),
('carbon_monoxide_detector', 'safety', 'Detector de CO', 'Carbon Monoxide Detector', 'Detector de CO', '⚠️', 1101),
('fire_extinguisher', 'safety', 'Extintor de Incêndio', 'Fire Extinguisher', 'Extintor', '🧯', 1102),
('first_aid_kit', 'safety', 'Kit de Primeiros Socorros', 'First Aid Kit', 'Botiquín', '🩹', 1103),
('security_cameras', 'safety', 'Câmeras de Segurança', 'Security Cameras', 'Cámaras de Seguridad', '📹', 1104),
('security_system', 'safety', 'Sistema de Segurança', 'Security System', 'Sistema de Seguridad', '🔐', 1105),
('deadbolt_lock', 'safety', 'Fechadura Extra', 'Deadbolt Lock', 'Cerrojo', '🔒', 1106),
('doorman', 'safety', 'Porteiro 24h', '24h Doorman', 'Portero 24h', '👮', 1107),
('gated_property', 'safety', 'Condomínio Fechado', 'Gated Property', 'Comunidad Cerrada', '🏘️', 1108)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: ÁREA EXTERNA
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('balcony', 'outdoor', 'Varanda', 'Balcony', 'Balcón', '🌅', 1200),
('terrace', 'outdoor', 'Terraço', 'Terrace', 'Terraza', '🏖️', 1201),
('patio', 'outdoor', 'Pátio', 'Patio', 'Patio', '🏡', 1202),
('garden', 'outdoor', 'Jardim', 'Garden', 'Jardín', '🌳', 1203),
('yard', 'outdoor', 'Quintal', 'Yard', 'Patio Trasero', '🌿', 1204),
('outdoor_furniture', 'outdoor', 'Móveis de Área Externa', 'Outdoor Furniture', 'Muebles de Exterior', '🪑', 1205),
('sun_loungers', 'outdoor', 'Espreguiçadeiras', 'Sun Loungers', 'Tumbonas', '🏖️', 1206),
('hammock', 'outdoor', 'Rede', 'Hammock', 'Hamaca', '🏝️', 1207),
('outdoor_shower', 'outdoor', 'Chuveiro Externo', 'Outdoor Shower', 'Ducha Exterior', '🚿', 1208),
('fire_pit', 'outdoor', 'Fogueira', 'Fire Pit', 'Hoguera', '🔥', 1209),
('beach_access', 'outdoor', 'Acesso à Praia', 'Beach Access', 'Acceso a la Playa', '🏖️', 1210),
('ski_in_out', 'outdoor', 'Ski-in/Ski-out', 'Ski-in/Ski-out', 'Ski-in/Ski-out', '⛷️', 1211)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: SERVIÇOS
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('concierge', 'services', 'Concierge', 'Concierge', 'Conserje', '🛎️', 1300),
('front_desk_24h', 'services', 'Recepção 24h', '24h Front Desk', 'Recepción 24h', '🏨', 1301),
('luggage_storage', 'services', 'Guarda-volumes', 'Luggage Storage', 'Consigna', '🧳', 1302),
('airport_shuttle', 'services', 'Transfer Aeroporto', 'Airport Shuttle', 'Traslado al Aeropuerto', '🚐', 1303),
('shuttle_service', 'services', 'Serviço de Shuttle', 'Shuttle Service', 'Servicio de Traslado', '🚌', 1304),
('room_service', 'services', 'Serviço de Quarto', 'Room Service', 'Servicio de Habitación', '🍽️', 1305),
('housekeeping', 'services', 'Limpeza Diária', 'Daily Housekeeping', 'Limpieza Diaria', '🧹', 1306),
('cleaning_available', 'services', 'Limpeza Disponível', 'Cleaning Available', 'Limpieza Disponible', '🧹', 1307),
('turndown_service', 'services', 'Serviço de Cobertura', 'Turndown Service', 'Servicio de Cobertura', '🛏️', 1308)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: ALIMENTAÇÃO
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('breakfast_included', 'food', 'Café da Manhã Incluído', 'Breakfast Included', 'Desayuno Incluido', '🥐', 1400),
('breakfast_available', 'food', 'Café da Manhã Disponível', 'Breakfast Available', 'Desayuno Disponible', '🍳', 1401),
('restaurant', 'food', 'Restaurante', 'Restaurant', 'Restaurante', '🍴', 1402),
('bar', 'food', 'Bar', 'Bar', 'Bar', '🍸', 1403),
('snack_bar', 'food', 'Lanchonete', 'Snack Bar', 'Snack Bar', '🍿', 1404),
('grocery_delivery', 'food', 'Entrega de Compras', 'Grocery Delivery', 'Entrega de Compras', '🛒', 1405),
('meal_delivery', 'food', 'Delivery de Refeições', 'Meal Delivery', 'Entrega de Comidas', '🍱', 1406)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: SPA & WELLNESS
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('spa', 'wellness', 'Spa', 'Spa', 'Spa', '💆', 1500),
('massage', 'wellness', 'Massagem', 'Massage', 'Masaje', '💆', 1501),
('gym', 'wellness', 'Academia', 'Gym', 'Gimnasio', '🏋️', 1502),
('fitness_center', 'wellness', 'Centro de Fitness', 'Fitness Center', 'Centro de Fitness', '💪', 1503),
('yoga_studio', 'wellness', 'Estúdio de Yoga', 'Yoga Studio', 'Estudio de Yoga', '🧘', 1504),
('tennis_court', 'wellness', 'Quadra de Tênis', 'Tennis Court', 'Pista de Tenis', '🎾', 1505),
('basketball_court', 'wellness', 'Quadra de Basquete', 'Basketball Court', 'Cancha de Baloncesto', '🏀', 1506),
('golf_course', 'wellness', 'Campo de Golf', 'Golf Course', 'Campo de Golf', '⛳', 1507),
('bike_rental', 'wellness', 'Aluguel de Bicicletas', 'Bike Rental', 'Alquiler de Bicicletas', '🚴', 1508)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ----------------------------------------------------------------------------
-- CATEGORIA: LOCALIZAÇÃO
-- ----------------------------------------------------------------------------
INSERT INTO canonical_amenities (id, category, name_pt, name_en, name_es, icon, display_order) VALUES
('beachfront', 'location', 'Beira-mar', 'Beachfront', 'Frente al Mar', '🏖️', 1600),
('oceanfront', 'location', 'De Frente para o Oceano', 'Oceanfront', 'Frente al Océano', '🌊', 1601),
('lakefront', 'location', 'De Frente para o Lago', 'Lakefront', 'Frente al Lago', '🏞️', 1602),
('waterfront', 'location', 'De Frente para a Água', 'Waterfront', 'Frente al Agua', '💧', 1603),
('city_center', 'location', 'Centro da Cidade', 'City Center', 'Centro de la Ciudad', '🏙️', 1604),
('near_beach', 'location', 'Próximo à Praia', 'Near Beach', 'Cerca de la Playa', '🏖️', 1605),
('near_downtown', 'location', 'Próximo ao Centro', 'Near Downtown', 'Cerca del Centro', '🏢', 1606),
('near_airport', 'location', 'Próximo ao Aeroporto', 'Near Airport', 'Cerca del Aeropuerto', '✈️', 1607),
('near_ski', 'location', 'Próximo à Pista de Ski', 'Near Ski Area', 'Cerca de Pistas de Esquí', '⛷️', 1608)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, icon = EXCLUDED.icon;

-- ============================================================================
-- 2. OTA AMENITY MAPPINGS - EXPEDIA
-- Códigos reais da Expedia Rapid API
-- ============================================================================

INSERT INTO ota_amenity_mappings (canonical_id, ota, ota_id, ota_name, ota_scope, notes) VALUES
-- INTERNET
('wifi', 'expedia', '2390', 'WiFi', 'property', NULL),
('wifi_free', 'expedia', '2391', 'Free WiFi', 'property', NULL),
('high_speed_internet', 'expedia', '1073743392', 'High-speed internet access', 'property', NULL),
('wired_internet', 'expedia', '1073743951', 'Wired Internet', 'room', NULL),

-- TV/STREAMING
('smart_tv', 'expedia', '6141', 'Smart TV', 'room', NULL),
('tv', 'expedia', '2025', 'TV', 'room', NULL),
('cable_tv', 'expedia', '13', 'Cable TV', 'room', NULL),
('satellite_tv', 'expedia', '16', 'Satellite TV', 'room', NULL),
('dvd_player', 'expedia', '2043', 'DVD player', 'room', NULL),
('streaming_services', 'expedia', '1073744426', 'Streaming service', 'room', NULL),
('netflix', 'expedia', '1073744443', 'Netflix', 'room', NULL),

-- ESTACIONAMENTO
('parking', 'expedia', '3', 'Parking', 'property', NULL),
('parking_free', 'expedia', '2806', 'Free parking', 'property', NULL),
('parking_paid', 'expedia', '2807', 'Paid parking', 'property', NULL),
('parking_garage', 'expedia', '2856', 'Garage parking', 'property', NULL),
('parking_ev_charger', 'expedia', '1073744254', 'Electric vehicle charging station', 'property', NULL),
('valet_parking', 'expedia', '2855', 'Valet parking', 'property', NULL),

-- PISCINA
('pool', 'expedia', '71', 'Pool', 'property', NULL),
('pool_private', 'expedia', '6214', 'Private pool', 'room', NULL),
('pool_heated', 'expedia', '1073743295', 'Heated pool', 'property', NULL),
('pool_indoor', 'expedia', '1073742952', 'Indoor pool', 'property', NULL),
('pool_outdoor', 'expedia', '1073743296', 'Outdoor pool', 'property', NULL),
('pool_infinity', 'expedia', '1073744112', 'Infinity pool', 'property', NULL),
('pool_rooftop', 'expedia', '1073744113', 'Rooftop pool', 'property', NULL),
('pool_kids', 'expedia', '1073742953', 'Childrens pool', 'property', NULL),
('hot_tub', 'expedia', '72', 'Hot tub', 'property', NULL),
('sauna', 'expedia', '2006', 'Sauna', 'property', NULL),
('steam_room', 'expedia', '1073743936', 'Steam room', 'property', NULL),
('jacuzzi', 'expedia', '2046', 'Jetted bathtub', 'room', NULL),

-- COZINHA
('kitchen', 'expedia', '2158', 'Kitchen', 'room', NULL),
('kitchen_full', 'expedia', '6176', 'Full kitchen', 'room', NULL),
('kitchenette', 'expedia', '2159', 'Kitchenette', 'room', NULL),
('refrigerator', 'expedia', '2057', 'Refrigerator', 'room', NULL),
('minibar', 'expedia', '2056', 'Minibar', 'room', NULL),
('microwave', 'expedia', '2163', 'Microwave', 'room', NULL),
('oven', 'expedia', '6162', 'Oven', 'room', NULL),
('stove', 'expedia', '6163', 'Stovetop', 'room', NULL),
('dishwasher', 'expedia', '2164', 'Dishwasher', 'room', NULL),
('coffee_maker', 'expedia', '2015', 'Coffee/tea maker', 'room', NULL),
('espresso_machine', 'expedia', '2142', 'Espresso maker', 'room', NULL),
('toaster', 'expedia', '6165', 'Toaster', 'room', NULL),
('cookware', 'expedia', '6167', 'Cookware/dishes/utensils', 'room', NULL),
('barbecue', 'expedia', '2180', 'BBQ grill', 'property', NULL),

-- AR E AQUECIMENTO
('air_conditioning', 'expedia', '2016', 'Air conditioning', 'room', NULL),
('heating', 'expedia', '2399', 'Heating', 'room', NULL),
('ceiling_fan', 'expedia', '2034', 'Ceiling fan', 'room', NULL),
('fireplace', 'expedia', '2039', 'Fireplace', 'room', NULL),

-- QUARTO
('blackout_curtains', 'expedia', '6171', 'Blackout drapes', 'room', NULL),
('soundproofing', 'expedia', '2176', 'Soundproof rooms', 'room', NULL),
('safe', 'expedia', '2062', 'Safe', 'room', NULL),
('iron', 'expedia', '2050', 'Iron', 'room', NULL),
('ironing_board', 'expedia', '2051', 'Ironing board', 'room', NULL),
('closet', 'expedia', '2192', 'Closet', 'room', NULL),
('desk', 'expedia', '2030', 'Desk', 'room', NULL),
('hangers', 'expedia', '1073743952', 'Hangers', 'room', NULL),

-- BANHEIRO
('private_bathroom', 'expedia', '2011', 'Private bathroom', 'room', NULL),
('bathtub', 'expedia', '2013', 'Bathtub', 'room', NULL),
('shower', 'expedia', '2061', 'Shower', 'room', NULL),
('rain_shower', 'expedia', '2191', 'Rainfall showerhead', 'room', NULL),
('bidet', 'expedia', '2012', 'Bidet', 'room', NULL),
('hair_dryer', 'expedia', '2045', 'Hair dryer', 'room', NULL),
('toiletries', 'expedia', '2068', 'Free toiletries', 'room', NULL),
('towels', 'expedia', '2067', 'Towels', 'room', NULL),
('bathrobes', 'expedia', '2009', 'Bathrobes', 'room', NULL),
('slippers', 'expedia', '2063', 'Slippers', 'room', NULL),

-- LAVANDERIA
('washer', 'expedia', '2070', 'Washer', 'room', NULL),
('dryer', 'expedia', '2071', 'Dryer', 'room', NULL),
('washer_dryer', 'expedia', '2145', 'Washer/Dryer', 'room', NULL),
('laundry_service', 'expedia', '2818', 'Laundry service', 'property', NULL),
('dry_cleaning', 'expedia', '2819', 'Dry cleaning', 'property', NULL),

-- FAMÍLIA
('baby_crib', 'expedia', '2020', 'Crib', 'room', NULL),
('high_chair', 'expedia', '2146', 'High chair', 'room', NULL),
('playground', 'expedia', '2823', 'Playground', 'property', NULL),
('baby_safety', 'expedia', '1073744217', 'Baby safety features', 'room', NULL),

-- PETS
('pets_allowed', 'expedia', '51', 'Pets allowed', 'property', NULL),
('dogs_allowed', 'expedia', '1073743317', 'Dogs allowed', 'property', NULL),

-- ACESSIBILIDADE
('wheelchair_accessible', 'expedia', '1073743370', 'Wheelchair accessible', 'property', NULL),
('elevator', 'expedia', '2065', 'Elevator', 'property', NULL),
('accessible_bathroom', 'expedia', '1073743937', 'Accessible bathroom', 'room', NULL),
('grab_bars', 'expedia', '1073743371', 'Grab bars in bathroom', 'room', NULL),
('roll_in_shower', 'expedia', '1073743372', 'Roll-in shower', 'room', NULL),

-- SEGURANÇA
('smoke_detector', 'expedia', '1073744105', 'Smoke detector', 'room', NULL),
('carbon_monoxide_detector', 'expedia', '1073744106', 'Carbon monoxide detector', 'room', NULL),
('fire_extinguisher', 'expedia', '1073744107', 'Fire extinguisher', 'room', NULL),
('first_aid_kit', 'expedia', '1073744108', 'First aid kit', 'property', NULL),
('security_system', 'expedia', '2858', 'Security', 'property', NULL),
('doorman', 'expedia', '2824', '24-hour front desk', 'property', NULL),

-- ÁREA EXTERNA
('balcony', 'expedia', '2008', 'Balcony', 'room', NULL),
('terrace', 'expedia', '2066', 'Terrace', 'room', NULL),
('patio', 'expedia', '2054', 'Patio', 'room', NULL),
('garden', 'expedia', '2805', 'Garden', 'property', NULL),
('outdoor_furniture', 'expedia', '2055', 'Patio furniture', 'room', NULL),
('hammock', 'expedia', '1073744194', 'Hammock', 'room', NULL),
('beach_access', 'expedia', '2838', 'Beach access', 'property', NULL),
('ski_in_out', 'expedia', '2116', 'Ski-in/ski-out', 'property', NULL),

-- SERVIÇOS
('concierge', 'expedia', '2804', 'Concierge services', 'property', NULL),
('front_desk_24h', 'expedia', '2825', '24-hour front desk', 'property', NULL),
('luggage_storage', 'expedia', '2830', 'Luggage storage', 'property', NULL),
('airport_shuttle', 'expedia', '2001', 'Airport shuttle', 'property', NULL),
('shuttle_service', 'expedia', '2810', 'Shuttle service', 'property', NULL),
('room_service', 'expedia', '2059', 'Room service', 'property', NULL),
('housekeeping', 'expedia', '2048', 'Daily housekeeping', 'property', NULL),

-- ALIMENTAÇÃO
('breakfast_included', 'expedia', '2003', 'Breakfast included', 'property', NULL),
('breakfast_available', 'expedia', '2851', 'Breakfast available', 'property', NULL),
('restaurant', 'expedia', '2854', 'Restaurant', 'property', NULL),
('bar', 'expedia', '2848', 'Bar/lounge', 'property', NULL),

-- SPA & FITNESS
('spa', 'expedia', '2125', 'Spa', 'property', NULL),
('massage', 'expedia', '2833', 'Massage', 'property', NULL),
('gym', 'expedia', '2844', 'Gym', 'property', NULL),
('fitness_center', 'expedia', '2845', 'Fitness center', 'property', NULL),
('tennis_court', 'expedia', '2127', 'Tennis court', 'property', NULL),
('golf_course', 'expedia', '2842', 'Golf course', 'property', NULL),
('bike_rental', 'expedia', '2802', 'Bike rental', 'property', NULL),

-- LOCALIZAÇÃO
('beachfront', 'expedia', '2836', 'Beachfront', 'property', NULL),
('waterfront', 'expedia', '2839', 'Waterfront', 'property', NULL)

ON CONFLICT (ota, ota_id) DO UPDATE SET canonical_id = EXCLUDED.canonical_id, ota_name = EXCLUDED.ota_name, ota_scope = EXCLUDED.ota_scope;

-- ============================================================================
COMMENT ON SCHEMA public IS 'Schema com modelo de dados universal para OTAs - Migração 7: Seed Amenities';
