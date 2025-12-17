/**
 * 🏢 MAPPER: Proprietários Stays.net → Rendizy
 * 
 * Mapeia dados de proprietários da Stays.net para o formato Rendizy
 * 
 * @version 1.0.0
 * @updated 2025-11-22
 */

export interface StaysNetOwner {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  phones?: Array<{ iso?: string; hint?: string; number?: string }>;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  documents?: Array<{
    type?: string;
    numb?: string;
    issued?: string;
    date?: string;
  }>;
  notes?: string;
  properties?: string[]; // IDs de propriedades associadas
}

export interface Owner {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  documents?: {
    cpf?: string;
    cnpj?: string;
    passport?: string;
    rg?: string;
  };
  notes?: string;
  propertyIds?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Converte proprietário da Stays.net para formato Rendizy
 */
export function staysNetOwnerToRendizy(
  staysOwner: StaysNetOwner,
  organizationId: string
): Owner {
  // Extrair telefone
  let phone = '';
  if (staysOwner.phones && staysOwner.phones.length > 0) {
    const firstPhone = staysOwner.phones[0];
    phone = firstPhone.iso || firstPhone.number || '';
  }

  // Extrair documentos
  const documents: { cpf?: string; cnpj?: string; passport?: string; rg?: string } = {};
  if (staysOwner.documents && staysOwner.documents.length > 0) {
    for (const doc of staysOwner.documents) {
      const docType = doc.type?.toLowerCase() || '';
      const docNumber = doc.numb || '';
      
      if (docType.includes('cpf')) {
        documents.cpf = docNumber;
      } else if (docType.includes('cnpj')) {
        documents.cnpj = docNumber;
      } else if (docType.includes('passport') || docType.includes('passaporte')) {
        documents.passport = docNumber;
      } else if (docType.includes('rg')) {
        documents.rg = docNumber;
      }
    }
  }

  const owner: Owner = {
    id: staysOwner._id || staysOwner.id || crypto.randomUUID(),
    organizationId,
    name: staysOwner.name || 'Proprietário sem nome',
    email: staysOwner.email,
    phone,
    address: staysOwner.address ? {
      street: staysOwner.address.street,
      number: staysOwner.address.number,
      complement: staysOwner.address.complement,
      neighborhood: staysOwner.address.neighborhood,
      city: staysOwner.address.city,
      state: staysOwner.address.state,
      zipCode: staysOwner.address.zipCode,
      country: staysOwner.address.country || 'BR',
    } : undefined,
    documents: Object.keys(documents).length > 0 ? documents : undefined,
    notes: staysOwner.notes,
    propertyIds: staysOwner.properties,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return owner;
}

/**
 * Converte array de proprietários
 */
export function staysNetOwnersToRendizy(
  staysOwners: StaysNetOwner[],
  organizationId: string
): Owner[] {
  return staysOwners.map(owner => staysNetOwnerToRendizy(owner, organizationId));
}

