/**
 * RENDIZY - Excel Export Utility
 * 
 * Funções para exportar dados para arquivos Excel (.xlsx)
 * Usa a biblioteca SheetJS (xlsx)
 * 
 * @version 1.0.103.270
 * @date 2025-11-04
 */

import * as XLSX from 'xlsx';

interface Property {
  id: string;
  internalName: string;
  publicName: string;
  type: 'location' | 'accommodation';
  structureType?: 'hotel' | 'house' | 'apartment' | 'condo';
  address?: {
    street: string;
    number: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  status: 'active' | 'inactive' | 'draft';
  tags?: string[];
  photos?: string[];
  accommodationsCount?: number;
  parentLocationId?: string;
  pricing?: {
    basePrice: number;
    currency: string;
  };
  capacity?: {
    guests: number;
    bedrooms: number;
    bathrooms: number;
  };
}

/**
 * Exporta propriedades para arquivo Excel
 */
export const exportPropertiesToExcel = (properties: Property[], filename: string = 'imoveis') => {
  // Preparar dados para Excel
  const excelData = properties.map(property => ({
    'ID': property.id,
    'Nome Interno': property.internalName,
    'Nome Público': property.publicName,
    'Tipo': property.type === 'location' ? 'Local' : 'Acomodação',
    'Estrutura': getStructureTypeLabel(property.structureType),
    'Status': getStatusLabel(property.status),
    'Rua': property.address?.street || '-',
    'Número': property.address?.number || '-',
    'Cidade': property.address?.city || '-',
    'Estado': property.address?.state || '-',
    'País': property.address?.country || '-',
    'CEP': property.address?.zipCode || '-',
    'Endereço Completo': formatFullAddress(property.address),
    'Hóspedes': property.capacity?.guests || '-',
    'Quartos': property.capacity?.bedrooms || '-',
    'Banheiros': property.capacity?.bathrooms || '-',
    'Preço Base (R$)': property.pricing?.basePrice 
      ? (property.pricing.basePrice / 100).toFixed(2).replace('.', ',')
      : '-',
    'Moeda': property.pricing?.currency || '-',
    'Acomodações': property.type === 'location' ? (property.accommodationsCount || 0) : '-',
    'Quantidade de Fotos': property.photos?.length || 0,
    'Tags': property.tags?.join(', ') || '-',
    'Local Pai': property.parentLocationId || '-',
  }));

  // Criar workbook e worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Ajustar largura das colunas
  const colWidths = [
    { wch: 15 }, // ID
    { wch: 30 }, // Nome Interno
    { wch: 30 }, // Nome Público
    { wch: 12 }, // Tipo
    { wch: 15 }, // Estrutura
    { wch: 10 }, // Status
    { wch: 30 }, // Rua
    { wch: 8 },  // Número
    { wch: 20 }, // Cidade
    { wch: 8 },  // Estado
    { wch: 12 }, // País
    { wch: 12 }, // CEP
    { wch: 50 }, // Endereço Completo
    { wch: 10 }, // Hóspedes
    { wch: 10 }, // Quartos
    { wch: 10 }, // Banheiros
    { wch: 15 }, // Preço Base
    { wch: 8 },  // Moeda
    { wch: 12 }, // Acomodações
    { wch: 12 }, // Fotos
    { wch: 40 }, // Tags
    { wch: 15 }, // Local Pai
  ];
  ws['!cols'] = colWidths;

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Imóveis');

  // Gerar arquivo e fazer download
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `${filename}_${timestamp}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return fileName;
};

/**
 * Formata o tipo de estrutura para label
 */
const getStructureTypeLabel = (type?: string): string => {
  const labels: Record<string, string> = {
    'hotel': 'Hotel',
    'house': 'Casa',
    'apartment': 'Apartamento',
    'condo': 'Condomínio',
  };
  return type ? (labels[type] || type) : '-';
};

/**
 * Formata o status para label
 */
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'active': 'Ativo',
    'inactive': 'Inativo',
    'draft': 'Rascunho',
  };
  return labels[status] || status;
};

/**
 * Formata endereço completo
 */
const formatFullAddress = (address?: Property['address']): string => {
  if (!address) return '-';
  
  const parts = [
    address.street,
    address.number,
    address.city,
    address.state,
    address.country,
    address.zipCode,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : '-';
};

/**
 * Exporta dados genéricos para Excel
 */
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Dados') => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `${filename}_${timestamp}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  return fileName;
};
