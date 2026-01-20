# 🎨 Templates de Sites - RENDIZY v1.0.103.187

## 📋 Templates Disponíveis

Temos **3 templates profissionais** prontos para importar no sistema de Sites por Cliente:

---

## 1️⃣ TEMPLATE MODERNO

**Arquivo:** `site-moderno.tsx`

### 🎨 Características de Design
- Design clean e minimalista
- Gradientes vibrantes (azul/roxo)
- Animações suaves e modernas
- Cards flutuantes com efeitos hover
- Tipografia arrojada

### 👥 Ideal Para
- Imobiliárias jovens e startups
- Público tech-savvy
- Empresas inovadoras
- Marcas descoladas

### 🎨 Paleta de Cores
- **Primária:** Gradiente azul (#3B82F6) → roxo (#9333EA)
- **Secundária:** Cinza claro (#F9FAFB)
- **Acentos:** Rosa (#EC4899), Verde (#10B981)

### ✨ Recursos
- Hero com cards flutuantes
- Busca avançada com filtros expansíveis
- Cards de imóveis com favoritos
- Benefícios em grid 4 colunas
- Depoimentos com avatares
- CTA impactante
- Footer moderno

---

## 2️⃣ TEMPLATE CLÁSSICO

**Arquivo:** `site-classico.tsx`

### 🎨 Características de Design
- Design tradicional e profissional
- Tons neutros e sóbrios
- Estrutura clara e organizada
- Ênfase em credibilidade
- Tipografia elegante

### 👥 Ideal Para
- Imobiliárias estabelecidas
- Público conservador
- Empresas tradicionais
- Marcas com história

### 🎨 Paleta de Cores
- **Primária:** Azul escuro (#1E3A8A)
- **Secundária:** Cinza (#6B7280)
- **Fundo:** Branco (#FFFFFF) e cinza claro (#F3F4F6)

### ✨ Recursos
- Top bar com contatos
- Header com logo profissional
- Hero com overlay escuro
- Busca em formulário estruturado
- Cards de imóveis em lista horizontal
- Seção "Sobre" com números
- Diferenciais em grade
- Formulário de contato completo
- Footer corporativo

---

## 3️⃣ TEMPLATE LUXO

**Arquivo:** `site-luxo.tsx`

### 🎨 Características de Design
- Design premium e sofisticado
- Fundo escuro (dark mode)
- Detalhes em dourado
- Espaçamento generoso
- Tipografia requintada

### 👥 Ideal Para
- Imobiliárias de alto padrão
- Propriedades exclusivas
- Público VIP
- Marcas premium

### 🎨 Paleta de Cores
- **Primária:** Preto (#000000)
- **Acentos:** Dourado (#CA8A04)
- **Secundária:** Cinza escuro (#1F2937)

### ✨ Recursos
- Header com fundo escuro e detalhes dourados
- Hero full screen com animações
- Busca premium com styling luxuoso
- Cards de propriedades exclusivas
- Badges "EXCLUSIVO" e ratings 5.0
- Seção de experiências VIP
- Testemunhos de clientes VIP
- Contato personalizado
- Footer premium

---

## 🚀 Como Usar os Templates

### Método 1: Copiar e Colar (Recomendado)

1. **Abra o arquivo** do template desejado
2. **Copie TODO o código** (Ctrl+A → Ctrl+C)
3. **No RENDIZY Admin:**
   - Vá em "Edição de site" (menu lateral)
   - Clique "Criar Novo Site"
   - Preencha dados do cliente
   - Clique no botão "Código"
   - Cole o código copiado
   - Clique "Enviar Código"
4. **✅ Pronto!** Site integrado ao backend RENDIZY

### Método 2: Customizar Antes

1. **Copie o código** do template
2. **Cole em um editor** (VSCode, etc)
3. **Customize:**
   - Altere cores (busque por classes como `from-blue-600`, `bg-yellow-600`, etc)
   - Mude textos (nome da imobiliária, slogans, etc)
   - Ajuste imagens
4. **Copie o código customizado**
5. **Upload no RENDIZY** (passos acima)

---

## 🎨 Customização de Cores

### Template Moderno
Buscar e substituir:
- `from-blue-600 to-purple-600` → Cores do gradiente principal
- `text-blue-600` → Cor de acentos e textos
- `bg-blue-600` → Cor de botões

### Template Clássico
Buscar e substituir:
- `bg-blue-900` → Cor principal (azul escuro)
- `text-blue-900` → Textos em azul
- `border-blue-900` → Bordas

### Template Luxo
Buscar e substituir:
- `yellow-600` → Cor dourada (trocar por outra cor premium)
- `from-yellow-600 to-yellow-500` → Gradiente dourado
- `bg-black` → Fundo (pode mudar para cinza escuro)

---

## 🔌 Integração com RENDIZY

### O que já vem integrado automaticamente:

✅ **Hooks do RENDIZY:**
```tsx
const { properties, loading } = useRendizyData();
const { calculatePrice, createReservation } = useRendizyBooking();
```

✅ **Busca de imóveis:**
```tsx
const { searchProperties } = useRendizyData();
const results = await searchProperties({ location, checkIn, checkOut, guests });
```

✅ **Dados reais:**
- Imóveis do `organizationId` do cliente
- Preços da precificação sazonal
- Calendário de disponibilidade
- Motor de reservas funcional

### O que você pode personalizar:

🎨 **Visual:**
- Cores, fontes, espaçamentos
- Layout dos componentes
- Textos e conteúdos
- Imagens e ícones

❌ **O que NÃO deve mudar:**
- Imports do ClientSiteWrapper
- Chamadas dos hooks (useRendizyData, etc)
- Estrutura das funções (searchProperties, etc)

---

## 📊 Comparação dos Templates

| Característica | Moderno | Clássico | Luxo |
|----------------|---------|----------|------|
| **Cores** | Vibrantes | Neutras | Dourado/Preto |
| **Estilo** | Jovem | Tradicional | Premium |
| **Público** | 18-35 anos | 35-60 anos | VIP |
| **Animações** | Muitas | Poucas | Sutis |
| **Tipografia** | Arrojada | Elegante | Requintada |
| **Layout** | Fluido | Estruturado | Espaçoso |
| **Complexidade** | Média | Baixa | Alta |

---

## 💡 Dicas de Uso

### 1. Escolha o Template Certo

```
Cliente é startup de tecnologia? → MODERNO
Cliente é imobiliária tradicional? → CLÁSSICO
Cliente tem propriedades de luxo? → LUXO
```

### 2. Personalize Textos

Busque e substitua:
- Nome da empresa
- Slogans
- Telefones
- E-mails
- Endereços

### 3. Adicione Imagens Reais

Os templates usam placeholders. Substitua por:
- Logo real do cliente
- Fotos reais dos imóveis
- Fotos da equipe
- Fotos do escritório

### 4. Teste Responsividade

Todos os templates são responsivos. Teste em:
- Desktop (1920px)
- Tablet (768px)
- Mobile (375px)

---

## 🔧 Troubleshooting

### Problema: Imagens não aparecem
**Solução:** Verifique se as URLs estão corretas ou use Unsplash

### Problema: Cores não mudaram
**Solução:** Busque por TODAS as ocorrências da cor antiga

### Problema: Site não mostra imóveis
**Solução:** Verifique se o organizationId está correto

### Problema: Erro ao importar
**Solução:** Copie EXATAMENTE todo o código, incluindo imports

---

## 📱 Contato e Suporte

Para dúvidas sobre os templates:
1. Leia a documentação em `/GUIA_COMPLETO_SITES_POR_CLIENTE_v1.0.103.187.md`
2. Consulte `/START_HERE_v1.0.103.187.md`
3. Veja `/⚡_COMECE_AGORA_SITES_POR_CLIENTE.md`

---

## ✅ Checklist de Importação

- [ ] Escolhi o template certo para o cliente
- [ ] Li o código e entendi a estrutura
- [ ] Personalizei cores (se necessário)
- [ ] Alterei textos para o cliente
- [ ] Criei o site no RENDIZY Admin
- [ ] Copiei TODO o código do template
- [ ] Colei no modal de "Código"
- [ ] Cliquei "Enviar Código"
- [ ] Testei o site no navegador
- [ ] Site mostra imóveis reais
- [ ] Motor de reservas funciona

---

**Templates criados em:** 31 de outubro de 2025  
**Versão:** v1.0.103.187  
**Status:** ✅ Prontos para usar
