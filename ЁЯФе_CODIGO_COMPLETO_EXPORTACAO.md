# 🔥 CÓDIGO COMPLETO - EXPORTAÇÃO RENDIZY

## 📦 INSTRUÇÕES DE RECONSTRUÇÃO

### PASSO 1: Criar novo projeto Figma Make
1. Abra o Figma Make
2. Crie um novo projeto vazio
3. Copie os arquivos abaixo NA ORDEM indicada

### PASSO 2: Configuração Base
Copie exatamente nesta ordem:

---

## 📄 1. package.json

```json
{
  "name": "rendizy",
  "private": true,
  "version": "1.0.103.247",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "lucide-react": "^0.460.0",
    "recharts": "^2.15.0",
    "date-fns": "^4.1.0",
    "sonner": "^2.0.3",
    "@radix-ui/react-accordion": "^1.2.2",
    "@radix-ui/react-alert-dialog": "^1.1.4",
    "@radix-ui/react-aspect-ratio": "^1.1.1",
    "@radix-ui/react-avatar": "^1.1.2",
    "@radix-ui/react-checkbox": "^1.1.3",
    "@radix-ui/react-collapsible": "^1.1.2",
    "@radix-ui/react-context-menu": "^2.2.4",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-hover-card": "^1.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-menubar": "^1.1.4",
    "@radix-ui/react-navigation-menu": "^1.2.3",
    "@radix-ui/react-popover": "^1.1.4",
    "@radix-ui/react-progress": "^1.1.1",
    "@radix-ui/react-radio-group": "^1.2.2",
    "@radix-ui/react-scroll-area": "^1.2.2",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-separator": "^1.1.1",
    "@radix-ui/react-slider": "^1.2.2",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-switch": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-toast": "^1.2.4",
    "@radix-ui/react-toggle": "^1.1.1",
    "@radix-ui/react-toggle-group": "^1.1.1",
    "@radix-ui/react-tooltip": "^1.1.6",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^4.0.0",
    "typescript": "~5.6.2",
    "vite": "^6.0.1"
  }
}
```

---

## 📄 2. index.html

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RENDIZY - Gestão de Imóveis de Temporada</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## 📄 3. src/main.tsx

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## 📄 4. styles/globals.css

```css
@import "tailwindcss";

@theme {
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;
  --color-card: #ffffff;
  --color-card-foreground: #0a0a0a;
  --color-popover: #ffffff;
  --color-popover-foreground: #0a0a0a;
  --color-primary: #2563eb;
  --color-primary-foreground: #f8fafc;
  --color-secondary: #f1f5f9;
  --color-secondary-foreground: #0f172a;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
  --color-accent: #f1f5f9;
  --color-accent-foreground: #0f172a;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #f8fafc;
  --color-border: #e2e8f0;
  --color-input: #e2e8f0;
  --color-ring: #2563eb;
  --radius: 0.5rem;
}

.dark {
  --color-background: #0a0a0a;
  --color-foreground: #fafafa;
  --color-card: #0a0a0a;
  --color-card-foreground: #fafafa;
  --color-popover: #0a0a0a;
  --color-popover-foreground: #fafafa;
  --color-primary: #3b82f6;
  --color-primary-foreground: #f8fafc;
  --color-secondary: #1e293b;
  --color-secondary-foreground: #f8fafc;
  --color-muted: #1e293b;
  --color-muted-foreground: #94a3b8;
  --color-accent: #1e293b;
  --color-accent-foreground: #f8fafc;
  --color-destructive: #7f1d1d;
  --color-destructive-foreground: #f8fafc;
  --color-border: #1e293b;
  --color-input: #1e293b;
  --color-ring: #3b82f6;
}

* {
  border-color: var(--color-border);
}

body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-family);
}

/* Typography */
h1 {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 2.5rem;
}

h2 {
  font-size: 1.875rem;
  font-weight: 600;
  line-height: 2.25rem;
}

h3 {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 2rem;
}

h4 {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.75rem;
}

h5 {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.75rem;
}

h6 {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5rem;
}

p {
  font-size: 1rem;
  line-height: 1.5rem;
}

small {
  font-size: 0.875rem;
  line-height: 1.25rem;
}
