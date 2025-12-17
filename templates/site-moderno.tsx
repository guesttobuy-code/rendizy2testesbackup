// ============================================================
// TEMPLATE: SITE MODERNO
// ============================================================
// Design clean, minimalista, cores vibrantes
// Ideal para: Imobiliárias jovens, startups, público tech-savvy
// ============================================================

import { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Users, Star, Heart, Share2, ChevronRight, ChevronDown, Filter, SlidersHorizontal, X, Check } from 'lucide-react';
import { useRendizyData, useRendizyBooking } from '../components/ClientSiteWrapper';

// ============================================================
// SITE PRINCIPAL
// ============================================================

export default function SiteModerno() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <HeaderModerno />
      <HeroModerno />
      <BuscaAvancadaModerno />
      <ImoveisDestaque />
      <BeneficiosModerno />
      <DepoimentosModerno />
      <CTAModerno />
      <FooterModerno />
    </div>
  );
}

// ============================================================
// HEADER
// ============================================================

function HeaderModerno() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-lg shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-2xl">🏖️</span>
          </div>
          <div>
            <h1 className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Paradise Rentals
            </h1>
            <p className="text-xs text-gray-500">Seu refúgio perfeito</p>
          </div>
        </div>
        
        {/* Nav Desktop */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#imoveis" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
            Imóveis
          </a>
          <a href="#sobre" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
            Sobre
          </a>
          <a href="#depoimentos" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
            Depoimentos
          </a>
          <a href="#contato" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
            Contato
          </a>
        </nav>

        {/* CTA */}
        <button className="hidden md:block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full hover:shadow-xl transition-all transform hover:scale-105">
          Reservar Agora
        </button>
      </div>
    </header>
  );
}

// ============================================================
// HERO
// ============================================================

function HeroModerno() {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-pink-600/10"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Texto */}
          <div>
            <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm mb-6">
              ✨ Mais de 100 imóveis disponíveis
            </div>
            
            <h2 className="text-6xl mb-6 leading-tight">
              Encontre seu
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Paraíso Pessoal
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 mb-8">
              Casas de praia, apartamentos luxuosos e experiências inesquecíveis.
              Reserve direto com proprietários verificados.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full hover:shadow-2xl transition-all transform hover:scale-105 flex items-center gap-2">
                Explorar Imóveis
                <ChevronRight className="h-5 w-5" />
              </button>
              <button className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-full hover:border-blue-600 hover:text-blue-600 transition-all">
                Como Funciona
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12">
              <div>
                <p className="text-3xl text-blue-600 mb-1">100+</p>
                <p className="text-sm text-gray-600">Imóveis</p>
              </div>
              <div>
                <p className="text-3xl text-purple-600 mb-1">5000+</p>
                <p className="text-sm text-gray-600">Hóspedes</p>
              </div>
              <div>
                <p className="text-3xl text-pink-600 mb-1">4.9</p>
                <p className="text-sm text-gray-600">Avaliação</p>
              </div>
            </div>
          </div>

          {/* Imagem/Cards */}
          <div className="relative">
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-blue-400 to-purple-500 shadow-2xl overflow-hidden">
              {/* Aqui você pode adicionar uma imagem real */}
            </div>
            
            {/* Floating Card */}
            <div className="absolute bottom-8 left-8 bg-white rounded-2xl shadow-2xl p-6 max-w-xs">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white">
                  ✓
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reserva Confirmada</p>
                  <p className="text-lg">Casa Vista Mar</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                20-27 Dez 2025
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// BUSCA AVANÇADA
// ============================================================

function BuscaAvancadaModerno() {
  const [showFilters, setShowFilters] = useState(false);
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);

  const { searchProperties } = useRendizyData();

  const handleSearch = async () => {
    const results = await searchProperties({ location, checkIn, checkOut, guests });
    console.log('Resultados:', results);
  };

  return (
    <section className="py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          {/* Busca Principal */}
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <label className="block text-sm mb-2 text-gray-700">Localização</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-600" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Para onde?"
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm mb-2 text-gray-700">Check-in</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-600" />
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm mb-2 text-gray-700">Check-out</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-600" />
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm mb-2 text-gray-700">Hóspedes</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-600" />
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                >
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'hóspede' : 'hóspedes'}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-6 py-3 border-2 border-gray-200 rounded-2xl hover:border-blue-600 hover:text-blue-600 transition-all"
            >
              <SlidersHorizontal className="h-5 w-5" />
              Filtros
              {showFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            <button
              onClick={handleSearch}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <Search className="h-5 w-5" />
              Buscar Imóveis
            </button>
          </div>

          {/* Filtros Avançados */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200 grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm mb-2 text-gray-700">Tipo</label>
                <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500">
                  <option>Casa</option>
                  <option>Apartamento</option>
                  <option>Cobertura</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Quartos</label>
                <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500">
                  <option>Qualquer</option>
                  <option>1+</option>
                  <option>2+</option>
                  <option>3+</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Faixa de Preço</label>
                <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500">
                  <option>Qualquer</option>
                  <option>Até R$ 500</option>
                  <option>R$ 500 - R$ 1000</option>
                  <option>R$ 1000+</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// IMÓVEIS EM DESTAQUE
// ============================================================

function ImoveisDestaque() {
  const { properties, loading } = useRendizyData();

  if (loading) {
    return (
      <section className="py-20 px-6" id="imoveis">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded-lg w-64 mx-auto mb-4"></div>
            <div className="h-6 bg-gray-200 rounded-lg w-96 mx-auto"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6" id="imoveis">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-5xl mb-4">
            Imóveis em <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Destaque</span>
          </h2>
          <p className="text-xl text-gray-600">
            Selecionados especialmente para você
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.slice(0, 6).map((property) => (
            <CardImovelModerno key={property.id} property={property} />
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-full hover:bg-blue-600 hover:text-white transition-all transform hover:scale-105">
            Ver Todos os Imóveis
          </button>
        </div>
      </div>
    </section>
  );
}

function CardImovelModerno({ property }: { property: any }) {
  const [favorite, setFavorite] = useState(false);

  return (
    <div className="group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2">
      {/* Imagem */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={property.images?.[0] || 'https://images.unsplash.com/photo-1613490493576-7fde63acd811'}
          alt={property.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-sm">
            Destaque
          </span>
        </div>

        {/* Favorito */}
        <button
          onClick={() => setFavorite(!favorite)}
          className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Heart className={`h-5 w-5 ${favorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>

        {/* Avaliação */}
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm">4.9</span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-6">
        <h3 className="text-xl mb-2">{property.name}</h3>
        
        <p className="text-gray-600 mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-600" />
          {property.location}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <span>{property.bedrooms} quartos</span>
          <span>•</span>
          <span>{property.bathrooms} banheiros</span>
          <span>•</span>
          <span>{property.maxGuests} hóspedes</span>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-500">A partir de</p>
            <p className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              R$ {property.price}
              <span className="text-sm text-gray-600">/noite</span>
            </p>
          </div>
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full hover:shadow-xl transition-all transform hover:scale-105">
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BENEFÍCIOS
// ============================================================

function BeneficiosModerno() {
  const beneficios = [
    {
      icon: '🎯',
      title: 'Preço Direto',
      desc: 'Sem taxas de intermediação. Reserve direto com o proprietário.'
    },
    {
      icon: '✅',
      title: 'Verificado',
      desc: 'Todos os imóveis são verificados pela nossa equipe.'
    },
    {
      icon: '🔒',
      title: 'Seguro',
      desc: 'Pagamento seguro e proteção para hóspedes.'
    },
    {
      icon: '💬',
      title: 'Suporte 24/7',
      desc: 'Atendimento rápido sempre que você precisar.'
    }
  ];

  return (
    <section className="py-20 px-6 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl mb-4">
            Por que <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">escolher a gente?</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {beneficios.map((item, index) => (
            <div key={index} className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="text-5xl mb-4">{item.icon}</div>
              <h3 className="text-xl mb-3">{item.title}</h3>
              <p className="text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// DEPOIMENTOS
// ============================================================

function DepoimentosModerno() {
  const depoimentos = [
    {
      nome: 'Maria Silva',
      avatar: '👩',
      rating: 5,
      texto: 'Experiência incrível! Casa exatamente como nas fotos e atendimento impecável.'
    },
    {
      nome: 'João Santos',
      avatar: '👨',
      rating: 5,
      texto: 'Melhor plataforma de aluguel de temporada. Processo super fácil e rápido.'
    },
    {
      nome: 'Ana Costa',
      avatar: '👩',
      rating: 5,
      texto: 'Voltaremos com certeza! Propriedade linda e localização perfeita.'
    }
  ];

  return (
    <section className="py-20 px-6" id="depoimentos">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl mb-4">
            O que nossos <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">hóspedes dizem</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {depoimentos.map((item, index) => (
            <div key={index} className="bg-white rounded-3xl p-8 shadow-lg">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(item.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 text-lg">{item.texto}</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-2xl">
                  {item.avatar}
                </div>
                <div>
                  <p className="text-lg">{item.nome}</p>
                  <p className="text-sm text-gray-500">Hóspede verificado</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// CTA
// ============================================================

function CTAModerno() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white shadow-2xl">
        <h2 className="text-5xl mb-6">
          Pronto para sua próxima aventura?
        </h2>
        <p className="text-xl mb-8 text-blue-100">
          Encontre o imóvel perfeito e reserve em minutos
        </p>
        <button className="bg-white text-blue-600 px-10 py-5 rounded-full hover:shadow-2xl transition-all transform hover:scale-105 text-lg">
          Começar Agora
        </button>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER
// ============================================================

function FooterModerno() {
  return (
    <footer className="bg-gray-900 text-white py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <span className="text-xl">🏖️</span>
              </div>
              <h3 className="text-xl">Paradise</h3>
            </div>
            <p className="text-gray-400">
              Sua melhor escolha para aluguel de temporada
            </p>
          </div>

          <div>
            <h4 className="text-lg mb-4">Empresa</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg mb-4">Suporte</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg mb-4">Redes Sociais</h4>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                📘
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                📷
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                🐦
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
          <p>© 2025 Paradise Rentals. Powered by RENDIZY.</p>
        </div>
      </div>
    </footer>
  );
}
