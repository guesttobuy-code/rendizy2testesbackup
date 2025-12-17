# 🔧 TROUBLESHOOTING - UPLOAD DE FOTOS v1.0.103.307

## 🎯 GUIA DE SOLUÇÃO DE PROBLEMAS

Este documento ajuda a resolver problemas com upload e compressão de fotos.

---

## ✅ COMPORTAMENTO NORMAL

### O que deve acontecer:

1. **Selecionar fotos**
   - Spinner aparece
   - Botão fica "Comprimindo..."
   - Área de upload fica azul claro

2. **Console mostra logs**
   ```
   🗜️ Comprimindo foto.jpg...
   📐 Original: 4032x3024
   📐 Novo: 1920x1440
   ✅ 8.5MB → 1.9MB (-78%)
   ```

3. **Toast de sucesso**
   ```
   ✅ 3 foto(s) adicionada(s) • 2 comprimida(s)
   ```

4. **Fotos aparecem na grid**
   - Preview correto
   - Primeira marcada como capa
   - Possível reordenar

---

## ❌ PROBLEMA 1: Spinner não aparece

### Sintomas:
- Upload acontece mas sem feedback visual
- Botão não muda para "Comprimindo..."
- Área não fica azul

### Causas Possíveis:
1. Cache antigo do navegador
2. CSS não carregado
3. JavaScript desatualizado

### Soluções:

#### 1. Hard Refresh
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

#### 2. Limpar Cache Manualmente
```
Chrome/Edge:
1. Ctrl + Shift + Delete
2. Selecionar "Cached images and files"
3. Selecionar "Last hour"
4. Click "Clear data"
```

#### 3. Verificar Console
```
F12 → Console
Procurar por erros em vermelho
```

---

## ❌ PROBLEMA 2: Fotos não comprimem

### Sintomas:
- Toast diz "X foto(s) adicionada(s)" (sem "comprimida(s)")
- Console não mostra logs de compressão
- Arquivos mantêm tamanho original

### Diagnóstico:

#### Verificar tamanho das fotos:
```javascript
// No console (F12)
// Após selecionar fotos, antes do upload:
console.log('Tamanho:', file.size / 1024 / 1024, 'MB');
```

#### Fotos < 2MB não comprimem
```
✅ NORMAL: Foto de 1.5MB não é comprimida
Console mostra: "File already small enough, skipping compression"
```

#### Fotos > 2MB devem comprimir
```
✅ DEVERIA comprimir mas não comprime?
Verificar erros no console
```

### Soluções:

#### 1. Usar fotos maiores para testar
```
- Use fotos de câmera/celular moderno
- Tamanho ideal para teste: 5-15MB
- Evite screenshots (já são pequenos)
```

#### 2. Verificar função de compressão
```javascript
// No console:
import { compressImage } from './utils/imageCompression';
// Se der erro → problema de importação
```

---

## ❌ PROBLEMA 3: Erro ao comprimir

### Sintomas:
```
Toast: ❌ Erro ao comprimir foto.jpg
Console: "Erro ao comprimir: [mensagem]"
```

### Causas Possíveis:

#### A. Arquivo corrompido
```
Solução: Tentar com outra foto
```

#### B. Formato não suportado
```
Verificar extensão:
✅ .jpg, .jpeg, .png, .webp → OK
❌ .bmp, .gif, .tiff → NÃO suportado

Solução: Converter foto para JPG/PNG
```

#### C. Memória insuficiente
```
Sintoma: Navegador trava ao comprimir
Causa: Foto muito grande + baixa RAM

Solução:
1. Fechar outras abas
2. Fazer upload de 1 foto por vez
3. Usar foto com menor resolução
```

---

## ❌ PROBLEMA 4: Erro "File too large"

### Sintomas:
```
Toast: ❌ Arquivo muito grande (25.0MB). Máximo: 20MB
```

### Causa:
Foto excede limite de 20MB ANTES da compressão

### Solução:

#### Opção A: Reduzir qualidade da foto
```
Photoshop/GIMP:
1. Abrir foto
2. Export/Save for Web
3. Qualidade: 80%
4. Salvar
```

#### Opção B: Reduzir resolução
```
Online: https://www.iloveimg.com/resize-image
1. Upload foto
2. Resize para 4000x3000 (máximo)
3. Download
4. Tentar upload novamente
```

#### Opção C: Comprimir antes
```
Online: https://tinypng.com/
1. Upload foto
2. Download versão comprimida
3. Upload no RENDIZY
```

---

## ❌ PROBLEMA 5: Foto fica com qualidade ruim

### Sintomas:
- Foto parece "pixelada"
- Cores estranhas
- Artefatos visíveis

### Diagnóstico:

#### Verificar tamanho original:
```
Se foto original era 800x600 → Compressão não afeta qualidade
Se foto original era 6000x4000 → Compressão mantém qualidade visual
```

#### Verificar no console:
```
📐 Original dimensions: 800x600
📐 New dimensions: 800x600
^ Não redimensionou (já era pequena)

vs

📐 Original dimensions: 6000x4000
📐 New dimensions: 1920x1280
^ Redimensionou mas mantém qualidade para tela
```

### Soluções:

#### Se qualidade está ruim:
```
1. Use foto original de maior qualidade
2. Tire foto com mais luz
3. Evite zoom digital
4. Use câmera melhor
```

#### Para fotos profissionais:
```
Parâmetros de compressão estão em:
/utils/imageCompression.ts

Defaults:
- maxWidth: 1920px (Full HD)
- maxHeight: 1920px
- quality: 0.85 (85%)

^ Suficiente para 99% dos casos
```

---

## ❌ PROBLEMA 6: Upload trava/demora muito

### Sintomas:
- Spinner gira infinitamente
- Navegador fica lento
- Fotos não aparecem

### Causas:

#### A. Muitas fotos simultaneamente
```
Causa: Upload de 20 fotos grandes ao mesmo tempo
Solução: Fazer upload em lotes de 5-10 fotos
```

#### B. Internet lenta
```
Verificar velocidade: https://fast.com/
Se < 5 Mbps → Upload em lotes menores
```

#### C. Navegador travou
```
Sintoma: Console não responde
Solução:
1. Fechar e reabrir aba
2. Tentar novamente com menos fotos
```

---

## ❌ PROBLEMA 7: Console não mostra logs

### Sintomas:
- Upload funciona
- Mas console vazio (sem logs de compressão)

### Causas:

#### A. Nível de log filtrado
```
Solução:
1. F12 → Console
2. Verificar dropdown de níveis
3. Selecionar "All levels" ou "Verbose"
```

#### B. Console limpo automaticamente
```
Solução:
1. F12 → Console
2. Click na engrenagem ⚙️
3. Desabilitar "Clear on navigation"
4. Desabilitar "Preserve log"
```

---

## 🔍 COMO COLETAR INFORMAÇÕES PARA SUPORTE

### 1. Screenshot do erro
```
- Capturar tela inteira
- Incluir console (F12)
- Incluir toast de erro
```

### 2. Copiar logs do console
```
1. F12 → Console
2. Selecionar todos os logs (Ctrl+A)
3. Copiar (Ctrl+C)
4. Colar em arquivo .txt
```

### 3. Informações da foto
```
- Nome do arquivo
- Tamanho (em MB)
- Formato (.jpg, .png, etc)
- Dimensões (widthxheight)
```

### 4. Informações do navegador
```
Chrome: Menu → Help → About Google Chrome
Edge: Menu → Help → About Microsoft Edge
Firefox: Menu → Help → About Firefox
```

---

## ✅ TESTES DE VALIDAÇÃO

### Teste 1: Foto pequena
```
Arquivo: 500KB .jpg
Esperado: ✅ Upload sem compressão
Console: "File already small enough, skipping compression"
```

### Teste 2: Foto média
```
Arquivo: 3MB .jpg
Esperado: ✅ Comprimir para ~1.8MB
Console: "3.0MB → 1.8MB (-40%)"
```

### Teste 3: Foto grande
```
Arquivo: 10MB .jpg
Esperado: ✅ Comprimir para ~1.9MB
Console: "10.0MB → 1.9MB (-81%)"
```

### Teste 4: Foto muito grande
```
Arquivo: 25MB .jpg
Esperado: ❌ Erro "Máximo 20MB"
Toast: "Arquivo muito grande"
```

### Teste 5: Formato inválido
```
Arquivo: .pdf, .bmp, .gif
Esperado: ❌ Erro "não é uma imagem válida"
Toast: Mensagem de erro
```

---

## 📞 QUANDO PEDIR AJUDA

### Reporte se:
1. Hard refresh não resolve
2. Console mostra erro que você não entende
3. Problema persiste após seguir este guia
4. Comportamento diferente do documentado

### Incluir:
- Screenshot do console
- Logs completos
- Informações do navegador
- Tamanho/formato da foto
- Passos para reproduzir

---

## 🎯 QUICK FIX CHECKLIST

Antes de pedir ajuda, tente:

- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Limpar cache do navegador
- [ ] Testar com foto diferente
- [ ] Testar com foto menor (< 5MB)
- [ ] Verificar console por erros
- [ ] Fechar outras abas
- [ ] Reiniciar navegador
- [ ] Testar em modo anônimo

---

## 📚 DOCUMENTOS RELACIONADOS

```
/⚡_COMPRESSAO_PRONTA_v1.0.103.307.md
  → Guia rápido de uso

/🧪_TESTE_COMPRESSAO_IMAGENS_v1.0.103.307.md
  → Testes detalhados

/🎯_ANTES_E_DEPOIS_COMPRESSAO_v1.0.103.307.md
  → Comparação técnica

/docs/changelogs/CHANGELOG_V1.0.103.307.md
  → Changelog completo
```

---

**Versão:** v1.0.103.307  
**Data:** 05/11/2025  
**Última Atualização:** 05/11/2025
