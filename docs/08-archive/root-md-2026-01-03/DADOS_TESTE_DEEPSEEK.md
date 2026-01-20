# Dados de Teste - DeepSeek Integration

## Configuração do Provedor DeepSeek

### Credenciais
- **API Key**: `sk-1906c01b1dcc4a7eb43edb440632dcb0`
- **Provider**: DeepSeek
- **Base URL**: `https://api.deepseek.com/v1`
- **Modelo**: `deepseek-chat`

### Parâmetros
- **Temperature**: `0.7` (equilíbrio entre criatividade e consistência)
- **Max Tokens**: `4096` (ou ajuste conforme necessidade)
- **Enabled**: `true`

### Prompt de Teste Sugerido
```
Você está funcionando como copiloto do Rendizy? Confirme em português brasileiro e explique brevemente como pode ajudar na análise visual de imagens.
```

## Status
- ✅ Toggle de visibilidade adicionado ao campo API Key
- ⚠️ Erro 500 ao salvar - investigando

## Próximos Passos
1. Verificar logs do backend no Supabase Dashboard
2. Testar salvamento com os dados acima
3. Testar conexão após salvar

