/**
 * RENDIZY - Action Confirmation Dialog
 * 
 * Componente para confirmação visual de ações críticas com feedback claro
 * 
 * @version 1.0.103.282
 * @date 2025-11-04
 */

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { CheckCircle2, AlertTriangle, Trash2, Edit, Plus } from 'lucide-react';

interface ActionConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'create' | 'edit' | 'delete';
  title: string;
  description: string;
  onConfirm: () => void;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
}

export const ActionConfirmationDialog: React.FC<ActionConfirmationDialogProps> = ({
  open,
  onOpenChange,
  type,
  title,
  description,
  onConfirm,
  loading = false,
  confirmText,
  cancelText = 'Cancelar'
}) => {
  // Configurações por tipo de ação
  const config = {
    create: {
      icon: Plus,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-100 dark:bg-green-900/20',
      confirmButtonClass: 'bg-green-600 hover:bg-green-700',
      defaultConfirmText: 'Criar Imóvel'
    },
    edit: {
      icon: Edit,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-100 dark:bg-blue-900/20',
      confirmButtonClass: 'bg-blue-600 hover:bg-blue-700',
      defaultConfirmText: 'Salvar Alterações'
    },
    delete: {
      icon: Trash2,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-100 dark:bg-red-900/20',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700',
      defaultConfirmText: 'Confirmar Exclusão'
    }
  };

  const currentConfig = config[type];
  const Icon = currentConfig.icon;
  const finalConfirmText = confirmText || currentConfig.defaultConfirmText;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          {/* Ícone visual */}
          <div className={`mx-auto mb-4 w-16 h-16 rounded-full ${currentConfig.iconBg} flex items-center justify-center`}>
            <Icon className={`w-8 h-8 ${currentConfig.iconColor}`} />
          </div>

          {/* Título */}
          <AlertDialogTitle className="text-center text-xl">
            {title}
          </AlertDialogTitle>

          {/* Descrição */}
          <AlertDialogDescription className="text-center text-base pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <AlertDialogCancel 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </AlertDialogCancel>
          
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={`w-full sm:w-auto ${currentConfig.confirmButtonClass}`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando...
              </span>
            ) : (
              finalConfirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/**
 * Dialog de Sucesso
 */
interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onClose?: () => void;
}

export const SuccessDialog: React.FC<SuccessDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  onClose
}) => {
  const handleClose = () => {
    onOpenChange(false);
    onClose?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          {/* Ícone de sucesso animado */}
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center animate-in zoom-in-50 duration-300">
            <CheckCircle2 className="w-12 h-12 text-green-500 animate-in zoom-in-50 duration-500 delay-100" />
          </div>

          {/* Título */}
          <AlertDialogTitle className="text-center text-2xl text-green-600 dark:text-green-400">
            {title}
          </AlertDialogTitle>

          {/* Descrição */}
          <AlertDialogDescription className="text-center text-base pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleClose}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            OK, Entendi!
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
