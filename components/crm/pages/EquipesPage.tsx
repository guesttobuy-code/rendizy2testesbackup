/**
 * Página de Equipes/Times
 * Utiliza o componente TeamsConfig integrado
 */
import { TeamsConfig } from '../settings/TeamsConfig';

// TODO: Pegar organizationId do contexto de auth real
const MOCK_ORGANIZATION_ID = 'org_demo_001';

export function EquipesPage() {
  return (
    <div className="p-6">
      <TeamsConfig organizationId={MOCK_ORGANIZATION_ID} />
    </div>
  );
}

export default EquipesPage;
