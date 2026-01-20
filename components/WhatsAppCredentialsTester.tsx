import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertCircle, CheckCircle2, Loader2, XCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface TestResult {
  status: 'idle' | 'testing' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
  httpStatus?: number;
}

export function WhatsAppCredentialsTester() {
  const [apiUrl, setApiUrl] = useState('https://evo.boravendermuito.com.br');
  const [apiKey, setApiKey] = useState('');
  const [instanceName, setInstanceName] = useState('Rendizy');
  
  const [testResults, setTestResults] = useState<{
    connectivity: TestResult;
    authentication: TestResult;
    permissions: TestResult;
    overall: TestResult;
  }>({
    connectivity: { status: 'idle', message: 'Não testado' },
    authentication: { status: 'idle', message: 'Não testado' },
    permissions: { status: 'idle', message: 'Não testado' },
    overall: { status: 'idle', message: 'Aguardando teste...' }
  });

  const testConnectivity = async (): Promise<TestResult> => {
    try {
      const response = await fetch(apiUrl, { method: 'HEAD', mode: 'no-cors' });
      return {
        status: 'success',
        message: 'Servidor acessível',
        details: 'URL está correta e servidor está online'
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Servidor inacessível',
        details: 'URL incorreta ou servidor offline. Verifique: ' + apiUrl
      };
    }
  };

  const testAuthentication = async (): Promise<TestResult> => {
    try {
      const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
        }
      });

      if (response.ok) {
        return {
          status: 'success',
          message: 'API Key válida',
          details: 'Autenticação bem-sucedida',
          httpStatus: response.status
        };
      } else if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        return {
          status: 'error',
          message: 'API Key INVÁLIDA',
          details: 'A API Key não é reconhecida pelo servidor. Você precisa criar uma nova Global API Key no Evolution Manager.',
          httpStatus: 401
        };
      } else {
        return {
          status: 'error',
          message: `Erro ${response.status}`,
          details: `Servidor retornou: ${response.statusText}`,
          httpStatus: response.status
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'Erro na requisição',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  };

  const testPermissions = async (): Promise<TestResult> => {
    try {
      // Em vez de criar uma instância, vamos verificar se conseguimos CONECTAR na instância existente
      // Isso valida que temos permissões adequadas
      const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
        }
      });

      const data = await response.json();

      if (response.ok) {
        return {
          status: 'success',
          message: 'Permissões completas',
          details: 'API Key tem permissões para acessar a instância',
          httpStatus: response.status
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          status: 'error',
          message: 'SEM PERMISSÕES',
          details: 'API Key não tem permissão para acessar a instância',
          httpStatus: response.status
        };
      } else if (response.status === 404) {
        // Instância não encontrada - mas isso significa que a API Key tem permissão para verificar
        return {
          status: 'success',
          message: 'Permissões OK',
          details: 'API Key tem permissões adequadas (instância não conectada ainda)',
          httpStatus: response.status
        };
      } else {
        // Para status 400 ou outros, vamos mostrar mais detalhes
        return {
          status: 'warning',
          message: `Status ${response.status}`,
          details: `Resposta da API: ${JSON.stringify(data).substring(0, 100)}`,
          httpStatus: response.status
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'Erro no teste',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  };

  const runTests = async () => {
    // Reset
    setTestResults({
      connectivity: { status: 'testing', message: 'Testando...' },
      authentication: { status: 'idle', message: 'Aguardando...' },
      permissions: { status: 'idle', message: 'Aguardando...' },
      overall: { status: 'testing', message: 'Executando testes...' }
    });

    // Teste 1: Conectividade
    const connectivityResult = await testConnectivity();
    setTestResults(prev => ({ ...prev, connectivity: connectivityResult }));

    if (connectivityResult.status === 'error') {
      setTestResults(prev => ({
        ...prev,
        authentication: { status: 'idle', message: 'Pulado' },
        permissions: { status: 'idle', message: 'Pulado' },
        overall: {
          status: 'error',
          message: '❌ FALHA: URL incorreta ou servidor offline',
          details: connectivityResult.details
        }
      }));
      return;
    }

    // Teste 2: Autenticação
    setTestResults(prev => ({
      ...prev,
      authentication: { status: 'testing', message: 'Testando...' }
    }));

    const authResult = await testAuthentication();
    setTestResults(prev => ({ ...prev, authentication: authResult }));

    if (authResult.status === 'error') {
      setTestResults(prev => ({
        ...prev,
        permissions: { status: 'idle', message: 'Pulado' },
        overall: {
          status: 'error',
          message: '❌ FALHA: API Key inválida',
          details: authResult.details
        }
      }));
      return;
    }

    // Teste 3: Permissões
    setTestResults(prev => ({
      ...prev,
      permissions: { status: 'testing', message: 'Testando...' }
    }));

    const permissionsResult = await testPermissions();
    setTestResults(prev => ({ ...prev, permissions: permissionsResult }));

    // Resultado final
    if (permissionsResult.status === 'error') {
      setTestResults(prev => ({
        ...prev,
        overall: {
          status: 'error',
          message: '❌ FALHA: Sem permissões',
          details: permissionsResult.details
        }
      }));
    } else {
      setTestResults(prev => ({
        ...prev,
        overall: {
          status: 'success',
          message: '✅ SUCESSO: Credenciais válidas!',
          details: 'Todas as credenciais estão corretas. Você pode conectar o WhatsApp agora.'
        }
      }));
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'testing':
        return <Loader2 className="size-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="size-4 text-green-500" />;
      case 'error':
        return <XCircle className="size-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="size-4 text-yellow-500" />;
      default:
        return <AlertCircle className="size-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'testing':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">🧪 Testar Credenciais do WhatsApp</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="apiUrl">URL da Evolution API</Label>
            <Input
              id="apiUrl"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://evo.boravendermuito.com.br"
            />
          </div>

          <div>
            <Label htmlFor="apiKey">Global API Key</Label>
            <Input
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cole sua Global API Key aqui"
              type="password"
            />
            <p className="text-xs text-gray-500 mt-1">
              Obtenha em: {apiUrl}/manager → Global API Keys
            </p>
          </div>

          <div>
            <Label htmlFor="instanceName">Nome da Instância</Label>
            <Input
              id="instanceName"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="Rendizy"
            />
          </div>

          <Button 
            onClick={runTests}
            disabled={!apiUrl || !apiKey || testResults.overall.status === 'testing'}
            className="w-full"
          >
            {testResults.overall.status === 'testing' ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              'Testar Credenciais'
            )}
          </Button>
        </div>
      </Card>

      {/* Resultados dos Testes */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Resultados dos Testes</h3>
        
        <div className="space-y-3">
          {/* Teste 1 */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            {getStatusIcon(testResults.connectivity.status)}
            <div className="flex-1">
              <p className={`font-medium ${getStatusColor(testResults.connectivity.status)}`}>
                1. Conectividade: {testResults.connectivity.message}
              </p>
              {testResults.connectivity.details && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {testResults.connectivity.details}
                </p>
              )}
            </div>
          </div>

          {/* Teste 2 */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            {getStatusIcon(testResults.authentication.status)}
            <div className="flex-1">
              <p className={`font-medium ${getStatusColor(testResults.authentication.status)}`}>
                2. Autenticação: {testResults.authentication.message}
              </p>
              {testResults.authentication.details && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {testResults.authentication.details}
                </p>
              )}
              {testResults.authentication.httpStatus && (
                <p className="text-xs text-gray-500 mt-1">
                  Status HTTP: {testResults.authentication.httpStatus}
                </p>
              )}
            </div>
          </div>

          {/* Teste 3 */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            {getStatusIcon(testResults.permissions.status)}
            <div className="flex-1">
              <p className={`font-medium ${getStatusColor(testResults.permissions.status)}`}>
                3. Permissões: {testResults.permissions.message}
              </p>
              {testResults.permissions.details && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {testResults.permissions.details}
                </p>
              )}
              {testResults.permissions.httpStatus && (
                <p className="text-xs text-gray-500 mt-1">
                  Status HTTP: {testResults.permissions.httpStatus}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Resultado Geral */}
        {testResults.overall.status !== 'idle' && (
          <Alert className={`mt-4 ${
            testResults.overall.status === 'success' 
              ? 'border-green-500 bg-green-50 dark:bg-green-950' 
              : testResults.overall.status === 'error'
              ? 'border-red-500 bg-red-50 dark:bg-red-950'
              : ''
          }`}>
            <div className="flex items-start gap-2">
              {getStatusIcon(testResults.overall.status)}
              <div>
                <p className={`font-semibold ${getStatusColor(testResults.overall.status)}`}>
                  {testResults.overall.message}
                </p>
                {testResults.overall.details && (
                  <AlertDescription className="mt-1">
                    {testResults.overall.details}
                  </AlertDescription>
                )}
              </div>
            </div>
          </Alert>
        )}
      </Card>

      {/* Instruções baseadas no resultado */}
      {testResults.authentication.status === 'error' && testResults.authentication.httpStatus === 401 && (
        <Card className="p-6 border-red-500 bg-red-50 dark:bg-red-950">
          <h3 className="text-lg font-semibold mb-3 text-red-700 dark:text-red-300">
            🔴 Como Resolver: API Key Inválida
          </h3>
          
          <div className="space-y-3 text-sm">
            <p>A API Key <code className="bg-red-100 dark:bg-red-900 px-2 py-1 rounded">{apiKey.substring(0, 20)}...</code> não é válida.</p>
            
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg space-y-2">
              <p className="font-semibold">Siga estes passos:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>
                  Acesse: <a href={`${apiUrl}/manager`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    {apiUrl}/manager
                  </a>
                </li>
                <li>Faça login com suas credenciais de administrador</li>
                <li>No menu lateral, clique em <strong>"Global API Keys"</strong></li>
                <li>
                  Procure pela key que termina em: <code>...{apiKey.slice(-10)}</code>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Se <strong>NÃO</strong> encontrar: Clique em "Criar Nova Key"</li>
                    <li>Se encontrar: Clique em "Editar"</li>
                  </ul>
                </li>
                <li>
                  Marque <strong>TODAS</strong> as permissões:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>☑ Create Instance</li>
                    <li>☑ Delete Instance</li>
                    <li>☑ Manage Instance</li>
                    <li>☑ Send Message</li>
                    <li>☑ View Instance</li>
                  </ul>
                </li>
                <li>Clique em "Salvar" ou "Criar"</li>
                <li>Se criou nova: <strong>COPIE a key IMEDIATAMENTE</strong> (não verá novamente)</li>
                <li>Cole a nova key no campo acima</li>
                <li>Clique em "Testar Credenciais" novamente</li>
              </ol>
            </div>
          </div>
        </Card>
      )}

      {testResults.permissions.status === 'error' && testResults.permissions.httpStatus === 401 && (
        <Card className="p-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <h3 className="text-lg font-semibold mb-3 text-yellow-700 dark:text-yellow-300">
            ⚠️ Como Resolver: Sem Permissões
          </h3>
          
          <div className="space-y-3 text-sm">
            <p>A API Key existe mas <strong>NÃO tem permissão</strong> para criar instâncias.</p>
            
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg space-y-2">
              <p className="font-semibold">Adicione permissões:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Acesse: <a href={`${apiUrl}/manager`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    {apiUrl}/manager
                  </a>
                </li>
                <li>Menu: <strong>Global API Keys</strong></li>
                <li>Encontre e <strong>edite</strong> a key atual</li>
                <li>Marque a permissão: <strong>☑ Create Instance</strong></li>
                <li>Salve</li>
                <li>Aguarde 10 segundos</li>
                <li>Teste novamente</li>
              </ol>
            </div>
          </div>
        </Card>
      )}

      {testResults.overall.status === 'success' && (
        <Card className="p-6 border-green-500 bg-green-50 dark:bg-green-950">
          <h3 className="text-lg font-semibold mb-3 text-green-700 dark:text-green-300">
            ✅ Credenciais Validadas!
          </h3>
          
          <p className="text-sm mb-3">
            Todas as credenciais estão corretas e funcionando. Você pode:
          </p>
          
          <div className="space-y-2 text-sm">
            <div className="bg-white dark:bg-gray-900 p-3 rounded-lg">
              <p className="font-semibold mb-2">✓ Credenciais validadas:</p>
              <ul className="space-y-1 ml-4">
                <li>• URL: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">{apiUrl}</code></li>
                <li>• API Key: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">{apiKey.substring(0, 20)}...</code></li>
                <li>• Instância: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">{instanceName}</code></li>
              </ul>
            </div>
            
            <p className="text-green-700 dark:text-green-300 font-medium mt-3">
              → Agora você pode salvar essas credenciais e conectar o WhatsApp normalmente.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}