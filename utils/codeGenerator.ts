/**
 * RENDIZY - Gerador de Códigos Automáticos
 * 
 * Gera códigos únicos de 6 caracteres para Locations e Listings
 * Formato: 3 letras (baseadas no nome) + 3 dígitos
 * 
 * Exemplos:
 * - "Edifício Copacabana Palace" → EDI001
 * - "Casa na Praia Guarujá" → CAS001
 * - "Apartamento 501" → APA001
 * 
 * @version 1.0.88
 */

/**
 * Remove acentos de uma string
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Extrai as 3 primeiras letras significativas de um nome
 * Ignora artigos, preposições e palavras muito curtas
 */
function extractPrefix(name: string): string {
  const ignoredWords = ['o', 'a', 'os', 'as', 'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no'];
  
  // Remove acentos e converte para maiúsculas
  const normalized = removeAccents(name.toUpperCase());
  
  // Separa em palavras
  const words = normalized.split(/\s+/).filter(word => word.length > 0);
  
  // Filtra palavras ignoradas e pega as primeiras letras
  const significantWords = words.filter(word => 
    !ignoredWords.includes(word.toLowerCase()) && word.length >= 2
  );
  
  if (significantWords.length === 0) {
    // Se não houver palavras significativas, usa as primeiras letras de qualquer palavra
    return words[0]?.substring(0, 3).padEnd(3, 'X') || 'XXX';
  }
  
  // Estratégia 1: Primeira palavra (até 3 letras)
  if (significantWords.length === 1 || significantWords[0].length >= 3) {
    return significantWords[0].substring(0, 3);
  }
  
  // Estratégia 2: Primeira letra de cada palavra (até 3 palavras)
  if (significantWords.length >= 2) {
    const letters = significantWords.slice(0, 3).map(w => w[0]).join('');
    if (letters.length >= 3) {
      return letters.substring(0, 3);
    }
    // Se não temos 3 letras, completa com letras da primeira palavra
    return (letters + significantWords[0].substring(1)).substring(0, 3);
  }
  
  return significantWords[0].substring(0, 3).padEnd(3, 'X');
}

/**
 * Gera um número sequencial baseado em códigos existentes
 */
function generateSequentialNumber(existingCodes: string[], prefix: string): string {
  // Filtra códigos com o mesmo prefixo
  const samePrefixCodes = existingCodes
    .filter(code => code.startsWith(prefix))
    .map(code => {
      const numPart = code.substring(3);
      return parseInt(numPart, 10);
    })
    .filter(num => !isNaN(num));
  
  // Encontra o maior número
  const maxNumber = samePrefixCodes.length > 0 
    ? Math.max(...samePrefixCodes) 
    : 0;
  
  // Próximo número
  const nextNumber = maxNumber + 1;
  
  // Formata com 3 dígitos (001, 002, etc.)
  return nextNumber.toString().padStart(3, '0');
}

/**
 * Gera um código único para Location
 * @param name - Nome do location
 * @param existingCodes - Array de códigos já existentes
 * @returns Código único de 6 caracteres (ex: EDI001)
 */
export function generateLocationCode(name: string, existingCodes: string[] = []): string {
  const prefix = extractPrefix(name);
  const number = generateSequentialNumber(existingCodes, prefix);
  return `${prefix}${number}`;
}

/**
 * Gera um código único para Listing
 * @param title - Título do listing
 * @param existingCodes - Array de códigos já existentes
 * @returns Código único de 6 caracteres (ex: APA001)
 */
export function generateListingCode(title: string, existingCodes: string[] = []): string {
  const prefix = extractPrefix(title);
  const number = generateSequentialNumber(existingCodes, prefix);
  return `${prefix}${number}`;
}

/**
 * Valida se um código tem o formato correto
 * @param code - Código a validar
 * @returns true se válido
 */
export function isValidCode(code: string): boolean {
  // 3 letras + 3 dígitos = 6 caracteres
  const regex = /^[A-Z]{3}\d{3}$/;
  return regex.test(code);
}

/**
 * Exemplos de uso:
 * 
 * const locationCodes = ['EDI001', 'EDI002', 'CAS001'];
 * generateLocationCode('Edifício Vista Mar', locationCodes); // → 'EDI003'
 * generateLocationCode('Casa na Praia', locationCodes);      // → 'CAS002'
 * generateLocationCode('Residencial Gramado', locationCodes); // → 'RES001'
 * 
 * const listingCodes = ['APA001', 'APA002'];
 * generateListingCode('Apartamento 501', listingCodes);      // → 'APA003'
 * generateListingCode('Cobertura Duplex', listingCodes);     // → 'COB001'
 */
