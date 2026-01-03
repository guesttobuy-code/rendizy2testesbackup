# 📁 Como Criar um Novo Workspace no Cursor

## 🎯 Método 1: Criar Workspace a partir de uma Pasta Existente

### Passo a Passo:

1. **Abra a pasta do projeto no Cursor**
   - `File > Open Folder` ou `Ctrl+K Ctrl+O`
   - Selecione a pasta do seu projeto

2. **Salve como Workspace**
   - `File > Save Workspace As...` ou `Ctrl+K S`
   - Escolha um nome descritivo: `meu-projeto.code-workspace`
   - Salve na **raiz do projeto** (recomendado)

3. **Pronto!** 
   - Agora você pode abrir este workspace a qualquer momento
   - `File > Open Workspace from File...`

---

## 🆕 Método 2: Criar Workspace Novo (Vazio)

### Passo a Passo:

1. **Crie uma nova pasta para o projeto**
   ```
   C:\Projetos\meu-novo-projeto\
   ```

2. **Abra essa pasta no Cursor**
   - `File > Open Folder`
   - Selecione a pasta criada

3. **Salve como Workspace**
   - `File > Save Workspace As...`
   - Nome: `meu-novo-projeto.code-workspace`
   - Salve dentro da pasta do projeto

4. **Inicialize o projeto**
   - Crie os arquivos necessários
   - Instale dependências
   - Configure Git

---

## 📝 Método 3: Criar Workspace Manualmente (Avançado)

### 1. Crie o arquivo `.code-workspace`:

```json
{
  "folders": [
    {
      "name": "Projeto Principal",
      "path": "."
    }
  ],
  "settings": {
    "files.exclude": {
      "**/node_modules": true,
      "**/.git": false
    },
    "search.exclude": {
      "**/node_modules": true
    }
  },
  "extensions": {
    "recommendations": [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode"
    ]
  }
}
```

### 2. Salve como `meu-projeto.code-workspace`

### 3. Abra no Cursor:
   - `File > Open Workspace from File...`
   - Selecione o arquivo `.code-workspace`

---

## 🎨 Exemplo Prático: Workspace para Projeto React

### Estrutura do Workspace:

```json
{
  "folders": [
    {
      "name": "Frontend",
      "path": "."
    },
    {
      "name": "Backend",
      "path": "../backend"
    }
  ],
  "settings": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "typescript.tsdk": "node_modules/typescript/lib",
    "files.exclude": {
      "**/node_modules": true,
      "**/.next": true,
      "**/dist": true
    }
  },
  "extensions": {
    "recommendations": [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "bradlc.vscode-tailwindcss"
    ]
  }
}
```

---

## 🔧 Configurações Úteis para Workspace

### Excluir arquivos da busca:
```json
{
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true,
    "**/coverage": true
  }
}
```

### Configurar formatação:
```json
{
  "settings": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    }
  }
}
```

### Múltiplas pastas no mesmo workspace:
```json
{
  "folders": [
    {
      "name": "Frontend",
      "path": "./frontend"
    },
    {
      "name": "Backend",
      "path": "./backend"
    },
    {
      "name": "Shared",
      "path": "./shared"
    }
  ]
}
```

---

## 📂 Onde Salvar o Workspace?

### ✅ Recomendado: Na raiz do projeto
```
meu-projeto/
├── .code-workspace          ← Aqui
├── src/
├── package.json
└── README.md
```

### ❌ Não recomendado: Fora do projeto
```
C:\Workspaces\
└── meu-projeto.code-workspace  ← Pode causar problemas de caminho
```

---

## 🚀 Atalhos Rápidos

| Ação | Atalho |
|------|--------|
| Salvar Workspace | `Ctrl+K S` |
| Abrir Workspace | `Ctrl+K Ctrl+O` |
| Abrir Workspace de Arquivo | `Ctrl+R` (depois selecione o .code-workspace) |

---

## 💡 Dicas

1. **Nome descritivo**: Use nomes que identifiquem o projeto
   - ✅ `rendizy-producao.code-workspace`
   - ❌ `workspace1.code-workspace`

2. **Versionar o workspace**: Adicione ao `.gitignore` se necessário
   ```gitignore
   *.code-workspace
   ```

3. **Workspaces múltiplos**: Você pode ter vários workspaces para o mesmo projeto
   - `rendizy-dev.code-workspace` (desenvolvimento)
   - `rendizy-prod.code-workspace` (produção)

4. **Compartilhar configurações**: Workspaces podem ser commitados no Git para padronizar o ambiente da equipe

---

## 🔍 Troubleshooting

### Problema: Workspace não abre
**Solução:**
- Verifique se os caminhos estão corretos
- Use caminhos relativos quando possível
- Verifique se as pastas existem

### Problema: Configurações não aplicam
**Solução:**
- Verifique a sintaxe JSON (use validador)
- Reinicie o Cursor após salvar
- Verifique se não há conflito com configurações de usuário

### Problema: Extensões não instalam
**Solução:**
- As extensões em `recommendations` são sugestões
- Instale manualmente se necessário
- Verifique se as extensões existem no marketplace

---

## 📋 Checklist para Novo Workspace

- [ ] Pasta do projeto criada/organizada
- [ ] Workspace salvo com nome descritivo
- [ ] Configurações básicas definidas
- [ ] Extensões recomendadas adicionadas
- [ ] Arquivos excluídos configurados (node_modules, etc)
- [ ] Workspace testado (abrir/fechar funciona)
- [ ] Documentado no README (opcional)

---

**Última atualização:** 2025-01-28





