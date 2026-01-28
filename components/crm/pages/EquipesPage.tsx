/**
 * Página de Equipes/Times
 * Utiliza o componente TeamsConfig integrado
 */
import { TeamsConfig } from '../settings/TeamsConfig';
import { useAuth } from '@/contexts/AuthContext';

export function EquipesPage() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';
  
  return (
    <div className="p-6">
      <TeamsConfig organizationId={organizationId} />
    </div>
  );
}

export default EquipesPage;
