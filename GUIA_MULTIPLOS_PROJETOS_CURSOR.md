# 🚀 Guia: Trabalhar com Múltiplos Projetos no Cursor

## 📋 Índice
1. [Método 1: Múltiplas Janelas do Cursor (Recomendado)](#método-1-múltiplas-janelas-do-cursor-recomendado)
2. [Método 2: Workspaces do Cursor](#método-2-workspaces-do-cursor)
3. [Método 3: Perfis Separados](#método-3-perfis-separados)
4. [Método 4: Organização por Pastas](#método-4-organização-por-pastas)
5. [Boas Práticas](#boas-práticas)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Método 1: Múltiplas Janelas do Cursor (Recomendado)

### Como fazer:
1. **Abra o primeiro projeto normalmente**
   - `File > Open Folder` ou `Ctrl+K Ctrl+O`
   - Selecione a pasta do projeto 1

2. **Abra uma NOVA janela para o segundo projeto**
   - `File > New Window` ou `Ctrl+Shift+N`
   - Na nova janela: `File > Open Folder`
   - Selecione a pasta do projeto 2

3. **Resultado:**
   - ✅ Cada projeto em uma janela separada
   - ✅ Contexto isolado (AI não confunde projetos)
   - ✅ Histórico de chat separado
   - ✅ Configurações independentes

### Vantagens:
- ✅ **Isolamento completo** - Zero interferência entre projetos
- ✅ **Fácil alternar** - Alt+Tab entre janelas
- ✅ **Contexto preservado** - Cada janela mantém seu próprio estado
- ✅ **Sem configuração extra** - Funciona imediatamente

### Exemplo Visual:
```
┌─────────────────────┐  ┌─────────────────────┐
│  Cursor - Projeto A │  │  Cursor - Projeto B │
│                     │  │                     │
│  /projeto-a/        │  │  /projeto-b/        │
│  - src/             │  │  - app/             │
│  - package.json      │  │  - components/      │
│                     │  │                     │
│  Chat: Projeto A    │  │  Chat: Projeto B    │
└─────────────────────┘  └─────────────────────┘
```

---

## 🔧 Método 2: Workspaces do Cursor

### Como criar um Workspace:
1. **Abra o primeiro projeto**
2. **Salve como Workspace:**
   - `File > Save Workspace As...`
   - Nome: `projeto-a.code-workspace`
   - Salve na raiz do projeto

3. **Crie workspace para o segundo projeto:**
   - Abra o projeto 2
   - `File > Save Workspace As...`
   - Nome: `projeto-b.code-workspace`

4. **Abrir workspaces:**
   - `File > Open Workspace from File...`
   - Selecione o `.code-workspace` desejado

### Estrutura do arquivo `.code-workspace`:
```json
{
  "folders": [
    {
      "path": "."
    }
  ],
  "settings": {
    "files.exclude": {
      "**/node_modules": true
    }
  }
}
```

### Vantagens:
- ✅ Configurações específicas por projeto
- ✅ Pastas múltiplas em um workspace (se necessário)
- ✅ Fácil alternar entre projetos salvos

---

## 👤 Método 3: Perfis Separados

### Como criar perfis:
1. **Abra Command Palette:**
   - `Ctrl+Shift+P` (Windows/Linux)
   - `Cmd+Shift+P` (Mac)

2. **Crie um novo perfil:**
   - Digite: `Preferences: Create Profile`
   - Nome: `Projeto A`
   - Repita para criar `Projeto B`

3. **Alternar entre perfis:**
   - `Ctrl+Shift+P` > `Preferences: Switch Profile`
   - Selecione o perfil desejado

### Vantagens:
- ✅ Extensões separadas por perfil
- ✅ Configurações isoladas
- ✅ Tema e aparência diferentes

### Desvantagens:
- ⚠️ Mais complexo de gerenciar
- ⚠️ Pode ser confuso alternar

---

## 📁 Método 4: Organização por Pastas

### Estrutura recomendada:
```
C:\Users\seu-usuario\
├── Projetos\
│   ├── ProjetoA\
│   │   ├── .git\
│   │   ├── src\
│   │   └── package.json
│   │
│   └── ProjetoB\
│       ├── .git\
│       ├── app\
│       └── package.json
│
└── Workspaces\
    ├── projeto-a.code-workspace
    └── projeto-b.code-workspace
```

### Boas práticas:
1. **Separação clara de pastas**
   - Cada projeto em sua própria pasta
   - Nomes descritivos

2. **Git separado**
   - Cada projeto com seu próprio `.git`
   - Repositórios independentes

3. **Node modules isolados**
   - Cada projeto com seu próprio `node_modules`
   - Nunca compartilhar dependências

---

## ✅ Boas Práticas

### 1. **Nomes Descritivos**
```
❌ RUIM:
- projeto/
- teste/
- novo/

✅ BOM:
- rendizy-producao/
- rendizy-desenvolvimento/
- projeto-cliente-xyz/
```

### 2. **Variáveis de Ambiente Separadas**
```bash
# Projeto A
.env.local          # Desenvolvimento local
.env.production     # Produção

# Projeto B
.env.local          # Desenvolvimento local
.env.staging        # Staging
```

### 3. **Portas Diferentes**
```json
// Projeto A - package.json
{
  "scripts": {
    "dev": "vite --port 5173"
  }
}

// Projeto B - package.json
{
  "scripts": {
    "dev": "vite --port 5174"
  }
}
```

### 4. **Git Branches Separados**
```bash
# Projeto A
git checkout -b feature/nova-funcionalidade

# Projeto B (em outra janela)
git checkout -b hotfix/correcao-critica
```

### 5. **Configurações do Cursor por Projeto**
Crie `.cursorrules` em cada projeto:

**Projeto A - `.cursorrules`:**
```
Este é o projeto RENDIZY - Sistema de gestão hoteleira.
Stack: React, TypeScript, Supabase.
Foco: Integrações WhatsApp e CRM.
```

**Projeto B - `.cursorrules`:**
```
Este é o projeto CLIENTE-XYZ - Landing page.
Stack: Next.js, Tailwind CSS.
Foco: SEO e performance.
```

---

## 🔍 Troubleshooting

### Problema: AI confunde projetos
**Solução:**
- Use múltiplas janelas (Método 1)
- Adicione `.cursorrules` em cada projeto
- Use nomes descritivos nas pastas

### Problema: Configurações conflitantes
**Solução:**
- Use workspaces (Método 2)
- Ou crie perfis separados (Método 3)

### Problema: Portas em conflito
**Solução:**
- Configure portas diferentes em cada projeto
- Use variáveis de ambiente

### Problema: Git confuso
**Solução:**
- Cada projeto em pasta separada
- Cada projeto com seu próprio `.git`
- Nunca trabalhe em dois projetos no mesmo repositório

### Problema: Dependências conflitantes
**Solução:**
- Cada projeto com seu próprio `node_modules`
- Nunca compartilhe `node_modules` entre projetos
- Use `npm install` ou `yarn install` em cada projeto

---

## 🎯 Recomendação Final

**Para a maioria dos casos, use o MÉTODO 1 (Múltiplas Janelas):**

1. ✅ Mais simples
2. ✅ Isolamento completo
3. ✅ Zero configuração
4. ✅ Funciona imediatamente
5. ✅ Contexto preservado

**Quando usar outros métodos:**
- **Workspaces:** Quando precisa de configurações muito específicas
- **Perfis:** Quando precisa de extensões diferentes por projeto
- **Pastas:** Sempre (organização básica)

---

## 📝 Checklist para Novo Projeto

Ao iniciar um novo projeto:

- [ ] Criar pasta separada com nome descritivo
- [ ] Abrir em nova janela do Cursor (`Ctrl+Shift+N`)
- [ ] Criar `.cursorrules` com contexto do projeto
- [ ] Configurar porta diferente (se aplicável)
- [ ] Inicializar Git separado (`git init`)
- [ ] Criar `.env.local` específico
- [ ] Instalar dependências (`npm install`)
- [ ] Testar que não interfere com outros projetos

---

## 💡 Dica Extra: Atalhos Úteis

| Ação | Atalho |
|------|--------|
| Nova janela | `Ctrl+Shift+N` |
| Abrir pasta | `Ctrl+K Ctrl+O` |
| Alternar janelas | `Alt+Tab` |
| Command Palette | `Ctrl+Shift+P` |
| Salvar workspace | `Ctrl+K S` |

---

**Última atualização:** 2025-01-28
**Versão:** 1.0





