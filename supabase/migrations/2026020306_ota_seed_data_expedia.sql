-- ============================================================================
-- RENDIZY - MODELO DE DADOS UNIVERSAL PARA OTAs
-- Migração 6: SEED DATA - Dados Iniciais de Mapeamento Expedia
-- ============================================================================
-- Versão: 1.0
-- Data: 2026-02-03
-- Objetivo: Popular tabelas com dados de mapeamento da Expedia como exemplo
-- ============================================================================

-- ============================================================================
-- 1. CANONICAL PROPERTY TYPES
-- ============================================================================
INSERT INTO canonical_property_types (id, name_pt, name_en, name_es, icon, typical_min_guests, typical_max_guests, display_order) VALUES
('apartment', 'Apartamento', 'Apartment', 'Apartamento', '🏢', 1, 6, 1),
('house', 'Casa', 'House', 'Casa', '🏠', 2, 12, 2),
('villa', 'Villa', 'Villa', 'Villa', '🏛️', 4, 20, 3),
('studio', 'Studio', 'Studio', 'Estudio', '🛋️', 1, 2, 4),
('loft', 'Loft', 'Loft', 'Loft', '🏙️', 1, 4, 5),
('cabin', 'Cabana', 'Cabin', 'Cabaña', '🏕️', 2, 8, 6),
('cottage', 'Chalé', 'Cottage', 'Cabaña', '🏡', 2, 6, 7),
('chalet', 'Chalé de Montanha', 'Mountain Chalet', 'Chalet', '⛷️', 4, 12, 8),
('bungalow', 'Bangalô', 'Bungalow', 'Bungalow', '🏖️', 2, 6, 9),
('townhouse', 'Sobrado', 'Townhouse', 'Casa Adosada', '🏘️', 4, 10, 10),
('condo', 'Condomínio', 'Condo', 'Condominio', '🏬', 1, 6, 11),
('penthouse', 'Cobertura', 'Penthouse', 'Ático', '🌆', 2, 8, 12),
('hotel_room', 'Quarto de Hotel', 'Hotel Room', 'Habitación de Hotel', '🛎️', 1, 4, 13),
('hostel', 'Hostel', 'Hostel', 'Hostal', '🛏️', 1, 8, 14),
('boat', 'Barco', 'Boat', 'Barco', '⛵', 2, 6, 15),
('treehouse', 'Casa na Árvore', 'Treehouse', 'Casa del Árbol', '🌳', 2, 4, 16),
('tent', 'Barraca/Glamping', 'Tent/Glamping', 'Tienda/Glamping', '⛺', 2, 4, 17),
('farm_stay', 'Fazenda', 'Farm Stay', 'Estancia', '🚜', 2, 10, 18)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt, name_en = EXCLUDED.name_en;

-- ============================================================================
-- 2. OTA PROPERTY TYPE MAPPINGS - EXPEDIA
-- Fonte: Expedia Rapid API Property Categories
-- NOTA: Cada ota_id só pode ter um mapeamento. Tipos similares (studio, penthouse)
-- são mapeados via canonical_property_types internamente.
-- ============================================================================
INSERT INTO ota_property_type_mappings (canonical_id, ota, ota_id, ota_name, notes) VALUES
-- Principais (um ota_id por linha - sem duplicatas)
('apartment', 'expedia', '15', 'Apartment', 'Categoria principal para apartamentos'),
('house', 'expedia', '17', 'House', 'Casa residencial'),
('villa', 'expedia', '29', 'Villa', 'Villa de luxo'),
('condo', 'expedia', '14', 'Condo', 'Condomínio'),
('cottage', 'expedia', '27', 'Cottage', 'Chalé'),
('chalet', 'expedia', '28', 'Chalet', 'Chalé de montanha'),
('cabin', 'expedia', '26', 'Cabin', 'Cabana'),
('bungalow', 'expedia', '4', 'Bungalow', 'Bangalô'),
('townhouse', 'expedia', '11', 'Townhouse', 'Sobrado'),
('hotel_room', 'expedia', '1', 'Hotel', 'Quarto de hotel'),
('hostel', 'expedia', '5', 'Hostel', 'Hostel'),
('boat', 'expedia', '3', 'Boat', 'Embarcação')
ON CONFLICT (ota, ota_id) DO UPDATE SET canonical_id = EXCLUDED.canonical_id, ota_name = EXCLUDED.ota_name;

-- Mapeamento Expedia → Rendizy (reverso) para IDs que não temos
-- NOTA: Constraint (ota, canonical_id) permite apenas 1 mapeamento por tipo canônico.
-- Tipos adicionais da Expedia são listados como comentário para referência futura.
INSERT INTO ota_property_type_mappings (canonical_id, ota, ota_id, ota_name, notes) VALUES
('farm_stay', 'expedia', '19', 'Ranch', 'Rancho/Fazenda'),
('tent', 'expedia', '30', 'Campground', 'Camping/Glamping'),
('treehouse', 'expedia', '33', 'Tree house', 'Casa na árvore'),
('loft', 'expedia', '34', 'Loft', 'Loft'),
('studio', 'expedia', '35', 'Studio', 'Studio'),
('penthouse', 'expedia', '36', 'Penthouse', 'Cobertura')
ON CONFLICT (ota, ota_id) DO NOTHING;

-- Referência: Outros tipos Expedia mapeados internamente:
-- ota_id=2 (Motel), 6 (Resort), 8 (B&B), 10 (All-inclusive), 25 (Ryokan) → hotel_room
-- ota_id=7 (Inn), 20 (Pension), 31 (Lodge) → hostel  
-- ota_id=9 (Guest House), 12 (Aparthotel), 13 (Condo Resort), 22 (Apart-hotel) → apartment
-- ota_id=18 (Vacation Home), 21 (Castle), 23 (Country House), 24 (Manor), 32 (Riad) → house

-- ============================================================================
-- 3. CANONICAL BED TYPES
-- ============================================================================
INSERT INTO canonical_bed_types (id, name_pt, name_en, name_es, width_cm, typical_capacity, display_order) VALUES
('single', 'Solteiro', 'Single', 'Individual', 90, 1, 1),
('double', 'Casal', 'Double', 'Doble', 140, 2, 2),
('queen', 'Queen', 'Queen', 'Queen', 160, 2, 3),
('king', 'King', 'King', 'King', 200, 2, 4),
('super_king', 'Super King', 'Super King', 'Super King', 220, 2, 5),
('twin', 'Twin (2 solteiros)', 'Twin', 'Twin', 90, 2, 6),
('bunk', 'Beliche', 'Bunk Bed', 'Litera', 90, 2, 7),
('sofa_bed', 'Sofá-cama', 'Sofa Bed', 'Sofá Cama', 140, 2, 8),
('futon', 'Futon', 'Futon', 'Futón', 140, 2, 9),
('murphy', 'Cama Retrátil', 'Murphy Bed', 'Cama Abatible', 140, 2, 10),
('toddler', 'Berço', 'Crib/Toddler Bed', 'Cuna', 70, 1, 11),
('air_mattress', 'Colchão Inflável', 'Air Mattress', 'Colchón Inflable', 140, 2, 12)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt;

-- ============================================================================
-- 4. OTA BED TYPE MAPPINGS - EXPEDIA
-- ============================================================================
INSERT INTO ota_bed_type_mappings (canonical_id, ota, ota_id, ota_name, ota_size) VALUES
('single', 'expedia', 'single', 'Single Bed', 'Single'),
('double', 'expedia', 'double', 'Double Bed', 'Double'),
('queen', 'expedia', 'queen', 'Queen Bed', 'Queen'),
('king', 'expedia', 'king', 'King Bed', 'King'),
('super_king', 'expedia', 'super_king', 'Super King Bed', 'Super King'),
('twin', 'expedia', 'twin', 'Twin Beds', 'Twin'),
('bunk', 'expedia', 'bunk', 'Bunk Bed', NULL),
('sofa_bed', 'expedia', 'sofa_bed', 'Sofa Bed', NULL),
('futon', 'expedia', 'futon', 'Futon', NULL),
('murphy', 'expedia', 'murphy', 'Murphy Bed', NULL),
('toddler', 'expedia', 'crib', 'Crib', NULL)
ON CONFLICT (ota, ota_id) DO UPDATE SET canonical_id = EXCLUDED.canonical_id;

-- ============================================================================
-- 5. CANONICAL ROOM TYPES
-- ============================================================================
INSERT INTO canonical_room_types (id, name_pt, name_en, name_es, description_pt, display_order) VALUES
('standard', 'Quarto Standard', 'Standard Room', 'Habitación Estándar', 'Quarto padrão', 1),
('suite', 'Suíte', 'Suite', 'Suite', 'Suíte com área de estar', 2),
('master', 'Suíte Master', 'Master Suite', 'Suite Principal', 'Suíte principal com banheiro privativo', 3),
('deluxe', 'Quarto Deluxe', 'Deluxe Room', 'Habitación Deluxe', 'Quarto superior', 4),
('studio', 'Studio', 'Studio', 'Estudio', 'Ambiente integrado', 5),
('bedroom', 'Quarto', 'Bedroom', 'Dormitorio', 'Quarto individual', 6),
('living_room', 'Sala de Estar', 'Living Room', 'Sala de Estar', 'Área social', 7),
('kitchen', 'Cozinha', 'Kitchen', 'Cocina', 'Área de preparo', 8),
('bathroom', 'Banheiro', 'Bathroom', 'Baño', 'Sanitário', 9),
('balcony', 'Varanda', 'Balcony', 'Balcón', 'Área externa', 10)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt;

-- ============================================================================
-- 6. CANONICAL ROOM VIEWS
-- ============================================================================
INSERT INTO canonical_room_views (id, name_pt, name_en, name_es, icon, display_order) VALUES
('sea', 'Vista para o Mar', 'Sea View', 'Vista al Mar', '🌊', 1),
('ocean', 'Vista para o Oceano', 'Ocean View', 'Vista al Océano', '🌅', 2),
('beach', 'Vista para a Praia', 'Beach View', 'Vista a la Playa', '🏖️', 3),
('mountain', 'Vista para a Montanha', 'Mountain View', 'Vista a la Montaña', '⛰️', 4),
('city', 'Vista para a Cidade', 'City View', 'Vista a la Ciudad', '🏙️', 5),
('garden', 'Vista para o Jardim', 'Garden View', 'Vista al Jardín', '🌳', 6),
('pool', 'Vista para a Piscina', 'Pool View', 'Vista a la Piscina', '🏊', 7),
('courtyard', 'Vista para o Pátio', 'Courtyard View', 'Vista al Patio', '🏛️', 8),
('river', 'Vista para o Rio', 'River View', 'Vista al Río', '🏞️', 9),
('lake', 'Vista para o Lago', 'Lake View', 'Vista al Lago', '💧', 10),
('park', 'Vista para o Parque', 'Park View', 'Vista al Parque', '🌲', 11),
('street', 'Vista para a Rua', 'Street View', 'Vista a la Calle', '🛣️', 12),
('none', 'Sem Vista', 'No View', 'Sin Vista', '🪟', 99)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt;

-- ============================================================================
-- 7. OTA ROOM VIEW MAPPINGS - EXPEDIA
-- ============================================================================
INSERT INTO ota_room_view_mappings (canonical_id, ota, ota_id, ota_name) VALUES
('sea', 'expedia', '4134', 'Sea view'),
('ocean', 'expedia', '4145', 'Ocean view'),
('beach', 'expedia', '4168', 'Beach view'),
('mountain', 'expedia', '4146', 'Mountain view'),
('city', 'expedia', '4147', 'City view'),
('garden', 'expedia', '4148', 'Garden view'),
('pool', 'expedia', '4149', 'Pool view'),
('courtyard', 'expedia', '4171', 'Courtyard view'),
('river', 'expedia', '4173', 'River view'),
('lake', 'expedia', '4172', 'Lake view'),
('park', 'expedia', '4170', 'Park view')
ON CONFLICT (ota, ota_id) DO UPDATE SET canonical_id = EXCLUDED.canonical_id;

-- ============================================================================
-- 8. CANONICAL IMAGE CATEGORIES
-- ============================================================================
INSERT INTO canonical_image_categories (id, name_pt, name_en, icon, applies_to, display_order) VALUES
('exterior', 'Fachada/Exterior', 'Exterior', '🏠', ARRAY['property', 'location'], 1),
('lobby', 'Lobby/Recepção', 'Lobby', '🚪', ARRAY['location'], 2),
('room', 'Quarto', 'Room', '🛏️', ARRAY['room'], 3),
('bathroom', 'Banheiro', 'Bathroom', '🚿', ARRAY['property', 'room'], 4),
('kitchen', 'Cozinha', 'Kitchen', '🍳', ARRAY['property'], 5),
('living_room', 'Sala de Estar', 'Living Room', '🛋️', ARRAY['property'], 6),
('dining', 'Sala de Jantar', 'Dining Area', '🍽️', ARRAY['property'], 7),
('pool', 'Piscina', 'Pool', '🏊', ARRAY['property', 'location'], 8),
('beach', 'Praia', 'Beach', '🏖️', ARRAY['location'], 9),
('fitness', 'Academia', 'Fitness', '💪', ARRAY['location'], 10),
('spa', 'Spa', 'Spa', '🧖', ARRAY['location'], 11),
('restaurant', 'Restaurante', 'Restaurant', '🍴', ARRAY['location'], 12),
('bar', 'Bar', 'Bar', '🍸', ARRAY['location'], 13),
('view', 'Vista', 'View', '🌅', ARRAY['property', 'room'], 14),
('balcony', 'Varanda', 'Balcony', '🌇', ARRAY['property'], 15),
('garden', 'Jardim', 'Garden', '🌳', ARRAY['property', 'location'], 16),
('parking', 'Estacionamento', 'Parking', '🅿️', ARRAY['location'], 17),
('amenity', 'Amenidade', 'Amenity', '✨', ARRAY['property', 'location'], 18),
('other', 'Outros', 'Other', '📷', ARRAY['property', 'room', 'location'], 99)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt;

-- ============================================================================
-- 9. OTA IMAGE CATEGORY MAPPINGS - EXPEDIA
-- Fonte: Expedia Content Image Categories
-- ============================================================================
INSERT INTO ota_image_category_mappings (canonical_id, ota, ota_id, ota_name) VALUES
('exterior', 'expedia', '1', 'Property Building'),
('lobby', 'expedia', '2', 'Lobby'),
('room', 'expedia', '3', 'Room'),
('bathroom', 'expedia', '4', 'Bathroom'),
('pool', 'expedia', '5', 'Pool'),
('fitness', 'expedia', '6', 'Fitness Facility'),
('spa', 'expedia', '7', 'Spa'),
('restaurant', 'expedia', '8', 'Restaurant'),
('bar', 'expedia', '9', 'Bar/Lounge'),
('view', 'expedia', '10', 'View from Hotel'),
('beach', 'expedia', '11', 'Beach'),
('garden', 'expedia', '12', 'Garden'),
('balcony', 'expedia', '13', 'Balcony'),
('living_room', 'expedia', '14', 'Living Area'),
('kitchen', 'expedia', '15', 'In-Room Kitchen'),
('dining', 'expedia', '16', 'In-Room Dining'),
('amenity', 'expedia', '17', 'In-Room Amenity'),
('other', 'expedia', '99', 'Other')
ON CONFLICT (ota, ota_id) DO UPDATE SET canonical_id = EXCLUDED.canonical_id;

-- ============================================================================
-- 10. CANONICAL RESERVATION STATUSES
-- ============================================================================
INSERT INTO canonical_reservation_statuses (id, name_pt, name_en, is_active_booking, is_final, allows_checkin, color, display_order) VALUES
('pending', 'Pendente', 'Pending', true, false, false, '#FFA500', 1),
('confirmed', 'Confirmada', 'Confirmed', true, false, true, '#4CAF50', 2),
('checked_in', 'Check-in Realizado', 'Checked In', true, false, false, '#2196F3', 3),
('checked_out', 'Check-out Realizado', 'Checked Out', false, true, false, '#9E9E9E', 4),
('cancelled', 'Cancelada', 'Cancelled', false, true, false, '#F44336', 5),
('no_show', 'No-Show', 'No Show', false, true, false, '#FF5722', 6),
('on_hold', 'Em Espera', 'On Hold', true, false, false, '#FF9800', 7),
('processing', 'Processando', 'Processing', true, false, false, '#9C27B0', 8)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt;

-- ============================================================================
-- 11. OTA RESERVATION STATUS MAPPINGS - EXPEDIA
-- ============================================================================
INSERT INTO ota_reservation_status_mappings (canonical_id, ota, ota_id, ota_name, direction) VALUES
('pending', 'expedia', 'pending', 'Pending', 'both'),
('confirmed', 'expedia', 'booked', 'Booked', 'import'),
('confirmed', 'expedia', 'confirmed', 'Confirmed', 'export'),
('checked_in', 'expedia', 'checked_in', 'Checked In', 'both'),
('checked_out', 'expedia', 'checked_out', 'Checked Out', 'both'),
('cancelled', 'expedia', 'cancelled', 'Cancelled', 'both'),
('cancelled', 'expedia', 'refunded', 'Refunded', 'import'),
('no_show', 'expedia', 'no_show', 'No Show', 'both')
ON CONFLICT (ota, ota_id, direction) DO UPDATE SET canonical_id = EXCLUDED.canonical_id;

-- ============================================================================
-- 12. CANONICAL PAYMENT TYPES
-- ============================================================================
INSERT INTO canonical_payment_types (id, name_pt, name_en, category, icon, display_order) VALUES
('visa', 'Visa', 'Visa', 'credit_card', '💳', 1),
('mastercard', 'Mastercard', 'Mastercard', 'credit_card', '💳', 2),
('amex', 'American Express', 'American Express', 'credit_card', '💳', 3),
('elo', 'Elo', 'Elo', 'credit_card', '💳', 4),
('hipercard', 'Hipercard', 'Hipercard', 'credit_card', '💳', 5),
('diners', 'Diners Club', 'Diners Club', 'credit_card', '💳', 6),
('discover', 'Discover', 'Discover', 'credit_card', '💳', 7),
('jcb', 'JCB', 'JCB', 'credit_card', '💳', 8),
('visa_debit', 'Visa Débito', 'Visa Debit', 'debit_card', '💳', 10),
('mastercard_debit', 'Mastercard Débito', 'Mastercard Debit', 'debit_card', '💳', 11),
('pix', 'PIX', 'PIX', 'bank_transfer', '📱', 20),
('boleto', 'Boleto Bancário', 'Bank Slip', 'bank_transfer', '📄', 21),
('bank_transfer', 'Transferência Bancária', 'Bank Transfer', 'bank_transfer', '🏦', 22),
('cash', 'Dinheiro', 'Cash', 'cash', '💵', 30),
('paypal', 'PayPal', 'PayPal', 'other', '🅿️', 40),
('apple_pay', 'Apple Pay', 'Apple Pay', 'other', '🍎', 41),
('google_pay', 'Google Pay', 'Google Pay', 'other', '📱', 42)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt;

-- ============================================================================
-- 13. OTA PAYMENT TYPE MAPPINGS - EXPEDIA
-- ============================================================================
INSERT INTO ota_payment_type_mappings (canonical_id, ota, ota_id, ota_name) VALUES
('visa', 'expedia', 'VI', 'Visa'),
('mastercard', 'expedia', 'MC', 'MasterCard'),
('amex', 'expedia', 'AX', 'American Express'),
('discover', 'expedia', 'DS', 'Discover'),
('diners', 'expedia', 'DC', 'Diners Club'),
('jcb', 'expedia', 'JC', 'JCB')
ON CONFLICT (ota, ota_id) DO UPDATE SET canonical_id = EXCLUDED.canonical_id;

-- ============================================================================
-- 14. CANONICAL FEE TYPES
-- ============================================================================
INSERT INTO canonical_fee_types (id, name_pt, name_en, name_es, is_mandatory, is_refundable, applies_to, display_order) VALUES
('cleaning', 'Taxa de Limpeza', 'Cleaning Fee', 'Tarifa de Limpieza', true, true, 'stay', 1),
('resort', 'Taxa de Resort', 'Resort Fee', 'Tarifa de Resort', true, false, 'stay', 2),
('service', 'Taxa de Serviço', 'Service Fee', 'Tarifa de Servicio', true, true, 'stay', 3),
('parking', 'Estacionamento', 'Parking Fee', 'Estacionamiento', false, true, 'stay', 4),
('pet', 'Taxa de Pet', 'Pet Fee', 'Tarifa de Mascota', false, true, 'stay', 5),
('extra_guest', 'Hóspede Extra', 'Extra Guest Fee', 'Huésped Extra', true, true, 'guest', 6),
('extra_bed', 'Cama Extra', 'Extra Bed Fee', 'Cama Extra', false, true, 'stay', 7),
('early_checkin', 'Check-in Antecipado', 'Early Check-in', 'Check-in Anticipado', false, true, 'stay', 8),
('late_checkout', 'Check-out Tardio', 'Late Check-out', 'Check-out Tardío', false, true, 'stay', 9),
('security_deposit', 'Caução', 'Security Deposit', 'Depósito de Seguridad', true, true, 'stay', 10),
('tourism_tax', 'Taxa de Turismo', 'Tourism Tax', 'Impuesto Turístico', true, false, 'guest', 11),
('city_tax', 'Taxa Municipal', 'City Tax', 'Impuesto Municipal', true, false, 'night', 12),
('breakfast', 'Café da Manhã', 'Breakfast', 'Desayuno', false, true, 'guest', 13),
('transfer', 'Transfer', 'Transfer', 'Traslado', false, true, 'stay', 14)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt;

-- ============================================================================
-- 15. OTA FEE TYPE MAPPINGS - EXPEDIA
-- ============================================================================
INSERT INTO ota_fee_type_mappings (canonical_id, ota, ota_id, ota_name, ota_calculation_type) VALUES
('cleaning', 'expedia', 'cleaning_fee', 'Cleaning fee', 'per_stay'),
('resort', 'expedia', 'resort_fee', 'Resort fee', 'per_night'),
('service', 'expedia', 'service_fee', 'Service fee', 'per_stay'),
('parking', 'expedia', 'parking_fee', 'Parking', 'per_night'),
('pet', 'expedia', 'pet_fee', 'Pet fee', 'per_stay'),
('extra_guest', 'expedia', 'extra_person_fee', 'Extra person fee', 'per_person_per_night'),
('early_checkin', 'expedia', 'early_checkin_fee', 'Early check-in fee', 'per_stay'),
('late_checkout', 'expedia', 'late_checkout_fee', 'Late check-out fee', 'per_stay'),
('security_deposit', 'expedia', 'damage_deposit', 'Damage deposit', 'per_stay'),
('breakfast', 'expedia', 'breakfast_fee', 'Breakfast', 'per_person_per_night')
ON CONFLICT (ota, ota_id) DO UPDATE SET canonical_id = EXCLUDED.canonical_id;

-- ============================================================================
-- 16. CANONICAL THEMES
-- ============================================================================
INSERT INTO canonical_themes (id, name_pt, name_en, name_es, icon, display_order) VALUES
('luxury', 'Luxo', 'Luxury', 'Lujo', '💎', 1),
('boutique', 'Boutique', 'Boutique', 'Boutique', '🎀', 2),
('romantic', 'Romântico', 'Romantic', 'Romántico', '💕', 3),
('family', 'Família', 'Family Friendly', 'Familiar', '👨‍👩‍👧‍👦', 4),
('beach', 'Praia', 'Beach', 'Playa', '🏖️', 5),
('mountain', 'Montanha', 'Mountain', 'Montaña', '⛰️', 6),
('city_center', 'Centro da Cidade', 'City Center', 'Centro de la Ciudad', '🏙️', 7),
('spa_wellness', 'Spa & Bem-Estar', 'Spa & Wellness', 'Spa y Bienestar', '🧘', 8),
('eco_friendly', 'Ecológico', 'Eco-Friendly', 'Ecológico', '🌱', 9),
('pet_friendly', 'Pet Friendly', 'Pet Friendly', 'Pet Friendly', '🐾', 10),
('business', 'Negócios', 'Business', 'Negocios', '💼', 11),
('golf', 'Golf', 'Golf', 'Golf', '⛳', 12),
('ski', 'Esqui', 'Ski', 'Esquí', '⛷️', 13),
('historic', 'Histórico', 'Historic', 'Histórico', '🏛️', 14),
('all_inclusive', 'All Inclusive', 'All Inclusive', 'Todo Incluido', '🌴', 15)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt;

-- ============================================================================
-- 17. OTA THEME MAPPINGS - EXPEDIA
-- ============================================================================
INSERT INTO ota_theme_mappings (canonical_id, ota, ota_id, ota_name) VALUES
('luxury', 'expedia', 'luxury', 'Luxury'),
('boutique', 'expedia', 'boutique', 'Boutique'),
('romantic', 'expedia', 'romantic', 'Romantic'),
('family', 'expedia', 'family', 'Family Friendly'),
('beach', 'expedia', 'beach', 'Beach'),
('spa_wellness', 'expedia', 'spa', 'Spa'),
('eco_friendly', 'expedia', 'eco', 'Eco-certified'),
('business', 'expedia', 'business', 'Business'),
('golf', 'expedia', 'golf', 'Golf'),
('ski', 'expedia', 'ski', 'Ski'),
('historic', 'expedia', 'historic', 'Historic'),
('all_inclusive', 'expedia', 'all_inclusive', 'All Inclusive')
ON CONFLICT (ota, ota_id) DO UPDATE SET canonical_id = EXCLUDED.canonical_id;

-- ============================================================================
-- 18. CANONICAL LANGUAGES
-- ============================================================================
INSERT INTO canonical_languages (id, name_pt, name_en, name_native, iso_639_1, display_order) VALUES
('pt-BR', 'Português (Brasil)', 'Portuguese (Brazil)', 'Português', 'pt', 1),
('en-US', 'Inglês (EUA)', 'English (US)', 'English', 'en', 2),
('es-ES', 'Espanhol', 'Spanish', 'Español', 'es', 3),
('fr-FR', 'Francês', 'French', 'Français', 'fr', 4),
('de-DE', 'Alemão', 'German', 'Deutsch', 'de', 5),
('it-IT', 'Italiano', 'Italian', 'Italiano', 'it', 6),
('ja-JP', 'Japonês', 'Japanese', '日本語', 'ja', 7),
('zh-CN', 'Chinês (Simplificado)', 'Chinese (Simplified)', '中文', 'zh', 8),
('ko-KR', 'Coreano', 'Korean', '한국어', 'ko', 9),
('ru-RU', 'Russo', 'Russian', 'Русский', 'ru', 10),
('ar-SA', 'Árabe', 'Arabic', 'العربية', 'ar', 11),
('nl-NL', 'Holandês', 'Dutch', 'Nederlands', 'nl', 12)
ON CONFLICT (id) DO UPDATE SET name_pt = EXCLUDED.name_pt;

-- ============================================================================
-- 19. OTA LANGUAGE MAPPINGS - EXPEDIA
-- ============================================================================
INSERT INTO ota_language_mappings (canonical_id, ota, ota_id, ota_name) VALUES
('pt-BR', 'expedia', 'pt_BR', 'Portuguese (Brazil)'),
('en-US', 'expedia', 'en_US', 'English (US)'),
('es-ES', 'expedia', 'es_ES', 'Spanish'),
('fr-FR', 'expedia', 'fr_FR', 'French'),
('de-DE', 'expedia', 'de_DE', 'German'),
('it-IT', 'expedia', 'it_IT', 'Italian'),
('ja-JP', 'expedia', 'ja_JP', 'Japanese'),
('zh-CN', 'expedia', 'zh_CN', 'Chinese (Simplified)'),
('ko-KR', 'expedia', 'ko_KR', 'Korean'),
('ru-RU', 'expedia', 'ru_RU', 'Russian'),
('ar-SA', 'expedia', 'ar_SA', 'Arabic'),
('nl-NL', 'expedia', 'nl_NL', 'Dutch')
ON CONFLICT (ota, ota_id) DO UPDATE SET canonical_id = EXCLUDED.canonical_id;

-- ============================================================================
-- 20. OTA CANCELLATION POLICY MAPPINGS - EXPEDIA
-- ============================================================================
INSERT INTO ota_cancellation_policy_mappings (template_id, ota, ota_policy_name, export_format) VALUES
('flexible', 'expedia', 'Free cancellation', '{"refundable": true, "free_cancellation_end_date": "1_day_before"}'),
('moderate', 'expedia', 'Partially refundable', '{"refundable": true, "free_cancellation_end_date": "5_days_before"}'),
('strict', 'expedia', 'Strict cancellation', '{"refundable": true, "free_cancellation_end_date": "7_days_before"}'),
('non_refundable', 'expedia', 'Non-refundable', '{"refundable": false}')
ON CONFLICT (ota, template_id) DO UPDATE SET export_format = EXCLUDED.export_format;

-- ============================================================================
COMMENT ON SCHEMA public IS 'Schema com modelo de dados universal para OTAs - Migração 6: Seed Data Expedia';
