import { useEffect, useMemo, useState } from 'react';

import { useGuestAuth } from '../contexts/GuestAuthContext';

type Country = { code: string; name: string; dial: string; flag: string };

const COUNTRIES: Country[] = [
  { code: 'BR', name: 'Brasil', dial: '55', flag: '🇧🇷' },
  { code: 'PT', name: 'Portugal', dial: '351', flag: '🇵🇹' },
  { code: 'US', name: 'Estados Unidos', dial: '1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canadá', dial: '1', flag: '🇨🇦' },
  { code: 'GB', name: 'Reino Unido', dial: '44', flag: '🇬🇧' },
  { code: 'ES', name: 'Espanha', dial: '34', flag: '🇪🇸' },
  { code: 'FR', name: 'França', dial: '33', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemanha', dial: '49', flag: '🇩🇪' },
  { code: 'IT', name: 'Itália', dial: '39', flag: '🇮🇹' },
  { code: 'AR', name: 'Argentina', dial: '54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dial: '56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colômbia', dial: '57', flag: '🇨🇴' },
  { code: 'MX', name: 'México', dial: '52', flag: '🇲🇽' },
  { code: 'UY', name: 'Uruguai', dial: '598', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguai', dial: '595', flag: '🇵🇾' },
];

function digitsOnly(v: string) {
  return (v || '').replace(/\D+/g, '');
}

function parseE164(v?: string | null) {
  const s = String(v || '').trim();
  if (!s.startsWith('+')) return null;
  const digits = digitsOnly(s);
  if (!digits) return null;

  // longest dial match
  let best: Country | null = null;
  for (const c of COUNTRIES) {
    if (digits.startsWith(c.dial)) {
      if (!best || c.dial.length > best.dial.length) best = c;
    }
  }
  if (!best) return { dial: '', national: digits };
  return { dial: best.dial, national: digits.slice(best.dial.length) };
}

function readLocalProfile(): { dial?: string; phone?: string } | null {
  try {
    const raw = localStorage.getItem('rendizy_guest_profile');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== 'object') return null;
    return obj as { dial?: string; phone?: string };
  } catch {
    return null;
  }
}

function writeLocalProfile(p: { dial?: string; phone?: string }) {
  try {
    localStorage.setItem('rendizy_guest_profile', JSON.stringify(p || {}));
  } catch {
    // ignore
  }
}

export function MyProfilePage() {
  const { user, logout } = useGuestAuth();

  const [countryCode, setCountryCode] = useState<string>('BR');
  const [nationalNumber, setNationalNumber] = useState<string>('');
  const [saveMsg, setSaveMsg] = useState<string>('');

  const country = useMemo(() => COUNTRIES.find((c) => c.code === countryCode) || null, [countryCode]);

  useEffect(() => {
    // Load from local profile first; fallback to user.phone
    const prof = readLocalProfile();
    const fromProf = prof?.phone || '';
    const fromUser = user?.phone || '';
    const parsed = parseE164(fromProf) || parseE164(fromUser);

    if (parsed?.dial) {
      const found = COUNTRIES.find((c) => c.dial === parsed.dial);
      if (found) setCountryCode(found.code);
      setNationalNumber(parsed.national || '');
    } else {
      // If profile has dial but no phone, still set country
      if (prof?.dial) {
        const found = COUNTRIES.find((c) => c.dial === String(prof.dial));
        if (found) setCountryCode(found.code);
      }
      setNationalNumber(digitsOnly(fromUser));
    }
  }, [user?.phone]);

  const fullPhone = useMemo(() => {
    const dial = country?.dial || '';
    const national = digitsOnly(nationalNumber);
    if (!dial || !national) return '';
    return `+${dial}${national}`;
  }, [country?.dial, nationalNumber]);

  function savePhone() {
    setSaveMsg('');
    const dial = country?.dial || '';
    const national = digitsOnly(nationalNumber);
    if (!dial) {
      setSaveMsg('Selecione o país (prefixo).');
      return;
    }
    if (!national || national.length < 6) {
      setSaveMsg('Informe um telefone válido.');
      return;
    }

    const phone = `+${dial}${national}`;
    writeLocalProfile({ dial, phone });

    // Keep local guest cache in sync (used by /site injection)
    try {
      const raw = localStorage.getItem('rendizy_guest');
      if (raw) {
        const obj = JSON.parse(raw) as any;
        obj.phone = obj.phone || phone;
        obj.dial = obj.dial || dial;
        localStorage.setItem('rendizy_guest', JSON.stringify(obj));
      }
    } catch {
      // ignore
    }

    setSaveMsg('Telefone salvo. Ele será usado na reserva.');
  }

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

          <div className="pt-2">
            <span className="text-sm text-gray-500">Telefone</span>
            <div className="mt-2 grid gap-2">
              <div className="grid sm:grid-cols-2 gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full px-3 py-3 border rounded-lg bg-white"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name} (+{c.dial})
                    </option>
                  ))}
                </select>
                <input
                  value={nationalNumber}
                  onChange={(e) => setNationalNumber(e.target.value)}
                  inputMode="numeric"
                  placeholder="Seu número (apenas dígitos)"
                  className="w-full px-3 py-3 border rounded-lg"
                />
              </div>

              <div className="text-xs text-gray-500">
                Formato salvo: <span className="font-mono">{fullPhone || '—'}</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={savePhone}
                  className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
                >
                  Salvar telefone
                </button>
                {saveMsg && <div className="text-sm text-gray-600">{saveMsg}</div>}
              </div>

              <div className="text-xs text-gray-500">
                Durante a reserva, Nome/Email/Telefone ficam travados. Para editar, use aqui no Perfil.
              </div>
            </div>
          </div>
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
