# 📦 Explicação: Extrair ZIP para Storage e Servir via URLs Públicas

## 🎯 O Problema Atual

**Situação atual:**
1. Usuário faz upload de um ZIP com o site compilado
2. O ZIP é salvo no Supabase Storage (bucket `client-sites`)
3. Quando alguém acessa o site:
   - Edge Function baixa o ZIP
   - Extrai HTML e assets **na memória** (temporário)
   - Tenta servir via Edge Function
   - ❌ **Problema:** Edge Function força `Content-Type: text/plain` para JS/CSS

**Por que não funciona:**
- Navegadores modernos bloqueiam módulos ES6 (`type="module"`) se o Content-Type não for `application/javascript`
- Edge Functions do Supabase sobrescrevem o Content-Type, mesmo que definamos corretamente

---

## ✅ Solução: Extrair ZIP para Storage

### **O que significa "Extrair os arquivos do ZIP para o Storage"?**

**Atualmente:**
```
ZIP salvo no Storage:
📦 client-sites/
   └── e78c7bb9-7823-44b8-9aee-95c9b073e7b7/
       └── 1764635017612-project-bolt-sb1-umwb93aw__3__com_dist.zip.zip
```

**Com a solução:**
```
ZIP + Arquivos extraídos no Storage:
📦 client-sites/
   └── e78c7bb9-7823-44b8-9aee-95c9b073e7b7/
       ├── archive.zip (ZIP original - mantém para backup)
       └── extracted/
           ├── index.html
           ├── assets/
           │   ├── index-ChhK5BXo.js
           │   ├── index-lvFSWcOk.css
           │   └── vite.svg
           └── medhome_logo_icone.png
```

### **O que significa "Servir via URL pública do Storage"?**

**Atualmente (não funciona):**
```
URL: https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/.../assets/medhome/dist/assets/index-ChhK5BXo.js
Content-Type: text/plain ❌ (forçado pela Edge Function)
```

**Com a solução:**
```
URL: https://odcgnzfremrqnvtitpcc.supabase.co/storage/v1/object/public/client-sites/e78c7bb9-7823-44b8-9aee-95c9b073e7b7/extracted/assets/index-ChhK5BXo.js
Content-Type: application/javascript ✅ (preservado pelo Storage)
```

---

## 🔧 O Que Precisa Ser Feito

### **1. Código (Backend - Edge Function)**

**Quando o ZIP é feito upload:**
1. ✅ Baixar o ZIP do Storage (já fazemos)
2. ✅ Extrair arquivos do ZIP (já fazemos)
3. ❌ **NOVO:** Fazer upload de cada arquivo extraído para o Storage
4. ❌ **NOVO:** Salvar caminhos dos arquivos no banco SQL

**Código necessário:**
```typescript
// Após extrair o ZIP
const zip = await JSZip.loadAsync(arrayBuffer);

// Para cada arquivo no ZIP
for (const [path, file] of Object.entries(zip.files)) {
  if (!file.dir) {
    // Ler conteúdo do arquivo
    const content = await file.async("arraybuffer");
    
    // Upload para Storage
    const storagePath = `${organizationId}/extracted/${path}`;
    await supabase.storage
      .from("client-sites")
      .upload(storagePath, content, {
        contentType: getContentType(path), // JS, CSS, etc
        upsert: true // Sobrescrever se existir
      });
  }
}
```

### **2. Configuração do Storage (Supabase Dashboard)**

**Precisa configurar:**
1. ✅ Bucket `client-sites` já existe
2. ❌ **NOVO:** Tornar o bucket **público** OU criar políticas RLS públicas

**Opção A: Bucket Público (mais simples)**
- No Supabase Dashboard → Storage → `client-sites`
- Marcar como "Public bucket"
- Qualquer arquivo fica acessível via URL pública

**Opção B: Políticas RLS (mais seguro)**
- Criar política RLS que permite leitura pública apenas para arquivos em `*/extracted/*`
- Mais controle, mas requer configuração SQL

### **3. Ajustar HTML (Backend - Edge Function)**

**Quando servir o HTML:**
- Ajustar caminhos no HTML para apontar para URLs do Storage
- Exemplo:
  ```html
  <!-- Antes (não funciona) -->
  <script src="/assets/index-ChhK5BXo.js"></script>
  
  <!-- Depois (funciona) -->
  <script src="https://odcgnzfremrqnvtitpcc.supabase.co/storage/v1/object/public/client-sites/e78c7bb9-7823-44b8-9aee-95c9b073e7b7/extracted/dist/assets/index-ChhK5BXo.js"></script>
  ```

---

## 📋 Resumo: O Que Precisa

### **✅ Apenas Código:**
- ✅ Extrair arquivos do ZIP e fazer upload para Storage
- ✅ Ajustar HTML para usar URLs do Storage
- ✅ Salvar caminhos no banco SQL

### **⚠️ Configuração Manual (uma vez):**
- ⚠️ Tornar bucket público OU criar políticas RLS
- ⚠️ Testar se URLs públicas funcionam

### **❌ Não Precisa:**
- ❌ Servidor adicional
- ❌ CDN externo
- ❌ Configuração de DNS
- ❌ Certificados SSL (Supabase já tem)

---

## 🎯 Vantagens da Solução

1. ✅ **Content-Type correto** - Storage preserva o tipo do arquivo
2. ✅ **Performance melhor** - Arquivos servidos diretamente, sem passar pela Edge Function
3. ✅ **Cache nativo** - Storage tem cache automático
4. ✅ **Escalável** - Storage suporta muitos arquivos
5. ✅ **Simples** - Usa infraestrutura que já temos (Supabase Storage)

---

## 🚀 Próximos Passos

1. Implementar código de extração e upload
2. Configurar bucket como público
3. Ajustar HTML para usar URLs do Storage
4. Testar se o site funciona completamente

**Tempo estimado:** ~30 minutos de implementação + testes

