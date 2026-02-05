/**
 * 🕷️ SCRAPER SERGIO CASTRO IMÓVEIS v2
 * 
 * POC - Prova de Conceito para extração de imóveis de sites externos
 * Versão leve usando Cheerio (sem Puppeteer)
 * 
 * Uso: node scripts/scrape-sergiocastro.cjs
 */

const cheerio = require('cheerio');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
const fs = require('fs');

// Config Supabase (chave correta do .env.local)
const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// URL do imóvel a extrair - pode ser passada como argumento
const DEFAULT_URL = 'https://www.sergiocastro.com.br/imovel/venda+apartamento+3-quartos+copacabana+rio-de-janeiro+rj+106m2+rs1890000/ID-14610';
const TARGET_URL = process.argv[2] || DEFAULT_URL;

/**
 * Baixa uma imagem e converte para base64
 */
async function downloadImageToBase64(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    protocol.get(url, options, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadImageToBase64(response.headers.location).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = response.headers['content-type'] || 'image/jpeg';
        const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;
        resolve(base64);
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Extrai dados do imóvel usando Cheerio
 */
async function scrapeProperty(url) {
  console.log('🚀 Iniciando scraper Sergio Castro v2 (Cheerio)...');
  console.log(`📍 URL: ${url}\n`);
  
  // Fazer requisição HTTP
  console.log('📄 Baixando página...');
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const html = await response.text();
  console.log(`✅ Página baixada (${(html.length / 1024).toFixed(1)} KB)`);
  
  // Parse com Cheerio
  const $ = cheerio.load(html);
  console.log('🔍 Extraindo dados...\n');
  
  // Título - limpar tabs e quebras de linha
  const rawTitle = $('h1').first().text();
  const title = rawTitle.replace(/[\t\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Código - tentar SCV/OURO/DIR, senão extrair ID da URL
  const codeMatch = html.match(/SCV\d+|OURO\d+|DIR\d+/);
  let code = codeMatch ? codeMatch[0] : null;
  if (!code) {
    // Extrair ID-XXXXX da URL
    const urlIdMatch = url.match(/ID-(\d+)/i);
    code = urlIdMatch ? `ID${urlIdMatch[1]}` : 'UNKNOWN';
  }
  
  // Endereço - limpar tabs e quebras de linha
  const rawAddress = $('h3').first().text();
  const address = rawAddress.replace(/[\t\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Extrair texto visível limpo (sem HTML do menu)
  const pageText = $('body').text().replace(/[\t\n\r]+/g, ' ').replace(/\s+/g, ' ');
  
  // Preço - buscar "Valor Venda R$ 1.890.000"
  const priceMatch = pageText.match(/Valor\s*Venda\s*R\$\s*([\d.,]+)/i);
  const priceText = priceMatch ? priceMatch[1] : '0';
  const price = parseFloat(priceText.replace(/\./g, '').replace(',', '.'));
  console.log(`   Debug Preço: "${priceMatch ? priceMatch[0] : 'null'}" => ${price}`);
  
  // Condomínio - formato "CONDOMÍNIO R$ 2.272,00" (no contexto de valor, não menu)
  // Buscar após "Valor Venda" para evitar pegar do menu
  const valorSection = pageText.match(/Valor\s*Venda[\s\S]{0,500}/i);
  console.log(`   Debug valorSection: "${valorSection ? valorSection[0].substring(0, 200) : 'null'}..."`);
  
  // Regex mais flexível: pode ter ou não vírgula
  const condoMatch = valorSection ? valorSection[0].match(/CONDOM[IÍ]NIO\s*R\$\s*([\d.,]+)/i) : null;
  let condoText = condoMatch ? condoMatch[1] : '0';
  // Se termina com 2+ dígitos sem vírgula, pode estar colado com próximo número
  if (condoText.length > 6 && !condoText.includes(',')) {
    // "2272,00" pode ter virado "2272" ou algo maior
    condoText = condoText.substring(0, 6); // Limitar a valores razoáveis
  }
  const condominio = parseFloat(condoText.replace(/\./g, '').replace(',', '.'));
  console.log(`   Debug Condomínio: "${condoMatch ? condoMatch[0] : 'null'}" => ${condominio}`);
  
  // IPTU - formato "IPTU 10x de R$ 541,00" ou "IPTU 10x de R$ 2028.13"
  // Pegar valor antes de ponto/vírgula+decimais ou antes de letra
  const iptuMatch = valorSection ? valorSection[0].match(/IPTU\s*(\d+)\s*x\s*(?:de\s*)?R\$\s*(\d+)/i) : null;
  let iptu = iptuMatch ? parseInt(iptuMatch[2]) : 0;
  // Se valor parecer colado com quartos (ex: "5413Quartos" onde 541 é IPTU e 3 é quartos)
  if (iptuMatch && valorSection) {
    const matchEnd = valorSection[0].indexOf(iptuMatch[0]) + iptuMatch[0].length;
    const afterIptu = valorSection[0].substring(matchEnd);
    // Se o próximo char é ponto/vírgula seguido de decimais, valor está correto
    // Se o próximo char é dígito+Quarto, o último dígito do IPTU pertence aos quartos
    if (/^\d*Quarto/i.test(afterIptu) && !/^[.,]\d{2}/.test(afterIptu)) {
      iptu = Math.floor(iptu / 10);
    }
  }
  const iptuParcelas = iptuMatch ? parseInt(iptuMatch[1]) : 0;
  console.log(`   Debug IPTU: "${iptuMatch ? iptuMatch[0] : 'null'}" => ${iptuParcelas}x R$ ${iptu}`);
  
  // Área - formato "106m² Área Útil"
  const areaMatch = pageText.match(/(\d+)\s*m[²2]\s*[ÁA]rea/i);
  const area = areaMatch ? parseInt(areaMatch[1]) : 0;
  console.log(`   Debug Área: "${areaMatch ? areaMatch[0] : 'null'}" => ${area}`);
  
  // Quartos - formato "3 Quartos"
  const quartosMatch = pageText.match(/(\d+)\s*Quartos?/i);
  const quartos = quartosMatch ? parseInt(quartosMatch[1]) : 0;
  
  // Suítes - formato "(sendo 1 Suíte)" ou "1 Suíte"
  const suitesMatch = pageText.match(/sendo\s*(\d+)\s*Su[íi]te/i) || pageText.match(/(\d+)\s*Su[íi]te/i);
  const suites = suitesMatch ? parseInt(suitesMatch[1]) : 0;
  console.log(`   Debug Suítes: "${suitesMatch ? suitesMatch[0] : 'null'}" => ${suites}`);
  
  // Banheiros - formato "WC Social:1 WC Serv.:1" - texto pode estar colado
  // O texto está como "WC Social:1WC Serv.: 11Vaga" onde primeiro "1" é o valor
  const wcSocialMatch = pageText.match(/WC\s*Social[:\s]*(\d)/i);
  // Para WC Serv, o texto é "WC Serv.: 11Vaga" - pegamos o primeiro dígito após "WC Serv"
  const wcServMatch = pageText.match(/WC\s*Serv[^0-9]*(\d)/i);
  let banheiros = (wcSocialMatch ? parseInt(wcSocialMatch[1]) : 0) + 
                  (wcServMatch ? parseInt(wcServMatch[1]) : 0);
  // Fallback: se não encontrar WC, tentar "X Banheiro(s)"
  if (banheiros === 0) {
    const banhMatch = pageText.match(/(\d)\s*Banheiro/i);
    if (banhMatch) banheiros = parseInt(banhMatch[1]);
  }
  console.log(`   Debug Banheiros: wcSocial="${wcSocialMatch ? wcSocialMatch[1] : '0'}" wcServ="${wcServMatch ? wcServMatch[1] : '0'}" => ${banheiros}`);
  
  // Vagas - pegar só 1 dígito antes de "Vaga"
  const vagasMatch = pageText.match(/(\d)(?!\d)\s*Vaga/i);
  const vagas = vagasMatch ? parseInt(vagasMatch[1]) : 0;
  
  // Salas - pegar só 1 dígito antes de "Sala"
  const salasMatch = pageText.match(/(\d)(?!\d)\s*Sala(?!s)/i);
  const salas = salasMatch ? parseInt(salasMatch[1]) : 0;
  
  // Descrição - buscar seção DESCRIÇÃO no texto (pode estar colado)
  let descricao = '';
  // Texto pode ser "DescriçãoIPANEMA - Apartamento..." sem espaço
  const descMatch = pageText.match(/DESCRI[CÇ][AÃ]O\s*([\s\S]*?)(?=COMODIDADES|Comodidades|Ver\s*mais|window\.|$)/i);
  if (descMatch) {
    descricao = descMatch[1].trim().substring(0, 3000);
  }
  console.log(`   Debug Descrição: ${descricao.substring(0, 100)}...`);
  
  // Comodidades - extrair da seção COMODIDADES (texto está colado)
  let comodidades = [];
  // Texto pode estar como "ComodidadesAcesso 24 HorasAmbientes Integrados..."
  const comodidadesMatch = pageText.match(/COMODIDADES([\s\S]*?)(?=FOTOS|LOCALIZAÇÃO|VER GALERIA|window\.|$)/i);
  if (comodidadesMatch) {
    const rawText = comodidadesMatch[1];
    
    // Lista de comodidades conhecidas para extração precisa
    const comodidadesConhecidas = [
      'Acesso 24 Horas', 'Ambientes Integrados', 'Área de Serviço', 
      'Armário Cozinha', 'Armário Embutido', 'Banheiro Empregada',
      'Closet', 'Hall de Entrada', 'Interfone', 'Móveis Planejados',
      'Piscina', 'Academia', 'Churrasqueira', 'Portaria 24h',
      'Playground', 'Salão de Festas', 'Varanda', 'Vista Mar',
      'Elevador', 'Garagem', 'Ar Condicionado', 'Aquecimento',
      'Sauna', 'Porteiro', 'Zelador', 'Jardim'
    ];
    
    comodidadesConhecidas.forEach(c => {
      // Case-insensitive match
      const regex = new RegExp(c.replace(/\s+/g, '\\s*'), 'i');
      if (regex.test(rawText)) {
        comodidades.push(c);
      }
    });
  }
  console.log(`   Debug Comodidades: ${comodidades.length} encontradas: ${comodidades.join(', ')}`);
  
  // Imagens - extrair todas as URLs de imagens do imóvel
  const images = [];
  $('img').each((i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (src && 
        src.includes('sergiocastro') && 
        !src.includes('logo') && 
        !src.includes('svg') &&
        !src.includes('loja_') &&
        !src.includes('selo_') &&
        !src.includes('divisor') &&
        !src.includes('footer')) {
      images.push(src);
    }
  });
  
  // Buscar imagens em data-attributes e backgrounds
  $('[data-src], [data-image], [style*="background"]').each((i, el) => {
    const dataSrc = $(el).attr('data-src') || $(el).attr('data-image') || '';
    if (dataSrc && dataSrc.includes('sergiocastro') && !dataSrc.includes('logo')) {
      images.push(dataSrc);
    }
    
    const style = $(el).attr('style') || '';
    const bgMatch = style.match(/url\(['"]?([^'")\s]+)['"]?\)/i);
    if (bgMatch && bgMatch[1].includes('sergiocastro') && !bgMatch[1].includes('logo')) {
      images.push(bgMatch[1]);
    }
  });
  
  // Buscar imagens em links de galeria
  $('a[href*="imovel"], a[data-fancybox], a[data-lightbox]').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href.match(/\.(jpg|jpeg|png|webp)/i) && href.includes('sergiocastro')) {
      images.push(href);
    }
  });
  
  // Remover duplicatas
  const uniqueImages = [...new Set(images)];
  
  // Tipo de imóvel
  const tipoMatch = title.match(/apartamento|casa|cobertura|terreno|sobrado|flat/i);
  const tipo = tipoMatch ? tipoMatch[0].toLowerCase() : 'imovel';
  
  // Bairro e cidade
  const localMatch = address.match(/em\s+([^,]+),\s*([^-]+)\s*-\s*(\w+)/i);
  const bairro = localMatch ? localMatch[1].trim() : '';
  const cidade = localMatch ? localMatch[2].trim() : '';
  const estado = localMatch ? localMatch[3].trim() : '';
  
  const data = {
    code,
    title,
    address,
    price,
    condominio,
    iptu,
    iptuParcelas,
    area,
    quartos,
    suites,
    banheiros,
    vagas,
    salas,
    descricao,
    comodidades,
    images: uniqueImages,
    tipo,
    bairro,
    cidade,
    estado,
    finalidade: 'venda',
    source: 'sergiocastro',
    sourceUrl: url
  };
  
  console.log(`📊 DADOS EXTRAÍDOS:`);
  console.log(`   Código: ${data.code}`);
  console.log(`   Título: ${data.title}`);
  console.log(`   Endereço: ${data.address}`);
  console.log(`   Preço: R$ ${data.price.toLocaleString('pt-BR')}`);
  console.log(`   Condomínio: R$ ${data.condominio.toLocaleString('pt-BR')}`);
  console.log(`   IPTU: ${data.iptuParcelas}x R$ ${data.iptu.toLocaleString('pt-BR')}`);
  console.log(`   Área: ${data.area}m²`);
  console.log(`   Quartos: ${data.quartos} (${data.suites} suítes)`);
  console.log(`   Banheiros: ${data.banheiros}`);
  console.log(`   Vagas: ${data.vagas}`);
  console.log(`   Comodidades: ${data.comodidades.length}`);
  console.log(`   Imagens: ${data.images.length}`);
  
  // Baixar imagens
  if (data.images.length > 0) {
    console.log('\n📸 Baixando imagens...');
    const imagesBase64 = [];
    
    for (let i = 0; i < Math.min(data.images.length, 10); i++) {
      const imgUrl = data.images[i];
      try {
        const fullUrl = imgUrl.startsWith('http') ? imgUrl : `https://www.sergiocastro.com.br${imgUrl}`;
        console.log(`   [${i + 1}/${Math.min(data.images.length, 10)}] Baixando...`);
        const base64 = await downloadImageToBase64(fullUrl);
        imagesBase64.push({
          url: fullUrl,
          base64,
          order: i
        });
        console.log(`   ✅ OK (${(base64.length / 1024).toFixed(0)} KB)`);
      } catch (err) {
        console.log(`   ⚠️ Erro: ${err.message}`);
      }
    }
    
    data.imagesBase64 = imagesBase64;
    console.log(`\n✅ ${imagesBase64.length} imagens baixadas`);
  }
  
  return data;
}

/**
 * Salva os dados no Supabase
 */
async function saveToSupabase(data) {
  console.log('\n💾 Salvando no Supabase...');
  
  const record = {
    code: data.code,
    title: data.title,
    address: data.address,
    price: data.price,
    condominio: data.condominio,
    iptu: data.iptu,
    iptu_parcelas: data.iptuParcelas,
    area_sqm: data.area,
    bedrooms: data.quartos,
    suites: data.suites,
    bathrooms: data.banheiros,
    parking_spots: data.vagas,
    living_rooms: data.salas,
    description: data.descricao,
    amenities: data.comodidades,
    images: data.images,
    images_base64: data.imagesBase64 || [],
    property_type: data.tipo,
    neighborhood: data.bairro,
    city: data.cidade,
    state: data.estado,
    purpose: data.finalidade,
    source: data.source,
    source_url: data.sourceUrl,
    scraped_at: new Date().toISOString()
  };
  
  const { data: result, error } = await supabase
    .from('scraped_properties')
    .upsert(record, { onConflict: 'code' })
    .select();
  
  if (error) {
    console.error('❌ Erro ao salvar:', error.message);
    
    if (error.message.includes('relation') || error.code === '42P01') {
      console.log('\n⚠️ Tabela não existe! Execute o SQL no Supabase SQL Editor:');
      console.log('   Arquivo: _SQL_CREATE_SCRAPED_PROPERTIES.sql\n');
    }
    
    // Salvar como JSON local
    fs.writeFileSync('scraped_property.json', JSON.stringify(data, null, 2));
    console.log('✅ Dados salvos em scraped_property.json');
    return null;
  }
  
  console.log('✅ Salvo com sucesso! ID:', result?.[0]?.id);
  return result?.[0];
}

/**
 * Main
 */
async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🏠 SCRAPER SERGIO CASTRO IMÓVEIS - POC RENDIZY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const data = await scrapeProperty(TARGET_URL);
    
    const saved = await saveToSupabase(data);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    if (saved) {
      console.log('✅ SCRAPING CONCLUÍDO COM SUCESSO!');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`\n🔗 Acesse: http://localhost:3000/sergiocastro/${data.code}`);
    } else {
      console.log('⚠️ SCRAPING CONCLUÍDO (dados salvos localmente)');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('\n📋 Próximos passos:');
      console.log('   1. Execute o SQL: _SQL_CREATE_SCRAPED_PROPERTIES.sql');
      console.log('   2. Rode novamente: node scripts/scrape-sergiocastro.cjs');
      console.log('   3. Acesse: http://localhost:3000/sergiocastro');
    }
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
  }
}

main();
