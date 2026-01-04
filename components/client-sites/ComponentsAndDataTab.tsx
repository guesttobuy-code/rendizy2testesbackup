import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

import {
  CLIENT_SITES_BLOCKS_CATALOG,
  CLIENT_SITES_PUBLIC_CONTRACT_V1,
  type ClientSitesCatalogBlock,
  type ClientSitesCatalogEndpoint
} from './catalog';

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-900">{title}</div>
      <pre className="whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800">
        {code}
      </pre>
    </div>
  );
}

function StabilityBadge({ stability }: { stability: 'stable' | 'planned' }) {
  if (stability === 'stable') {
    return <Badge variant="secondary">Disponível hoje</Badge>;
  }

  return <Badge variant="outline">Planejado</Badge>;
}

function EndpointCard({ endpoint }: { endpoint: ClientSitesCatalogEndpoint }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{endpoint.title}</CardTitle>
            <CardDescription className="mt-1">
              <span className="font-mono text-xs">{endpoint.method}</span>{' '}
              <span className="font-mono text-xs">{endpoint.pathTemplate}</span>
            </CardDescription>
          </div>
          <StabilityBadge stability={endpoint.stability} />
        </div>
      </CardHeader>

      {endpoint.notes && endpoint.notes.length > 0 && (
        <CardContent>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            {endpoint.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}

function BlockCard({ block }: { block: ClientSitesCatalogBlock }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{block.title}</CardTitle>
            <CardDescription className="mt-1">{block.description}</CardDescription>
          </div>
          <StabilityBadge stability={block.stability} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-900">Usa endpoints</div>
          <div className="flex flex-wrap gap-2">
            {block.usesEndpoints.map((id) => (
              <Badge key={id} variant="outline" className="font-mono text-xs">
                {id}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-900">Campos necessários</div>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            {block.requiredFields.map((f) => (
              <li key={f} className="font-mono text-xs">
                {f}
              </li>
            ))}
          </ul>
        </div>

        {block.notes && block.notes.length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-900">Notas</div>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              {block.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ComponentsAndDataTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Componentes & Dados</CardTitle>
          <CardDescription>
            Contrato público (sites) + catálogo de Blocos/Widgets suportados. Esta tela é a referência para evitar “patch por site”.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CLIENT_SITES_PUBLIC_CONTRACT_V1.integrationGuides?.length ? (
            <div className="space-y-4">
              {CLIENT_SITES_PUBLIC_CONTRACT_V1.integrationGuides.map((g) => (
                <Card key={g.title}>
                  <CardHeader>
                    <CardTitle className="text-sm">{g.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                      {g.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>

                    {g.codeBlocks?.length ? (
                      <div className="space-y-4">
                        {g.codeBlocks.map((b) => (
                          <CodeBlock key={b.title} title={b.title} code={b.code} />
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          <div className="text-sm text-gray-700">
            <div className="font-medium text-gray-900">Contrato Público {CLIENT_SITES_PUBLIC_CONTRACT_V1.version}</div>
            <div className="mt-1 font-mono text-xs text-gray-600">
              Wrapper: {CLIENT_SITES_PUBLIC_CONTRACT_V1.wrapperType}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900">Campos do Contrato Público</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CLIENT_SITES_PUBLIC_CONTRACT_V1.propertyFieldGroups.map((g) => (
                <Card key={g.title}>
                  <CardHeader>
                    <CardTitle className="text-sm">Property DTO — {g.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                      {g.fields.map((f) => (
                        <li key={f} className="font-mono text-xs">
                          {f}
                        </li>
                      ))}
                    </ul>
                    {g.notes && g.notes.length > 0 && (
                      <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                        {g.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}

              {CLIENT_SITES_PUBLIC_CONTRACT_V1.siteConfigFieldGroups.map((g) => (
                <Card key={g.title}>
                  <CardHeader>
                    <CardTitle className="text-sm">SiteConfig DTO — {g.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                      {g.fields.map((f) => (
                        <li key={f} className="font-mono text-xs">
                          {f}
                        </li>
                      ))}
                    </ul>
                    {g.notes && g.notes.length > 0 && (
                      <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                        {g.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Endpoints</h2>
          <p className="text-sm text-gray-600">
            O site deve consumir somente endpoints públicos. Endpoints privados exigindo token não são suportados em sites públicos.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {CLIENT_SITES_PUBLIC_CONTRACT_V1.endpoints.map((e) => (
            <EndpointCard key={e.id} endpoint={e} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Blocos / Widgets do Site</h2>
          <p className="text-sm text-gray-600">
            Estes são os blocos que sites (incluindo Bolt/v0) podem usar sem inventar campos.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {CLIENT_SITES_BLOCKS_CATALOG.map((b) => (
            <BlockCard key={b.id} block={b} />
          ))}
        </div>
      </div>
    </div>
  );
}
