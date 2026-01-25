import { toast } from 'sonner';

import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { AvatarUpload } from './AvatarUpload';

function maskToken(token: string) {
  if (!token) return '';
  if (token.length <= 16) return `${token.slice(0, 4)}…${token.slice(-4)}`;
  return `${token.slice(0, 10)}…${token.slice(-10)}`;
}

async function copyToClipboard(text: string) {
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function MyAccountPage() {
  const { user, organization, isLoading, hasToken, isAuthenticated, isSuperAdmin, isAdmin, isManager } = useAuth();

  const anyUser = user as any;
  const username = anyUser?.username as string | undefined;

  const token = typeof window !== 'undefined' ? localStorage.getItem('rendizy-token') || '' : '';

  const roleLabel = isSuperAdmin ? 'super_admin' : isAdmin ? 'admin' : isManager ? 'manager' : (user?.role || 'staff');

  const sessionStatus = isLoading
    ? 'Carregando…'
    : isAuthenticated
      ? 'Autenticado'
      : hasToken
        ? 'Token presente (usuário não carregado)'
        : 'Deslogado';

  const handleCopyToken = async () => {
    try {
      if (!token) {
        toast.error('Nenhum token encontrado');
        return;
      }
      await copyToClipboard(token);
      toast.success('Token copiado');
    } catch {
      toast.error('Falha ao copiar token');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Minha Conta</h1>
          <p className="text-sm text-muted-foreground">Veja exatamente quem está logado e em qual organização.</p>
        </div>
        <Badge variant={isAuthenticated ? 'default' : 'secondary'}>{sessionStatus}</Badge>
      </div>

      <Tabs defaultValue="usuario" className="w-full">
        <TabsList>
          <TabsTrigger value="usuario">Usuário</TabsTrigger>
          <TabsTrigger value="organizacao">Organização</TabsTrigger>
          <TabsTrigger value="sessao">Sessão</TabsTrigger>
        </TabsList>

        <TabsContent value="usuario" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuário logado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Seção de Avatar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-4 border-b">
                <AvatarUpload 
                  currentAvatarUrl={user?.avatar} 
                  size="xl"
                />
                <div className="space-y-1">
                  <h3 className="text-lg font-medium">{user?.name || 'Usuário'}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Clique na foto para alterar sua imagem de perfil
                  </p>
                </div>
              </div>

              {/* Informações do usuário */}
              <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Nome:</span> {user?.name || '—'}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Email:</span> {user?.email || '—'}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Username:</span> {username || '—'}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Role:</span> {roleLabel}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">User ID:</span> {user?.id || '—'}
              </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizacao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Organização ativa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Nome:</span> {organization?.name || '—'}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Slug:</span> {organization?.slug || '—'}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Org ID:</span> {organization?.id || user?.organizationId || '—'}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Plano:</span> {organization?.plan || '—'}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Status:</span> {organization?.status || '—'}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sessão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Token:</span> {token ? maskToken(token) : '—'}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={handleCopyToken} disabled={!token}>
                  Copiar token
                </Button>
                <Button type="button" variant="outline" onClick={() => window.location.reload()}>
                  Recarregar sessão
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O token completo não é exibido na tela; apenas uma versão mascarada.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
