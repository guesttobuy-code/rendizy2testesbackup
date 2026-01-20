// ============================================================
// TEMPLATE: SITE CLÁSSICO
// ============================================================
// Design tradicional, profissional, tons neutros
// Ideal para: Imobiliárias estabelecidas, público conservador
// ============================================================

import { useState } from 'react';
import { Search, MapPin, Calendar, Users, Phone, Mail, Building2, CheckCircle, Award, Shield, Clock } from 'lucide-react';
import { useRendizyData, useRendizyBooking } from '../components/ClientSiteWrapper';

// ============================================================
// SITE PRINCIPAL
// ============================================================

export default function SiteClassico() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <HeaderClassico />
      <HeroClassico />
      <BuscaClassico />
      <ImoveisListaClassico />
      <SobreClassico />
      <DiferenciaisClassico />
      <ContatoClassico />
      <FooterClassico />
    </div>
  );
}

// ============================================================
// TOP BAR
// ============================================================

function TopBar() {
  return (
    <div className="bg-gray-900 text-white py-2 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <a href="tel:+5511999999999" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
            <Phone className="h-4 w-4" />
            (11) 99999-9999
          </a>
          <a href="mailto:contato@imobiliaria.com" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
            <Mail className="h-4 w-4" />
            contato@imobiliaria.com
          </a>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">Seg - Sex: 9h às 18h</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// HEADER
// ============================================================

function HeaderClassico() {
  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-blue-900 rounded flex items-center justify-center">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl text-gray-900">Imobiliária Prestígio</h1>
            <p className="text-xs text-gray-600">Tradição e Confiança desde 1995</p>
          </div>
        </div>
        
        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#imoveis" className="text-gray-700 hover:text-blue-900 transition-colors">
            Imóveis
          </a>
          <a href="#sobre" className="text-gray-700 hover:text-blue-900 transition-colors">
            Sobre Nós
          </a>
          <a href="#diferenciais" className="text-gray-700 hover:text-blue-900 transition-colors">
            Diferenciais
          </a>
          <a href="#contato" className="text-gray-700 hover:text-blue-900 transition-colors">
            Contato
          </a>
        </nav>

        {/* CTA */}
        <button className="hidden md:block bg-blue-900 text-white px-6 py-3 rounded hover:bg-blue-800 transition-colors">
          Agendar Visita
        </button>
      </div>
    </header>
  );
}

// ============================================================
// HERO
// ============================================================

function HeroClassico() {
  return (
    <section className="relative bg-gray-800 text-white py-24 px-6">
      {/* Background com overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-blue-900/80"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <div className="inline-block border-2 border-white/30 px-4 py-2 rounded mb-6">
            <span className="text-sm uppercase tracking-wider">Mais de 30 Anos de Experiência</span>
          </div>
          
          <h2 className="text-5xl leading-tight mb-6">
            Encontre o Imóvel Perfeito
            <span className="block text-blue-400 mt-2">
              Para Suas Férias
            </span>
          </h2>
          
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Oferecemos uma seleção cuidadosa de propriedades de alto padrão 
            para aluguel de temporada. Profissionalismo, segurança e excelência 
            no atendimento.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <button className="bg-blue-900 text-white px-8 py-4 rounded hover:bg-blue-800 transition-colors flex items-center gap-2">
              Ver Propriedades
              <CheckCircle className="h-5 w-5" />
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded hover:bg-white hover:text-gray-900 transition-all">
              Entre em Contato
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// BUSCA
// ============================================================

function BuscaClassico() {
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
    <section className="py-12 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-8">
          <h3 className="text-2xl text-gray-900 mb-6 text-center">
            Busque Seu Imóvel Ideal
          </h3>

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm mb-2 text-gray-700 uppercase tracking-wide">
                Localização
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Cidade ou região"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700 uppercase tracking-wide">
                Check-in
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700 uppercase tracking-wide">
                Check-out
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700 uppercase tracking-wide">
                Hóspedes
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-900 focus:border-blue-900 appearance-none"
                >
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'hóspede' : 'hóspedes'}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="w-full bg-blue-900 text-white py-4 rounded hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
          >
            <Search className="h-5 w-5" />
            Buscar Propriedades
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// LISTA DE IMÓVEIS
// ============================================================

function ImoveisListaClassico() {
  const { properties, loading } = useRendizyData();

  if (loading) {
    return (
      <section className="py-20 px-6" id="imoveis">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600">Carregando propriedades...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 bg-gray-50" id="imoveis">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl text-gray-900 mb-4">
            Propriedades Disponíveis
          </h2>
          <div className="w-24 h-1 bg-blue-900 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Imóveis selecionados com critério e qualidade garantida
          </p>
        </div>

        <div className="space-y-6">
          {properties.slice(0, 6).map((property) => (
            <CardImovelClassico key={property.id} property={property} />
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="border-2 border-blue-900 text-blue-900 px-8 py-4 rounded hover:bg-blue-900 hover:text-white transition-all">
            Carregar Mais Propriedades
          </button>
        </div>
      </div>
    </section>
  );
}

function CardImovelClassico({ property }: { property: any }) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="grid md:grid-cols-3 gap-0">
        {/* Imagem */}
        <div className="h-64 md:h-auto overflow-hidden">
          <img
            src={property.images?.[0] || 'https://images.unsplash.com/photo-1613490493576-7fde63acd811'}
            alt={property.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Conteúdo */}
        <div className="md:col-span-2 p-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl text-gray-900 mb-2">{property.name}</h3>
              <p className="text-gray-600 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {property.location}
              </p>
            </div>
            <div className="bg-blue-900 text-white px-4 py-2 rounded">
              <p className="text-sm">Referência</p>
              <p className="text-lg">#{property.id.substring(0, 6)}</p>
            </div>
          </div>

          <p className="text-gray-700 mb-6 leading-relaxed">
            {property.description || 'Propriedade de alto padrão em excelente localização. Ideal para famílias que buscam conforto e tranquilidade.'}
          </p>

          <div className="grid grid-cols-4 gap-4 mb-6 pb-6 border-b border-gray-200">
            <div className="text-center">
              <p className="text-2xl text-blue-900 mb-1">{property.bedrooms}</p>
              <p className="text-sm text-gray-600">Quartos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-blue-900 mb-1">{property.bathrooms}</p>
              <p className="text-sm text-gray-600">Banheiros</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-blue-900 mb-1">{property.maxGuests}</p>
              <p className="text-sm text-gray-600">Hóspedes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-blue-900 mb-1">200m²</p>
              <p className="text-sm text-gray-600">Área</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Diária a partir de</p>
              <p className="text-3xl text-blue-900">
                R$ {property.price}
                <span className="text-lg text-gray-600">/noite</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button className="border-2 border-blue-900 text-blue-900 px-6 py-3 rounded hover:bg-blue-50 transition-colors">
                Ver Detalhes
              </button>
              <button className="bg-blue-900 text-white px-6 py-3 rounded hover:bg-blue-800 transition-colors">
                Agendar Visita
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SOBRE
// ============================================================

function SobreClassico() {
  return (
    <section className="py-20 px-6 bg-white" id="sobre">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl text-gray-900 mb-4">
              Tradição e Excelência
              <span className="block text-blue-900 mt-2">Desde 1995</span>
            </h2>
            <div className="w-24 h-1 bg-blue-900 mb-6"></div>
            
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Há mais de 30 anos no mercado imobiliário, a Imobiliária Prestígio 
              é sinônimo de confiança e profissionalismo no segmento de locação 
              de temporada.
            </p>
            
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              Nosso compromisso é oferecer propriedades de alto padrão, 
              selecionadas criteriosamente para garantir a melhor experiência 
              aos nossos clientes.
            </p>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="text-center border-r border-gray-200">
                <p className="text-4xl text-blue-900 mb-2">30+</p>
                <p className="text-sm text-gray-600">Anos de<br/>Experiência</p>
              </div>
              <div className="text-center border-r border-gray-200">
                <p className="text-4xl text-blue-900 mb-2">500+</p>
                <p className="text-sm text-gray-600">Imóveis<br/>Gerenciados</p>
              </div>
              <div className="text-center">
                <p className="text-4xl text-blue-900 mb-2">10k+</p>
                <p className="text-sm text-gray-600">Clientes<br/>Satisfeitos</p>
              </div>
            </div>

            <button className="bg-blue-900 text-white px-8 py-4 rounded hover:bg-blue-800 transition-colors">
              Conheça Nossa História
            </button>
          </div>

          <div className="bg-gray-200 h-96 rounded-lg"></div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// DIFERENCIAIS
// ============================================================

function DiferenciaisClassico() {
  const diferenciais = [
    {
      icon: Award,
      title: 'Qualidade Garantida',
      desc: 'Todos os imóveis passam por rigorosa inspeção e manutenção regular.'
    },
    {
      icon: Shield,
      title: 'Segurança Jurídica',
      desc: 'Contratos claros e transparentes com total segurança jurídica.'
    },
    {
      icon: CheckCircle,
      title: 'Atendimento Premium',
      desc: 'Equipe especializada disponível para atender todas as suas necessidades.'
    },
    {
      icon: Clock,
      title: 'Suporte 24/7',
      desc: 'Assistência completa durante toda a sua estadia, a qualquer hora.'
    }
  ];

  return (
    <section className="py-20 px-6 bg-gray-50" id="diferenciais">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl text-gray-900 mb-4">
            Nossos Diferenciais
          </h2>
          <div className="w-24 h-1 bg-blue-900 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            O que nos torna referência no mercado de locação de temporada
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {diferenciais.map((item, index) => (
            <div key={index} className="bg-white border-2 border-gray-200 rounded-lg p-8 text-center hover:border-blue-900 transition-colors">
              <div className="w-16 h-16 bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <item.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">{item.title}</h3>
              <p className="text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// CONTATO
// ============================================================

function ContatoClassico() {
  return (
    <section className="py-20 px-6 bg-white" id="contato">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl text-gray-900 mb-4">
            Entre em Contato
          </h2>
          <div className="w-24 h-1 bg-blue-900 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">
            Nossa equipe está pronta para atendê-lo
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <form className="space-y-6">
              <div>
                <label className="block text-sm mb-2 text-gray-700 uppercase tracking-wide">
                  Nome Completo
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  placeholder="Seu nome"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-gray-700 uppercase tracking-wide">
                    E-mail
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-700 uppercase tracking-wide">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700 uppercase tracking-wide">
                  Mensagem
                </label>
                <textarea
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  placeholder="Como podemos ajudá-lo?"
                ></textarea>
              </div>

              <button className="w-full bg-blue-900 text-white py-4 rounded hover:bg-blue-800 transition-colors">
                Enviar Mensagem
              </button>
            </form>
          </div>

          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-blue-900 rounded flex items-center justify-center flex-shrink-0">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="text-lg text-gray-900 mb-2">Telefone</h4>
                <p className="text-gray-600">(11) 99999-9999</p>
                <p className="text-gray-600">(11) 3333-3333</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-14 h-14 bg-blue-900 rounded flex items-center justify-center flex-shrink-0">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="text-lg text-gray-900 mb-2">E-mail</h4>
                <p className="text-gray-600">contato@imobiliariaprestigio.com</p>
                <p className="text-gray-600">atendimento@imobiliariaprestigio.com</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-14 h-14 bg-blue-900 rounded flex items-center justify-center flex-shrink-0">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="text-lg text-gray-900 mb-2">Endereço</h4>
                <p className="text-gray-600">Av. Paulista, 1000 - Conj. 801</p>
                <p className="text-gray-600">São Paulo - SP, 01310-100</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-14 h-14 bg-blue-900 rounded flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="text-lg text-gray-900 mb-2">Horário de Atendimento</h4>
                <p className="text-gray-600">Segunda a Sexta: 9h às 18h</p>
                <p className="text-gray-600">Sábados: 9h às 13h</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER
// ============================================================

function FooterClassico() {
  return (
    <footer className="bg-gray-900 text-white py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-900 rounded flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl">Prestígio</h3>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Tradição e confiança no mercado de locação de temporada desde 1995
            </p>
          </div>

          <div>
            <h4 className="text-lg mb-4 uppercase tracking-wide">Institucional</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Sobre a Empresa</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Nossa História</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Missão e Valores</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Trabalhe Conosco</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg mb-4 uppercase tracking-wide">Atendimento</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Perguntas Frequentes</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Política de Privacidade</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg mb-4 uppercase tracking-wide">Certificações</h4>
            <div className="flex gap-4 mb-4">
              <div className="w-16 h-16 bg-white/10 rounded flex items-center justify-center">
                <Shield className="h-8 w-8" />
              </div>
              <div className="w-16 h-16 bg-white/10 rounded flex items-center justify-center">
                <Award className="h-8 w-8" />
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Certificada e reconhecida pelos principais órgãos do setor imobiliário
            </p>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-gray-400">
            © 2025 Imobiliária Prestígio. Todos os direitos reservados. | 
            <span className="text-gray-500"> Powered by RENDIZY</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
