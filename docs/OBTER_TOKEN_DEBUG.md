# Como Obter Token para Debug

## Via Console do Navegador

### Método 1: Buscar todos tokens (RECOMENDADO)
```javascript
Object.keys(localStorage).filter(k => k.includes('token')).forEach(k => console.log(k, ':', localStorage.getItem(k)));
```

### Método 2: Token Supabase específico
```javascript
const authToken = JSON.parse(localStorage.getItem('sb-odcgnzfremrqnvtitpcc-auth-token') || '{}');
console.log('Token:', authToken?.access_token);
```

### Método 3: Token customizado Rendizy
```javascript
console.log('Rendizy Token:', localStorage.getItem('rendizy-token'));
```

## Uso do Token

Após obter o token, use no script de teste:

```powershell
.\test-import-simple.ps1 -Token "SEU_TOKEN_AQUI"
```

## Verificar Expiração

Tokens JWT podem expirar. Se receber erro 401, obtenha um novo token.
