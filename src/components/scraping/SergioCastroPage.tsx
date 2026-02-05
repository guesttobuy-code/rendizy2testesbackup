/**
 * 🏠 PÁGINA SERGIO CASTRO - POC SCRAPING
 * 
 * Exibe imóvel extraído do site Sergio Castro Imóveis
 * Rota: /sergiocastro ou /sergiocastro/:code
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSupabaseClient } from '../../../utils/supabase/client';
import { 
  MapPin, Bed, Bath, Car, Square, 
  ChevronLeft, ChevronRight, X, ExternalLink,
  Building2, FileText, CheckCircle2,
  Loader2, AlertCircle, ArrowLeft
} from 'lucide-react';
import { cn } from '../../../components/ui/utils';

interface ScrapedProperty {
  id: string;
  code: string;
  title: string;
  address: string;
  price: number;
  condominio: number;
  iptu: number;
  iptu_parcelas: number;
  area_sqm: number;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parking_spots: number;
  living_rooms: number;
  description: string;
  amenities: string[];
  images: string[];
  images_base64: { url: string; base64: string; order: number }[];
  property_type: string;
  neighborhood: string;
  city: string;
  state: string;
  purpose: string;
  source: string;
  source_url: string;
  scraped_at: string;
}

export function SergioCastroPage() {
  const { code } = useParams<{ code?: string }>();
  const [property, setProperty] = useState<ScrapedProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    loadProperty();
  }, [code]);

  async function loadProperty() {
    setLoading(true);
    setError(null);

    try {
      // Primeiro tentar carregar do Supabase
      const supabase = getSupabaseClient();
      let query = supabase
        .from('scraped_properties')
        .select('*')
        .eq('source', 'sergiocastro');

      if (code) {
        query = query.eq('code', code);
      }

      const { data, error: queryError } = await query.limit(1).single();

      if (queryError) {
        // Fallback: carregar do JSON local (para POC)
        console.log('⚠️ Supabase não disponível, usando JSON local...');
        const response = await fetch('/scraped_property.json');
        if (response.ok) {
          const jsonData = await response.json();
          // Converter formato do JSON para formato esperado
          setProperty({
            id: 'local-1',
            code: jsonData.code,
            title: jsonData.title?.replace(/[\t\n]+/g, ' ').trim() || 'Imóvel',
            address: jsonData.address?.replace(/[\t\n]+/g, ' ').trim() || '',
            price: jsonData.price || 0,
            condominio: jsonData.condominio || 0,
            iptu: jsonData.iptu || 0,
            iptu_parcelas: jsonData.iptuParcelas || 0,
            area_sqm: jsonData.area || 106, // Valor do anúncio
            bedrooms: jsonData.quartos || 3,
            suites: jsonData.suites || 1,
            bathrooms: jsonData.banheiros || 2,
            parking_spots: jsonData.vagas || 1,
            living_rooms: jsonData.salas || 1,
            description: jsonData.descricao || '',
            amenities: jsonData.comodidades || [],
            images: jsonData.images || [],
            images_base64: jsonData.imagesBase64 || [],
            property_type: jsonData.tipo || 'apartamento',
            neighborhood: jsonData.bairro || 'Copacabana',
            city: jsonData.cidade || 'Rio de Janeiro',
            state: jsonData.estado || 'RJ',
            purpose: jsonData.finalidade || 'venda',
            source: jsonData.source || 'sergiocastro',
            source_url: jsonData.sourceUrl || '',
            scraped_at: new Date().toISOString()
          });
          return;
        }
        if (queryError.code === 'PGRST116') {
          setError('Nenhum imóvel encontrado. Execute o scraper primeiro.');
        } else {
          throw queryError;
        }
        return;
      }

      setProperty(data);
    } catch (err: any) {
      console.error('Erro ao carregar:', err);
      setError(err.message || 'Erro ao carregar imóvel');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  function getImageUrl(index: number): string {
    if (!property) return '';
    
    // Preferir base64 se disponível
    if (property.images_base64?.[index]?.base64) {
      return property.images_base64[index].base64;
    }
    
    // Fallback para URL original
    return property.images?.[index] || '';
  }

  function nextImage() {
    if (!property) return;
    const total = property.images_base64?.length || property.images?.length || 0;
    setSelectedImage((prev) => (prev + 1) % total);
  }

  function prevImage() {
    if (!property) return;
    const total = property.images_base64?.length || property.images?.length || 0;
    setSelectedImage((prev) => (prev - 1 + total) % total);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando imóvel...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Imóvel não encontrado
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'Execute o scraper para extrair dados do Sergio Castro.'}
          </p>
          <div className="space-y-3">
            <Link
              to="/calendario"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Sistema
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Execute: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">node scripts/scrape-sergiocastro.cjs</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalImages = property.images_base64?.length || property.images?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/calendario"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">
                POC Scraping
              </p>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sergio Castro Imóveis
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium rounded-full">
              ✓ Dados Extraídos
            </span>
            <a
              href={property.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Ver Original
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Coluna Principal - Galeria e Descrição */}
          <div className="lg:col-span-2 space-y-6">
            {/* Galeria de Imagens */}
            {totalImages > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg">
                {/* Imagem Principal */}
                <div 
                  className="relative aspect-[16/10] cursor-pointer group"
                  onClick={() => setShowLightbox(true)}
                >
                  <img
                    src={getImageUrl(selectedImage)}
                    alt={`${property.title} - Foto ${selectedImage + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  
                  {/* Navegação */}
                  {totalImages > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); prevImage(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); nextImage(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}
                  
                  {/* Contador */}
                  <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/70 text-white text-sm rounded-full">
                    {selectedImage + 1} / {totalImages}
                  </div>
                </div>

                {/* Thumbnails */}
                {totalImages > 1 && (
                  <div className="p-4 flex gap-2 overflow-x-auto">
                    {Array.from({ length: Math.min(totalImages, 10) }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={cn(
                          "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                          selectedImage === index
                            ? "border-blue-500 ring-2 ring-blue-500/30"
                            : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                        )}
                      >
                        <img
                          src={getImageUrl(index)}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Título e Endereço */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full mb-3">
                    Código: {property.code}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {property.title}
                  </h2>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin className="h-5 w-5" />
                    <span>{property.address}</span>
                  </div>
                </div>
              </div>

              {/* Características */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Bed className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Quartos</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {property.bedrooms} ({property.suites} suíte{property.suites !== 1 ? 's' : ''})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Bath className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Banheiros</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{property.bathrooms}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Car className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Vagas</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{property.parking_spots}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Square className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Área</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{property.area_sqm}m²</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Descrição */}
            {property.description && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Descrição
                </h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                  {property.description}
                </p>
              </div>
            )}

            {/* Comodidades */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Comodidades
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {property.amenities.map((amenity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Preço e Custos */}
          <div className="space-y-6">
            {/* Card de Preço */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg sticky top-24">
              <div className="mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-1">Valor de Venda</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-500">
                  {formatCurrency(property.price)}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Condomínio</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(property.condominio)}/mês
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">IPTU</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {property.iptu_parcelas}x de {formatCurrency(property.iptu)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Preço/m²</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(property.price / property.area_sqm)}/m²
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Entrar em Contato
                </button>
                <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors">
                  Agendar Visita
                </button>
              </div>
            </div>

            {/* Info do Scraping */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                📊 Dados do Scraping
              </h4>
              <div className="space-y-2 text-sm">
                <p className="text-blue-700 dark:text-blue-300">
                  <strong>Fonte:</strong> {property.source}
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  <strong>Extraído em:</strong> {new Date(property.scraped_at).toLocaleString('pt-BR')}
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  <strong>Imagens:</strong> {totalImages} fotos baixadas
                </p>
              </div>
              
              {/* Link Original */}
              {property.source_url && (
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide mb-2">
                    Link Original do Anúncio
                  </p>
                  <a
                    href={property.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 break-all"
                  >
                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    <span className="underline">{property.source_url}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox */}
      {showLightbox && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setShowLightbox(false)}
        >
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-8 w-8" />
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronLeft className="h-8 w-8 text-white" />
          </button>
          
          <img
            src={getImageUrl(selectedImage)}
            alt={`${property.title} - Foto ${selectedImage + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          <button
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronRight className="h-8 w-8 text-white" />
          </button>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 text-white rounded-full">
            {selectedImage + 1} / {totalImages}
          </div>
        </div>
      )}
    </div>
  );
}

export default SergioCastroPage;
