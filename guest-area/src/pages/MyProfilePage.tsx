import { useGuestAuth } from '../contexts/GuestAuthContext';

export function MyProfilePage() {
  const { user, logout } = useGuestAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Meu Perfil</h1>
        <p className="text-gray-500 text-sm mt-1">Suas informações de conta</p>
      </div>

      {/* Card Principal */}
      <div className="bg-white rounded-xl border p-6">
        {/* Avatar e Nome */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold border-4 border-primary/20">
              {user.name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-semibold text-gray-800">{user.name}</h2>
            <p className="text-gray-500">{user.email}</p>
            <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Conta verificada via Google
            </span>
          </div>
        </div>

        {/* Informações */}
        <div className="py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">Email</span>
              <p className="font-medium text-gray-800">{user.email}</p>
            </div>
            <span className="text-green-600 text-sm">✓ Verificado</span>
          </div>

          <div>
            <span className="text-sm text-gray-500">Nome completo</span>
            <p className="font-medium text-gray-800">{user.name}</p>
          </div>

          {user.id && (
            <div>
              <span className="text-sm text-gray-500">ID do usuário</span>
              <p className="font-mono text-xs text-gray-600">{user.id}</p>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="pt-6 border-t space-y-3">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sair da conta</span>
          </button>
        </div>
      </div>

      {/* Card de Privacidade */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🔒</span>
          </div>
          <div>
            <h3 className="font-medium text-blue-800">Sua privacidade é importante</h3>
            <p className="text-sm text-blue-600 mt-1">
              Seus dados são usados apenas para gerenciar suas reservas e fornecer uma melhor experiência.
              Não compartilhamos suas informações com terceiros.
            </p>
          </div>
        </div>
      </div>

      {/* Suporte */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-medium text-gray-800 mb-4">Precisa de ajuda?</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <a
            href="#"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl">💬</span>
            <div>
              <p className="font-medium text-gray-800 text-sm">Fale Conosco</p>
              <p className="text-xs text-gray-500">Dúvidas sobre reservas</p>
            </div>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl">📋</span>
            <div>
              <p className="font-medium text-gray-800 text-sm">Políticas</p>
              <p className="text-xs text-gray-500">Cancelamento e reembolso</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
