import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from './ui/button';

interface FontOption {
  id: string;
  name: string;
  displayName: string;
  description: string;
  fontFamily: string;
  importUrl: string;
  weights: string;
  preview: {
    heading: string;
    subheading: string;
    body: string;
    numbers: string;
  };
}

const fontOptions: FontOption[] = [
  {
    id: 'inter',
    name: 'Inter',
    displayName: 'Inter',
    description: 'Fonte moderna e altamente legível, usada por GitHub, Figma, Stripe',
    fontFamily: '"Inter", -apple-system, sans-serif',
    importUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    weights: '300, 400, 500, 600, 700',
    preview: {
      heading: 'Dashboard Inicial',
      subheading: 'Apartamento Moderno em Ipanema',
      body: 'Apartamento moderno e elegante localizado no coração de Ipanema, a poucos metros da praia.',
      numbers: 'R$ 350/noite • 127 avaliações'
    }
  },
  {
    id: 'geist',
    name: 'Geist Sans',
    displayName: 'Geist Sans',
    description: 'Fonte moderna criada pela Vercel, clean e profissional',
    fontFamily: '"Geist Sans", -apple-system, sans-serif',
    importUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    weights: '300, 400, 500, 600, 700',
    preview: {
      heading: 'Dashboard Inicial',
      subheading: 'Apartamento Moderno em Ipanema',
      body: 'Apartamento moderno e elegante localizado no coração de Ipanema, a poucos metros da praia.',
      numbers: 'R$ 350/noite • 127 avaliações'
    }
  },
  {
    id: 'jakarta',
    name: 'Plus Jakarta Sans',
    displayName: 'Plus Jakarta Sans',
    description: 'Fonte geométrica moderna, clean e elegante',
    fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif',
    importUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
    weights: '300, 400, 500, 600, 700, 800',
    preview: {
      heading: 'Dashboard Inicial',
      subheading: 'Apartamento Moderno em Ipanema',
      body: 'Apartamento moderno e elegante localizado no coração de Ipanema, a poucos metros da praia.',
      numbers: 'R$ 350/noite • 127 avaliações'
    }
  },
  {
    id: 'manrope',
    name: 'Manrope',
    displayName: 'Manrope',
    description: 'Fonte geométrica equilibrada, perfeita para interfaces',
    fontFamily: '"Manrope", -apple-system, sans-serif',
    importUrl: 'https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap',
    weights: '300, 400, 500, 600, 700, 800',
    preview: {
      heading: 'Dashboard Inicial',
      subheading: 'Apartamento Moderno em Ipanema',
      body: 'Apartamento moderno e elegante localizado no coração de Ipanema, a poucos metros da praia.',
      numbers: 'R$ 350/noite • 127 avaliações'
    }
  },
  {
    id: 'dmsans',
    name: 'DM Sans',
    displayName: 'DM Sans',
    description: 'Fonte clean e profissional, excelente legibilidade',
    fontFamily: '"DM Sans", -apple-system, sans-serif',
    importUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap',
    weights: '300, 400, 500, 600, 700',
    preview: {
      heading: 'Dashboard Inicial',
      subheading: 'Apartamento Moderno em Ipanema',
      body: 'Apartamento moderno e elegante localizado no coração de Ipanema, a poucos metros da praia.',
      numbers: 'R$ 350/noite • 127 avaliações'
    }
  },
  {
    id: 'system',
    name: 'SF Pro (System)',
    displayName: 'SF Pro Display (Apple)',
    description: 'Fonte nativa do sistema Apple - clean, moderna e otimizada',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", sans-serif',
    importUrl: '',
    weights: 'Sistema',
    preview: {
      heading: 'Dashboard Inicial',
      subheading: 'Apartamento Moderno em Ipanema',
      body: 'Apartamento moderno e elegante localizado no coração de Ipanema, a poucos metros da praia.',
      numbers: 'R$ 350/noite • 127 avaliações'
    }
  }
];

export function FontSelector() {
  const [selectedFont, setSelectedFont] = useState<string>('inter');
  const [copiedCode, setCopiedCode] = useState(false);

  const currentFont = fontOptions.find(f => f.id === selectedFont) || fontOptions[0];

  const handleCopyCode = async () => {
    const code = `/* Adicione ao <head> do index.html */
${currentFont.importUrl ? `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${currentFont.importUrl}" rel="stylesheet">` : '/* Fonte do sistema - não precisa import */'}

/* Adicione ao styles/globals.css */
body {
  font-family: ${currentFont.fontFamily};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;
    
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      // Fallback para seleção manual
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch (e) {
        console.error('Não foi possível copiar:', e);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Seletor de Fontes Rendizy</h1>
          <p className="text-gray-600">
            Escolha uma fonte moderna e clean para o seu sistema. Inspiradas no design da Apple.
          </p>
        </div>

        {/* Font Options Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {fontOptions.map((font) => (
            <button
              key={font.id}
              onClick={() => setSelectedFont(font.id)}
              className={`
                text-left p-6 rounded-xl border-2 transition-all
                ${selectedFont === font.id 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-gray-900 mb-1">{font.displayName}</h3>
                  <p className="text-sm text-gray-500">{font.description}</p>
                </div>
                {selectedFont === font.id && (
                  <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div style={{ fontFamily: font.fontFamily }}>
                  <p className="text-xl text-gray-900" style={{ fontWeight: 600 }}>
                    {font.preview.heading}
                  </p>
                  <p className="text-base text-gray-900 mt-2" style={{ fontWeight: 500 }}>
                    {font.preview.subheading}
                  </p>
                  <p className="text-sm text-gray-600 mt-2" style={{ fontWeight: 400 }}>
                    {font.preview.body}
                  </p>
                  <p className="text-sm text-gray-500 mt-2" style={{ fontWeight: 400 }}>
                    {font.preview.numbers}
                  </p>
                </div>
              </div>

              {/* Weights Info */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Pesos disponíveis: {font.weights}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Current Selection Preview */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm mb-6">
          <div className="mb-6">
            <h2 className="text-gray-900 mb-2">Preview Completo: {currentFont.displayName}</h2>
            <p className="text-gray-600">
              Veja como ficará a tipografia em diferentes contextos
            </p>
          </div>

          <div className="space-y-8" style={{ fontFamily: currentFont.fontFamily }}>
            {/* Headings */}
            <div>
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Títulos</p>
              <h1 className="text-gray-900 mb-3" style={{ fontWeight: 600 }}>
                Dashboard de Gestão de Propriedades
              </h1>
              <h2 className="text-gray-900 mb-3" style={{ fontWeight: 600 }}>
                Locais e Imóveis Cadastrados
              </h2>
              <h3 className="text-gray-900" style={{ fontWeight: 600 }}>
                Informações da Reserva
              </h3>
            </div>

            {/* Body Text */}
            <div>
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Textos</p>
              <p className="text-gray-700 mb-3" style={{ fontWeight: 400 }}>
                Apartamento moderno e elegante localizado no coração de Ipanema, a poucos metros da praia. 
                Completamente mobiliado com decoração contemporânea e todas as comodidades necessárias para 
                uma estadia confortável.
              </p>
              <p className="text-sm text-gray-600" style={{ fontWeight: 400 }}>
                Check-in: 15:00 • Check-out: 11:00 • Estadia mínima: 2 noites
              </p>
            </div>

            {/* Numbers & Stats */}
            <div>
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Números e Estatísticas</p>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-2xl text-gray-900 mb-1" style={{ fontWeight: 700 }}>350</p>
                  <p className="text-sm text-gray-600" style={{ fontWeight: 400 }}>Reais/noite</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-2xl text-gray-900 mb-1" style={{ fontWeight: 700 }}>4.9</p>
                  <p className="text-sm text-gray-600" style={{ fontWeight: 400 }}>Avaliação</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-2xl text-gray-900 mb-1" style={{ fontWeight: 700 }}>127</p>
                  <p className="text-sm text-gray-600" style={{ fontWeight: 400 }}>Reviews</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-2xl text-gray-900 mb-1" style={{ fontWeight: 700 }}>85%</p>
                  <p className="text-sm text-gray-600" style={{ fontWeight: 400 }}>Taxa ocupação</p>
                </div>
              </div>
            </div>

            {/* UI Elements */}
            <div>
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Elementos de Interface</p>
              <div className="flex items-center gap-4">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg" style={{ fontWeight: 500 }}>
                  Reservar Agora
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg" style={{ fontWeight: 500 }}>
                  Ver Detalhes
                </button>
              </div>
            </div>

            {/* Labels */}
            <div>
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Labels e Inputs</p>
              <div className="space-y-2">
                <label className="block text-gray-700" style={{ fontWeight: 500 }}>
                  Nome do Hóspede
                </label>
                <input
                  type="text"
                  placeholder="Digite o nome completo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  style={{ fontWeight: 400 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Code */}
        <div className="bg-gray-900 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white" style={{ fontWeight: 600 }}>Código de Implementação</h3>
            <Button
              onClick={handleCopyCode}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {copiedCode ? 'Copiado!' : 'Copiar Código'}
            </Button>
          </div>
          <pre className="text-sm overflow-x-auto">
            <code className="text-green-400">
{currentFont.importUrl ? `<!-- Adicione ao <head> do index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${currentFont.importUrl}" rel="stylesheet">

` : `/* Fonte do sistema - não precisa import */

`}
{`/* Adicione ao styles/globals.css */
body {
  font-family: ${currentFont.fontFamily};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`}
            </code>
          </pre>
        </div>

        {/* Recommendations */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-blue-900 mb-3" style={{ fontWeight: 600 }}>💡 Recomendações</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• <strong>Inter:</strong> Melhor escolha geral - usado por Figma, GitHub, Stripe</li>
            <li>• <strong>SF Pro (System):</strong> Melhor performance - não precisa download</li>
            <li>• <strong>Plus Jakarta Sans:</strong> Design mais moderno e geométrico</li>
            <li>• <strong>Manrope:</strong> Excelente para dashboards e dados</li>
            <li>• <strong>DM Sans:</strong> Muito legível, ótima para textos longos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
