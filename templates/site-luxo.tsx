// ============================================================
// TEMPLATE: SITE LUXO
// ============================================================
// Design premium, elegante, sofisticado
// Ideal para: Imobiliárias de alto padrão, propriedades exclusivas
// ============================================================

import { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Users, Star, Sparkles, Crown, Diamond, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRendizyData, useRendizyBooking } from '../components/ClientSiteWrapper';

// ============================================================
// SITE PRINCIPAL
// ============================================================

export default function SiteLuxo() {
  return (
    <div className="min-h-screen bg-black text-white">
      <HeaderLuxo />
      <HeroLuxo />
      <BuscaLuxo />
      <ColecaoExclusiva />
      <ExperienciaLuxo />
      <TestemunhosLuxo />
      <ContatoVIP />
      <FooterLuxo />
    </div>
  );
}

// ============================================================
// HEADER
// ============================================================

function HeaderLuxo() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-black/95 backdrop-blur-xl border-b border-gold-500/20' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <Diamond className="h-8 w-8 text-yellow-600" />
          <div>
            <h1 className="text-2xl tracking-wider">
              <span className="text-yellow-600">PRESTIGE</span>
              <span className="text-white ml-2">COLLECTION</span>
            </h1>
            <p className="text-xs text-gray-400 tracking-widest uppercase">Luxury Vacation Rentals</p>
          </div>
        </div>
        
        {/* Nav */}
        <nav className="hidden md:flex items-center gap-10">
          <a href="#colecao" className="text-gray-300 hover:text-yellow-600 transition-colors tracking-wide">
            Coleção
          </a>
          <a href="#experiencia" className="text-gray-300 hover:text-yellow-600 transition-colors tracking-wide">
            Experiência
          </a>
          <a href="#testemunhos" className="text-gray-300 hover:text-yellow-600 transition-colors tracking-wide">
            Testemunhos
          </a>
          <a href="#contato" className="text-gray-300 hover:text-yellow-600 transition-colors tracking-wide">
            Contato
          </a>
        </nav>

        {/* CTA */}
        <button className="hidden md:flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black px-6 py-3 rounded-sm hover:shadow-2xl hover:shadow-yellow-600/50 transition-all">
          <Crown className="h-4 w-4" />
          <span className="tracking-wide">Atendimento VIP</span>
        </button>
      </div>
    </header>
  );
}

// ============================================================
// HERO
// ============================================================

function HeroLuxo() {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black"></div>
      
      {/* Animated Overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-600/20 via-transparent to-yellow-600/20 animate-pulse"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-yellow-600/50 bg-yellow-600/10 backdrop-blur px-6 py-3 rounded-sm mb-8">
          <Sparkles className="h-4 w-4 text-yellow-600" />
          <span className="text-yellow-600 tracking-widest uppercase text-sm">Propriedades Exclusivas</span>
        </div>

        {/* Título */}
        <h2 className="text-7xl mb-8 leading-tight tracking-tight">
          Experiências
          <span className="block bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
            Inesquecíveis
          </span>
        </h2>

        <p className="text-2xl text-gray-300 mb-12 leading-relaxed max-w-3xl mx-auto">
          Descubra nossa seleção exclusiva de propriedades de ultra-luxo. 
          Cada detalhe pensado para oferecer uma experiência única.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-6 justify-center">
          <button className="group bg-gradient-to-r from-yellow-600 to-yellow-500 text-black px-10 py-5 rounded-sm hover:shadow-2xl hover:shadow-yellow-600/50 transition-all flex items-center gap-3">
            <span className="tracking-wide text-lg">Explorar Coleção</span>
            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="border-2 border-yellow-600 text-yellow-600 px-10 py-5 rounded-sm hover:bg-yellow-600 hover:text-black transition-all">
            <span className="tracking-wide text-lg">Falar com Consultor</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-12 mt-20 pt-12 border-t border-gray-800">
          <div>
            <p className="text-5xl bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent mb-2">50+</p>
            <p className="text-gray-400 tracking-wide uppercase text-sm">Propriedades Exclusivas</p>
          </div>
          <div>
            <p className="text-5xl bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent mb-2">24/7</p>
            <p className="text-gray-400 tracking-wide uppercase text-sm">Concierge Service</p>
          </div>
          <div>
            <p className="text-5xl bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent mb-2">100%</p>
            <p className="text-gray-400 tracking-wide uppercase text-sm">Satisfação Garantida</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// BUSCA
// ============================================================

function BuscaLuxo() {
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
    <section className="py-20 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black"></div>
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-gray-900 to-black border border-yellow-600/30 rounded-sm p-10 backdrop-blur-xl">
          <h3 className="text-3xl mb-8 text-center tracking-wide">
            Encontre Seu <span className="text-yellow-600">Refúgio Exclusivo</span>
          </h3>

          <div className="grid md:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="block text-sm mb-3 text-gray-400 uppercase tracking-widest">Destino</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-yellow-600" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Localização premium"
                  className="w-full pl-12 pr-4 py-4 bg-black/50 border border-gray-700 rounded-sm focus:ring-2 focus:ring-yellow-600 focus:border-yellow-600 text-white placeholder-gray-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-3 text-gray-400 uppercase tracking-widest">Entrada</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-yellow-600" />
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-black/50 border border-gray-700 rounded-sm focus:ring-2 focus:ring-yellow-600 focus:border-yellow-600 text-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-3 text-gray-400 uppercase tracking-widest">Saída</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-yellow-600" />
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-black/50 border border-gray-700 rounded-sm focus:ring-2 focus:ring-yellow-600 focus:border-yellow-600 text-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-3 text-gray-400 uppercase tracking-widest">Hóspedes</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-yellow-600" />
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full pl-12 pr-4 py-4 bg-black/50 border border-gray-700 rounded-sm focus:ring-2 focus:ring-yellow-600 focus:border-yellow-600 text-white appearance-none transition-all"
                >
                  {[1,2,3,4,5,6,7,8,10,12].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'hóspede' : 'hóspedes'}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 text-black py-5 rounded-sm hover:shadow-2xl hover:shadow-yellow-600/50 transition-all flex items-center justify-center gap-3"
          >
            <Search className="h-5 w-5" />
            <span className="tracking-wide text-lg">Buscar Propriedades Exclusivas</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// COLEÇÃO EXCLUSIVA
// ============================================================

function ColecaoExclusiva() {
  const { properties, loading } = useRendizyData();

  if (loading) {
    return (
      <section className="py-20 px-6" id="colecao">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-800 rounded w-64 mx-auto"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-32 px-6 relative" id="colecao">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div className="inline-block mb-6">
            <Crown className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          </div>
          <h2 className="text-6xl mb-6 tracking-tight">
            Nossa <span className="text-yellow-600">Coleção</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Propriedades cuidadosamente selecionadas para oferecer o máximo em exclusividade
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {properties.slice(0, 6).map((property) => (
            <CardLuxo key={property.id} property={property} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CardLuxo({ property }: { property: any }) {
  return (
    <div className="group relative bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-sm overflow-hidden hover:border-yellow-600/50 transition-all duration-500">
      {/* Imagem */}
      <div className="relative h-80 overflow-hidden">
        <img
          src={property.images?.[0] || 'https://images.unsplash.com/photo-1613490493576-7fde63acd811'}
          alt={property.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>

        {/* Badge Exclusivo */}
        <div className="absolute top-6 left-6">
          <span className="flex items-center gap-2 bg-yellow-600 text-black px-4 py-2 rounded-sm">
            <Diamond className="h-4 w-4" />
            <span className="tracking-wide text-sm">EXCLUSIVO</span>
          </span>
        </div>

        {/* Rating */}
        <div className="absolute top-6 right-6 bg-black/80 backdrop-blur px-4 py-2 rounded-sm flex items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-600 text-yellow-600" />
          <span className="text-white">5.0</span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-8">
        <h3 className="text-2xl mb-3 tracking-wide">{property.name}</h3>
        
        <p className="text-gray-400 mb-6 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-yellow-600" />
          {property.location}
        </p>

        <div className="flex items-center gap-6 text-sm text-gray-400 mb-6 pb-6 border-b border-gray-800">
          <span>{property.bedrooms} Suítes</span>
          <span className="text-gray-700">|</span>
          <span>{property.bathrooms} Banheiros</span>
          <span className="text-gray-700">|</span>
          <span>{property.maxGuests} Hóspedes</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">A partir de</p>
            <p className="text-3xl text-yellow-600">
              R$ {property.price}
              <span className="text-lg text-gray-400">/noite</span>
            </p>
          </div>
          <button className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-black px-6 py-3 rounded-sm hover:shadow-xl hover:shadow-yellow-600/30 transition-all">
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EXPERIÊNCIA LUXO
// ============================================================

function ExperienciaLuxo() {
  const experiencias = [
    {
      icon: Crown,
      title: 'Concierge 24/7',
      desc: 'Atendimento personalizado a qualquer momento para garantir sua total comodidade.'
    },
    {
      icon: Award,
      title: 'Propriedades Certificadas',
      desc: 'Seleção rigorosa com padrões internacionais de qualidade e luxo.'
    },
    {
      icon: Diamond,
      title: 'Experiências Exclusivas',
      desc: 'Acesso a serviços premium e experiências únicas em cada destino.'
    },
    {
      icon: Sparkles,
      title: 'Privacidade Total',
      desc: 'Discrição e segurança máxima para sua tranquilidade absoluta.'
    }
  ];

  return (
    <section className="py-32 px-6 relative" id="experiencia">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900/50 to-black"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-6xl mb-6 tracking-tight">
            A <span className="text-yellow-600">Experiência</span> Prestige
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Cada detalhe pensado para superar suas expectativas
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {experiencias.map((item, index) => (
            <div key={index} className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-sm p-8 hover:border-yellow-600/50 transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-600 to-yellow-500 rounded-sm flex items-center justify-center mb-6">
                <item.icon className="h-8 w-8 text-black" />
              </div>
              <h3 className="text-xl mb-4 tracking-wide">{item.title}</h3>
              <p className="text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// TESTEMUNHOS
// ============================================================

function TestemunhosLuxo() {
  const testemunhos = [
    {
      nome: 'Roberto Almeida',
      cargo: 'CEO',
      rating: 5,
      texto: 'Experiência excepcional do início ao fim. Atendimento impecável e propriedade magnífica.'
    },
    {
      nome: 'Patricia Mendes',
      cargo: 'Empresária',
      rating: 5,
      texto: 'Luxo e conforto em cada detalhe. Superou todas as nossas expectativas.'
    },
    {
      nome: 'Eduardo Santos',
      cargo: 'Investidor',
      rating: 5,
      texto: 'Privacidade e exclusividade em sua essência. Voltaremos com certeza.'
    }
  ];

  return (
    <section className="py-32 px-6 relative" id="testemunhos">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-6xl mb-6 tracking-tight">
            Testemunhos <span className="text-yellow-600">VIP</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {testemunhos.map((item, index) => (
            <div key={index} className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-sm p-10">
              <div className="flex items-center gap-1 mb-6">
                {[...Array(item.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-600 text-yellow-600" />
                ))}
              </div>
              <p className="text-gray-300 mb-8 text-lg leading-relaxed italic">"{item.texto}"</p>
              <div className="pt-6 border-t border-gray-800">
                <p className="text-xl mb-1">{item.nome}</p>
                <p className="text-sm text-gray-500 uppercase tracking-widest">{item.cargo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// CONTATO VIP
// ============================================================

function ContatoVIP() {
  return (
    <section className="py-32 px-6 relative" id="contato">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-yellow-900/5 to-black"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <Crown className="h-16 w-16 text-yellow-600 mx-auto mb-8" />
        
        <h2 className="text-6xl mb-8 tracking-tight">
          Atendimento <span className="text-yellow-600">Personalizado</span>
        </h2>
        
        <p className="text-2xl text-gray-400 mb-12 leading-relaxed">
          Nossa equipe de consultores está pronta para criar uma experiência única para você
        </p>

        <div className="flex flex-wrap gap-6 justify-center">
          <button className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-black px-12 py-6 rounded-sm hover:shadow-2xl hover:shadow-yellow-600/50 transition-all">
            <span className="tracking-wide text-lg">Falar com Consultor</span>
          </button>
          <button className="border-2 border-yellow-600 text-yellow-600 px-12 py-6 rounded-sm hover:bg-yellow-600 hover:text-black transition-all">
            <span className="tracking-wide text-lg">agendar Visita Virtual</span>
          </button>
        </div>

        <div className="mt-16 pt-16 border-t border-gray-800 grid md:grid-cols-2 gap-12 text-left">
          <div>
            <h4 className="text-xl mb-4 tracking-wide">Contato Direto</h4>
            <p className="text-gray-400 mb-2">WhatsApp VIP: +55 11 99999-9999</p>
            <p className="text-gray-400">vip@prestigecollection.com</p>
          </div>
          <div>
            <h4 className="text-xl mb-4 tracking-wide">Horário Exclusivo</h4>
            <p className="text-gray-400 mb-2">Segunda a Domingo: 8h às 22h</p>
            <p className="text-gray-400">Plantão 24/7 para hóspedes</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER
// ============================================================

function FooterLuxo() {
  return (
    <footer className="bg-black border-t border-gray-900 py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Diamond className="h-8 w-8 text-yellow-600" />
              <h3 className="text-xl tracking-wider">PRESTIGE</h3>
            </div>
            <p className="text-gray-500 leading-relaxed">
              Experiências exclusivas em propriedades de ultra-luxo
            </p>
          </div>

          <div>
            <h4 className="text-lg mb-6 uppercase tracking-widest text-gray-400">Coleção</h4>
            <ul className="space-y-3 text-gray-500">
              <li><a href="#" className="hover:text-yellow-600 transition-colors">Propriedades</a></li>
              <li><a href="#" className="hover:text-yellow-600 transition-colors">Destinos</a></li>
              <li><a href="#" className="hover:text-yellow-600 transition-colors">Experiências</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg mb-6 uppercase tracking-widest text-gray-400">Serviços</h4>
            <ul className="space-y-3 text-gray-500">
              <li><a href="#" className="hover:text-yellow-600 transition-colors">Concierge</a></li>
              <li><a href="#" className="hover:text-yellow-600 transition-colors">Transfers</a></li>
              <li><a href="#" className="hover:text-yellow-600 transition-colors">Experiências VIP</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg mb-6 uppercase tracking-widest text-gray-400">Exclusivo</h4>
            <p className="text-gray-500 mb-4">
              Membro da Associação Internacional de Propriedades de Luxo
            </p>
            <div className="flex gap-4">
              <Award className="h-8 w-8 text-yellow-600" />
              <Crown className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-900 pt-10 text-center">
          <p className="text-gray-600">
            © 2025 Prestige Collection. All Rights Reserved. | 
            <span className="text-gray-700"> Powered by RENDIZY</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
