# 🔍 GUIA: Tela em Branco em Produção

## ❓ O QUE SIGNIFICA TELA EM BRANCO?

Quando você clica em um botão e a tela fica **completamente em branco**, isso significa:

### **Problema Principal:**
✅ **Erro JavaScript não tratado que quebra o React**

O React parou de renderizar porque encontrou um erro não capturado. Em vez de mostrar uma mensagem de erro, o React simplesmente **para de renderizar**, resultando em uma tela em branco.

---

## 🔴 CAUSAS COMUNS

### **1. Erro em Handler de Botão**
```typescript
// ❌ PROBLEMA: Erro não tratado
const handleClick = async () => {
  const data = await api.getData();
  setData(data.property.nested.value); // ← Se 'property' for undefined, QUEBRA
};
```

**O que acontece:**
- Clique no botão → executa `handleClick`
- `data.property` é `undefined`
- Tentativa de acessar `.nested` → **erro JavaScript**
- React não sabe como lidar → **tela em branco**

---

### **2. Erro em Renderização**
```typescript
// ❌ PROBLEMA: Erro durante render
function Component() {
  const data = getData(); // ← Retorna undefined
  return <div>{data.name.toUpperCase()}</div>; // ← QUEBRA se data.name não existir
}
```

**O que acontece:**
- React tenta renderizar componente
- `data.name` é `undefined`
- Tentativa de chamar `.toUpperCase()` → **erro**
- React para de renderizar → **tela em branco**

---

### **3. Erro em useEffect**
```typescript
// ❌ PROBLEMA: Erro em useEffect não tratado
useEffect(() => {
  const fetchData = async () => {
    const response = await fetch('/api/data');
    const data = await response.json();
    setData(data.items[0].value); // ← QUEBRA se items estiver vazio
  };
  fetchData(); // ← Erro não tratado
}, []);
```

**O que acontece:**
- useEffect executa
- API retorna dados inesperados
- Acesso a `items[0]` em array vazio → **erro**
- React não trata erro → **tela em branco**

---

### **4. Erro de Estado Assíncrono**
```typescript
// ❌ PROBLEMA: Estado atualizado após desmontar componente
useEffect(() => {
  const fetchData = async () => {
    const data = await fetch('/api/data').then(r => r.json());
    setData(data); // ← Tenta atualizar estado de componente desmontado
  };
  fetchData();
  
  // Se componente desmontar antes de fetchData terminar → ERRO
}, []);
```

**O que acontece:**
- Componente monta
- Inicia fetch assíncrono
- Usuário navega para outra página (componente desmonta)
- Fetch termina e tenta atualizar estado → **erro "Can't perform update"**
- React quebra → **tela em branco**

---

### **5. Erro de Propriedade DOM (como o `removeChild` que vimos)**
```typescript
// ❌ PROBLEMA: Tentando manipular DOM que não existe mais
useEffect(() => {
  const element = document.getElementById('my-element');
  // ... usuário navega para outra página ...
  element.removeChild(child); // ← Element já foi removido → ERRO
}, []);
```

**O que acontece:**
- React tenta remover elemento do DOM
- Elemento já foi removido pelo React Router
- Tentativa de remover nó inexistente → **erro "removeChild"**
- React não trata → **tela em branco**

---

## 🛠️ COMO IDENTIFICAR O PROBLEMA

### **Passo 1: Abrir DevTools (F12)**
1. Pressione **F12** no navegador
2. Vá para aba **Console**
3. Procure por erros em **vermelho**

### **Passo 2: Ver Erros no Console**
```
❌ Erros aparecem assim:
- TypeError: Cannot read property 'x' of undefined
- NotFoundError: Failed to execute 'removeChild' on 'Node'
- Uncaught Promise Rejection
```

### **Passo 3: Verificar Network (F12 → Network)**
- Procure por requisições **falhadas** (em vermelho)
- Verifique se alguma API retornou erro

### **Passo 4: Verificar Stack Trace**
- Clique no erro no console
- Veja a **stack trace** (linha de código que causou o erro)
- Procure pelo arquivo e linha específica

---

## ✅ SOLUÇÕES

### **Solução 1: Adicionar Try/Catch**

**Antes (erro quebra app):**
```typescript
const handleClick = async () => {
  const data = await api.getData();
  setData(data.property.nested.value); // ← QUEBRA
};
```

**Depois (erro tratado):**
```typescript
const handleClick = async () => {
  try {
    const data = await api.getData();
    if (data?.property?.nested?.value) {
      setData(data.property.nested.value);
    } else {
      toast.error('Dados não encontrados');
      setData(null);
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    toast.error('Erro ao carregar dados. Tente novamente.');
  }
};
```

---

### **Solução 2: Usar Optional Chaining (?.)**

**Antes:**
```typescript
<div>{data.name.toUpperCase()}</div> // ← QUEBRA se data.name for undefined
```

**Depois:**
```typescript
<div>{data?.name?.toUpperCase() || 'N/A'}</div> // ← Seguro
```

---

### **Solução 3: Verificar Estado Antes de Renderizar**

**Antes:**
```typescript
function Component() {
  const data = getData();
  return <div>{data.items[0].name}</div>; // ← QUEBRA
}
```

**Depois:**
```typescript
function Component() {
  const data = getData();
  
  if (!data || !data.items || data.items.length === 0) {
    return <div>Carregando...</div>; // ← Fallback
  }
  
  return <div>{data.items[0].name}</div>; // ← Seguro
}
```

---

### **Solução 4: Limpar useEffect ao Desmontar**

**Antes:**
```typescript
useEffect(() => {
  const fetchData = async () => {
    const data = await fetch('/api/data').then(r => r.json());
    setData(data); // ← Pode tentar atualizar componente desmontado
  };
  fetchData();
}, []);
```

**Depois:**
```typescript
useEffect(() => {
  let cancelled = false; // ← Flag para verificar se foi cancelado
  
  const fetchData = async () => {
    try {
      const data = await fetch('/api/data').then(r => r.json());
      if (!cancelled) { // ← Só atualiza se não foi cancelado
        setData(data);
      }
    } catch (error) {
      if (!cancelled) {
        console.error('Erro:', error);
        toast.error('Erro ao carregar dados');
      }
    }
  };
  
  fetchData();
  
  return () => {
    cancelled = true; // ← Marca como cancelado ao desmontar
  };
}, []);
```

---

### **Solução 5: Implementar Error Boundary (IMPORTANTE!)**

**Error Boundary** captura erros e mostra mensagem amigável em vez de tela em branco.

**Arquivo:** `src/components/ErrorBoundary.tsx`

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Erro capturado pelo ErrorBoundary:', error);
    console.error('📊 Informações do erro:', errorInfo);
    
    // Aqui você pode enviar para um serviço de monitoramento
    // Ex: Sentry, LogRocket, etc.
  }

  render() {
    if (this.state.hasError) {
      // Renderiza fallback customizado ou padrão
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Ops! Algo deu errado
              </h1>
              <p className="text-gray-600 mb-4">
                Ocorreu um erro inesperado. Por favor, recarregue a página.
              </p>
              {this.state.error && (
                <details className="text-left mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                    Detalhes do erro (clique para expandir)
                  </summary>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                    {this.state.error.toString()}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Usar no App.tsx:**
```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      {/* Seu app aqui */}
      <Routes>
        {/* ... rotas ... */}
      </Routes>
    </ErrorBoundary>
  );
}
```

---

## 📊 CHECKLIST PARA DEBUGGING

Quando tela em branco acontecer, verifique:

- [ ] **Console (F12):** Há erros em vermelho?
- [ ] **Network (F12 → Network):** Alguma requisição falhou?
- [ ] **Stack Trace:** Qual arquivo e linha causou o erro?
- [ ] **Estado:** O componente recebeu props corretas?
- [ ] **Async:** Há operações assíncronas não tratadas?
- [ ] **Lifecycle:** Componente foi desmontado antes de operação terminar?

---

## 🎯 PREVENÇÃO

### **1. Sempre usar Try/Catch em Funções Async**
```typescript
// ✅ BOM
const handleClick = async () => {
  try {
    // código aqui
  } catch (error) {
    console.error(error);
    toast.error('Erro ao executar ação');
  }
};
```

### **2. Sempre usar Optional Chaining**
```typescript
// ✅ BOM
const value = data?.property?.nested?.value;
```

### **3. Sempre verificar Antes de Renderizar**
```typescript
// ✅ BOM
if (!data) return <Loading />;
if (data.items.length === 0) return <Empty />;
return <Content data={data} />;
```

### **4. Sempre Limpar useEffect**
```typescript
// ✅ BOM
useEffect(() => {
  let cancelled = false;
  // ... código ...
  return () => { cancelled = true; };
}, []);
```

### **5. Sempre usar Error Boundary**
```typescript
// ✅ BOM
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

---

## 🚀 PRÓXIMOS PASSOS

1. **Criar ErrorBoundary** (já fornecido acima)
2. **Adicionar ErrorBoundary no App.tsx**
3. **Revisar handlers de botões** que não têm try/catch
4. **Adicionar Optional Chaining** em acessos a propriedades
5. **Testar em produção** e monitorar console

---

**Última Atualização:** 16/11/2025

