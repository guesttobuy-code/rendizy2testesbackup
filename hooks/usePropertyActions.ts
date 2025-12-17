/**
 * RENDIZY - Property Actions Hook
 * 
 * Hook padronizado para ações de imóveis (criar, editar, deletar)
 * Com mensagens de sucesso e redirecionamento automático
 * 
 * @version 1.0.103.280
 * @date 2025-11-04
 */

import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import enhancedToast from '../utils/enhancedToast';
import { propertiesApi, locationsApi } from '../utils/api';

interface PropertyActionOptions {
  /**
   * Se true, recarrega a página após a ação
   * @default true
   */
  reloadPage?: boolean;
  
  /**
   * Se true, redireciona para /properties após a ação
   * @default true
   */
  redirectToList?: boolean;
  
  /**
   * Mensagem customizada de sucesso (sobrescreve a padrão)
   */
  customSuccessMessage?: string;
  
  /**
   * Se true, pula a confirmação e executa direto
   * @default false
   */
  skipConfirmation?: boolean;
  
  /**
   * Callback executado após sucesso da ação
   */
  onSuccess?: () => void;
  
  /**
   * Callback executado em caso de erro
   */
  onError?: (error: Error) => void;
}

interface Property {
  id: string;
  internalName?: string;
  publicName?: string;
  name?: string;
  type?: 'location' | 'accommodation';
  [key: string]: any;
}

export const usePropertyActions = () => {
  const navigate = useNavigate();

  /**
   * Cria um novo imóvel
   */
  const createProperty = async (
    data: Partial<Property>,
    options: PropertyActionOptions = {}
  ) => {
    const {
      reloadPage = true,
      redirectToList = true,
      customSuccessMessage,
      onSuccess,
      onError
    } = options;

    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🏗️ [PROPERTY ACTIONS] Criando imóvel...');
      console.log('📊 [PROPERTY ACTIONS] Dados:', data);
      
      let response;
      
      if (data.type === 'location') {
        response = await locationsApi.create(data);
      } else {
        response = await propertiesApi.create(data);
      }
      
      console.log('✅ [PROPERTY ACTIONS] Imóvel criado com sucesso:', response);
      
      const propertyName = data.internalName || data.publicName || data.name || 'Imóvel';
      const successMessage = customSuccessMessage || `${propertyName} criado com sucesso!`;
      
      // Toast aprimorado - mais visível e duradouro
      enhancedToast.success(successMessage, {
        description: 'O imóvel foi cadastrado no sistema',
        duration: 6000 // 6 segundos
      });
      
      // Aguardar para o usuário ver o toast (1.5s - tempo suficiente para ler)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Executar callback de sucesso se fornecido (para atualizar lista localmente)
      if (onSuccess) {
        console.log('🔄 [PROPERTY ACTIONS] Executando callback onSuccess...');
        onSuccess();
      }
      
      // Redirecionar para lista se necessário
      if (redirectToList) {
        console.log('🔄 [PROPERTY ACTIONS] Redirecionando para /properties...');
        navigate('/properties');
      }
      
      // ⚡ REMOVIDO: window.location.reload()
      // Agora usamos onSuccess callback para atualizar lista localmente
      // Isso evita tela branca e mantém experiência fluida
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return response;
    } catch (error) {
      console.error('❌ [PROPERTY ACTIONS] Erro ao criar imóvel:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      enhancedToast.error(`Erro ao criar imóvel: ${errorMessage}`, {
        description: 'Verifique os dados e tente novamente',
        duration: 7000 // 7 segundos para ler o erro
      });
      
      if (onError && error instanceof Error) {
        onError(error);
      }
      
      throw error;
    }
  };

  /**
   * Edita um imóvel existente
   */
  const updateProperty = async (
    propertyId: string,
    data: Partial<Property>,
    options: PropertyActionOptions = {}
  ) => {
    const {
      reloadPage = true,
      redirectToList = true,
      customSuccessMessage,
      onSuccess,
      onError
    } = options;

    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✏️ [PROPERTY ACTIONS] Editando imóvel...');
      console.log('📊 [PROPERTY ACTIONS] ID:', propertyId);
      console.log('📊 [PROPERTY ACTIONS] Dados:', data);
      
      let response;
      
      if (data.type === 'location') {
        response = await locationsApi.update(propertyId, data);
      } else {
        response = await propertiesApi.update(propertyId, data);
      }
      
      console.log('✅ [PROPERTY ACTIONS] Imóvel editado com sucesso:', response);
      
      const propertyName = data.internalName || data.publicName || data.name || 'Imóvel';
      const successMessage = customSuccessMessage || `${propertyName} editado com sucesso!`;
      
      // Toast aprimorado - mais visível e duradouro
      enhancedToast.success(successMessage, {
        description: 'As alterações foram salvas no sistema',
        duration: 6000 // 6 segundos
      });
      
      // Aguardar para o usuário ver o toast (1.5s - tempo suficiente para ler)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Executar callback de sucesso se fornecido (para atualizar lista localmente)
      if (onSuccess) {
        console.log('🔄 [PROPERTY ACTIONS] Executando callback onSuccess...');
        onSuccess();
      }
      
      // Redirecionar para lista se necessário
      if (redirectToList) {
        console.log('🔄 [PROPERTY ACTIONS] Redirecionando para /properties...');
        navigate('/properties');
      }
      
      // ⚡ REMOVIDO: window.location.reload()
      // Agora usamos onSuccess callback para atualizar lista localmente
      // Isso evita tela branca e mantém experiência fluida
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return response;
    } catch (error) {
      console.error('❌ [PROPERTY ACTIONS] Erro ao editar imóvel:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      enhancedToast.error(`Erro ao editar imóvel: ${errorMessage}`, {
        description: 'Verifique os dados e tente novamente',
        duration: 7000 // 7 segundos para ler o erro
      });
      
      if (onError && error instanceof Error) {
        onError(error);
      }
      
      throw error;
    }
  };

  /**
   * Deleta um imóvel
   */
  const deleteProperty = async (
    property: Property,
    softDelete: boolean = false,
    options: PropertyActionOptions = {}
  ) => {
    const {
      reloadPage = true,
      redirectToList = true,
      customSuccessMessage,
      onSuccess,
      onError
    } = options;

    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🗑️ [PROPERTY ACTIONS] Deletando imóvel...');
      console.log('📊 [PROPERTY ACTIONS] ID:', property.id);
      console.log('📊 [PROPERTY ACTIONS] Soft Delete:', softDelete);
      
      let response;
      
      if (property.type === 'location') {
        response = await locationsApi.delete(property.id, softDelete);
      } else {
        response = await propertiesApi.delete(property.id, softDelete);
      }
      
      console.log('✅ [PROPERTY ACTIONS] Imóvel deletado com sucesso:', response);
      
      const propertyName = property.internalName || property.publicName || property.name || 'Imóvel';
      const action = softDelete ? 'desativado' : 'deletado';
      const successMessage = customSuccessMessage || `${propertyName} ${action} com sucesso!`;
      const description = softDelete 
        ? 'O imóvel foi desativado e não aparecerá mais na listagem' 
        : 'O imóvel foi removido permanentemente do sistema';
      
      // Toast aprimorado - mais visível e duradouro
      enhancedToast.success(successMessage, {
        description,
        duration: 6000 // 6 segundos
      });
      
      // Aguardar para o usuário ver o toast (1.5s - tempo suficiente para ler)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Executar callback de sucesso se fornecido (para atualizar lista localmente)
      if (onSuccess) {
        console.log('🔄 [PROPERTY ACTIONS] Executando callback onSuccess...');
        onSuccess();
      }
      
      // Redirecionar para lista SE não estiver nela já
      if (redirectToList) {
        console.log('🔄 [PROPERTY ACTIONS] Redirecionando para /properties...');
        navigate('/properties');
        
        // ⚡ NÃO fazer reload - a lista será atualizada pelo onSuccess
        // window.location.reload() causa tela branca e perde o toast!
      }
      
      // ⚡ REMOVIDO: window.location.reload()
      // Agora usamos onSuccess callback para atualizar lista localmente
      // Isso evita tela branca e mantém experiência fluida
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return response;
    } catch (error) {
      console.error('❌ [PROPERTY ACTIONS] Erro ao deletar imóvel:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      enhancedToast.error(`Erro ao deletar imóvel: ${errorMessage}`, {
        description: 'Não foi possível excluir o imóvel. Tente novamente.',
        duration: 7000 // 7 segundos para ler o erro
      });
      
      if (onError && error instanceof Error) {
        onError(error);
      }
      
      throw error;
    }
  };

  /**
   * Cancela a edição e volta para a lista
   */
  const cancelEditing = () => {
    console.log('🔙 [PROPERTY ACTIONS] Cancelando edição, voltando para /properties...');
    
    // Mostrar mensagem de confirmação aprimorada
    enhancedToast.info('Edição cancelada', {
      description: 'As alterações não foram salvas',
      duration: 4000 // 4 segundos
    });
    
    // Pequeno delay para usuário ver a mensagem
    setTimeout(() => {
      navigate('/properties');
    }, 300);
  };

  return {
    createProperty,
    updateProperty,
    deleteProperty,
    cancelEditing
  };
};

/**
 * EXEMPLOS DE USO:
 * 
 * // 1. Criar imóvel com comportamento padrão
 * const { createProperty } = usePropertyActions();
 * await createProperty(propertyData);
 * // → Toast: "Casa da Praia criado com sucesso!"
 * // → Redireciona para /properties
 * // → Recarrega a página
 * 
 * // 2. Editar imóvel sem recarregar página
 * const { updateProperty } = usePropertyActions();
 * await updateProperty(propertyId, propertyData, { 
 *   reloadPage: false 
 * });
 * // → Toast: "Casa da Praia editado com sucesso!"
 * // → Redireciona para /properties
 * // → NÃO recarrega a página
 * 
 * // 3. Deletar imóvel com mensagem customizada
 * const { deleteProperty } = usePropertyActions();
 * await deleteProperty(property, false, {
 *   customSuccessMessage: "Imóvel removido permanentemente!"
 * });
 * // → Toast: "Imóvel removido permanentemente!"
 * // → Redireciona para /properties
 * // → Recarrega a página
 * 
 * // 4. Criar imóvel com callback de sucesso
 * const { createProperty } = usePropertyActions();
 * await createProperty(propertyData, {
 *   onSuccess: () => {
 *     console.log('Imóvel criado! Fazendo algo extra...');
 *     loadOtherData();
 *   }
 * });
 * 
 * // 5. Cancelar edição
 * const { cancelEditing } = usePropertyActions();
 * cancelEditing();
 * // → Redireciona para /properties
 */
