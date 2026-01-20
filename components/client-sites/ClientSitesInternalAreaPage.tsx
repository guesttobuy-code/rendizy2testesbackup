import { ArrowLeft, Shield, Users, Database, CreditCard, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

type Stability = 'base' | 'planned' | 'blocked';

type InternalAreaModule = {
  id: string;
  title: string;
  stability: Stability;
  description: string;
  dependsOn?: string[];
  connectsToPublicContract?: string[];
};

const MODULES: InternalAreaModule[] = [
  {
    id: 'auth',
    title: 'Acesso do cliente (login e sessão)',
    stability: 'planned',
    description:
      'Definir como o usuário final entra: e-mail, WhatsApp/SMS, link mágico, ou código temporário por atendimento. Isso é separado do rendizy-token (interno).',
    dependsOn: ['Novo modelo de sessão do cliente (separado do painel)'],
    connectsToPublicContract: ['lead-create (planejado)', 'site-config (planejado)'],
  },
  {
    id: 'profile',
    title: 'Perfil e dados do cliente',
    stability: 'planned',
    description:
      'Dados básicos (nome, telefone, e-mail), consentimentos e preferências. Base para histórico e comunicação.',
    dependsOn: ['Tabela/DTO de cliente do portal', 'Política de privacidade/consentimento'],
  },
  {
    id: 'requests',
    title: 'Minhas solicitações (leads / pedidos)',
    stability: 'planned',
    description:
      'Lista de interesses/contatos feitos no site (ex.: quero visitar, quero proposta, quero reservar).',
    connectsToPublicContract: ['lead-create (planejado)'],
  },
  {
    id: 'quotations',
    title: 'Minhas cotações e propostas',
    stability: 'planned',
    description:
      'Histórico de cotações geradas, com status (enviada, em análise, aprovada, expirada) e ações permitidas.',
    dependsOn: ['Endpoint público/portal para consultar cotação com segurança (token/código)'],
  },
  {
    id: 'reservations',
    title: 'Minhas reservas (quando aplicável)',
    stability: 'planned',
    description:
      'Para temporada: reservas confirmadas/pedidas; para locação residencial: propostas/contratos; para venda: visitas/propostas.',
    dependsOn: ['Contrato público estável para status e timeline'],
  },
  {
    id: 'documents',
    title: 'Documentos (uploads e assinaturas)',
    stability: 'planned',
    description:
      'Área para enviar documentos (ex.: comprovantes) e receber arquivos (ex.: contrato, checklist).',
    dependsOn: ['Storage + ACL por usuário do portal', 'Modelo de documentos'],
  },
  {
    id: 'support',
    title: 'Atendimento (tickets / suporte)',
    stability: 'planned',
    description:
      'Um canal estruturado: abrir solicitações, acompanhar andamento, registrar evidências. Pode reaproveitar conceitos de CRM, mas com identidade do cliente.',
    dependsOn: ['Endpoints do portal (não o CRM interno)'],
  },
  {
    id: 'payments',
    title: 'Pagamentos (confirmação e histórico)',
    stability: 'blocked',
    description:
      'Confirmação de pagamentos, histórico, invoices, reembolsos e status de cobrança.',
    dependsOn: ['Integração Stripe (ainda não existe)', 'Webhooks e reconciliação'],
  },
  {
    id: 'chat',
    title: 'Chat interno cliente ↔ imobiliária',
    stability: 'blocked',
    description:
      'Chat em tempo real dentro do portal (não WhatsApp).',
    dependsOn: ['Infra de mensagens/threads', 'Notificações', 'Moderação/anti-spam'],
  },
];

function stabilityBadge(stability: Stability) {
  if (stability === 'base') return <Badge>Base</Badge>;
  if (stability === 'planned') return <Badge variant="secondary">Planejado</Badge>;
  return <Badge variant="destructive">Bloqueado</Badge>;
}

export function ClientSitesInternalAreaPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Área interna do cliente</h1>
          <p className="text-gray-600 mt-1">
            Blueprint da área autenticada do site (portal). Aqui a gente define a base e evolui até ficar maduro.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate('/sites-clientes')}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Importante</AlertTitle>
        <AlertDescription>
          Esta área é “interna” no sentido de ser autenticada para o usuário final do site. Ela não deve depender do
          `rendizy-token` (token do painel/admin). Vamos criar um modelo de sessão próprio do portal.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Para quem?
            </CardTitle>
            <CardDescription>Usuário final do site (cliente)</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <div>- Prospect (lead) acompanhando solicitação</div>
            <div>- Hóspede/reservante (temporada)</div>
            <div>- Locatário (locação residencial)</div>
            <div>- Interessado em compra (venda)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Conecta com dados
            </CardTitle>
            <CardDescription>Componentes & Dados</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <div>- A área interna adiciona “componentes privados”</div>
            <div>- Reusa DTOs públicos quando possível</div>
            <div>- Exige novos endpoints do portal (planejado)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pagamentos
            </CardTitle>
            <CardDescription>Stripe ainda não existe</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <div>- Sem confirmação automática</div>
            <div>- Sem histórico/invoices</div>
            <div>- Vamos projetar agora, implementar depois</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Módulos do portal (base → planejado)
          </CardTitle>
          <CardDescription>
            Isso é o “mapa do que precisamos”. A implementação vai ser incremental.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {MODULES.map((m) => (
            <div key={m.id} className="rounded-lg border p-3 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900">{m.title}</div>
                  <div className="text-sm text-gray-600 mt-1">{m.description}</div>
                </div>
                <div className="shrink-0">{stabilityBadge(m.stability)}</div>
              </div>

              {(m.dependsOn?.length || m.connectsToPublicContract?.length) && (
                <div className="mt-2 text-sm text-gray-700 space-y-1">
                  {m.dependsOn?.length ? (
                    <div>
                      <span className="font-medium">Depende de:</span> {m.dependsOn.join(' • ')}
                    </div>
                  ) : null}
                  {m.connectsToPublicContract?.length ? (
                    <div>
                      <span className="font-medium">Conecta com contrato público:</span> {m.connectsToPublicContract.join(' • ')}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Próximo passo sugerido (bem “base”)</CardTitle>
          <CardDescription>Para começar sem Stripe/chat e sem depender do CRM interno</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <div>1) Definir o modo de login do portal (ex.: link mágico por e-mail/WhatsApp).</div>
          <div>2) Criar um endpoint mínimo: “me” (perfil) + “minhas solicitações”.</div>
          <div>3) Criar 1 componente privado inicial: “Status da solicitação / cotação”.</div>
        </CardContent>
      </Card>
    </div>
  );
}
