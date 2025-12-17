# 📝 PREFERÊNCIAS DO USUÁRIO

## 📂 LOCAL DE SALVAMENTO

### ZIPs e Arquivos Gerados
- ✅ **SEMPRE salvar na pasta Downloads**
- Caminho: `C:\Users\rafae\Downloads\`
- Padrão: `$env:USERPROFILE\Downloads`

**Motivo:** Organização e fácil acesso para fazer push no GitHub

**Scripts que devem seguir esta regra:**
- `criar-zip-backend.ps1` - Backend ZIP para GitHub
- `criar-backup.ps1` - Backups do projeto
- Qualquer outro script que gere arquivos para download/push

---

## 🔧 ESTRUTURA DO BACKEND

### Localização
- Backend: `supabase/functions/rendizy-server/`
- Rotas: `supabase/functions/rendizy-server/routes-*.ts`
- Helpers: `supabase/functions/rendizy-server/utils-*.ts`

---

## 🎯 PADRÕES DE COMMIT

### Mensagens de Commit
- Formato: `fix:`, `feat:`, `refactor:`, `docs:`
- Exemplo: `fix: Corrigir backend - organizationId undefined, triggers updated_at`

---

## ⚠️ NOTAS IMPORTANTES

1. **Nunca esquecer:**
   - ZIPs sempre em Downloads
   - Backend sempre retorna JSON válido
   - Sempre garantir `organizationId` válido (fallback automático)
   - Sempre proteger contra triggers de `updated_at`

2. **Documentação:**
   - Criar arquivos `.md` com correções importantes
   - Comentar código crítico explicando por que
   - Anotar preferências aqui neste arquivo

---

**Última atualização:** 2025-11-17

