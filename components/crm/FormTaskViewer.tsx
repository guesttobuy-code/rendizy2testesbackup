import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { FormInput, CheckCircle2, ExternalLink } from 'lucide-react';
import { ServiceTask } from '../../types/funnels';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface FormTaskViewerProps {
  task: ServiceTask;
  onComplete?: (formData: Record<string, any>) => void;
  readOnly?: boolean;
}

export function FormTaskViewer({
  task,
  onComplete,
  readOnly = false,
}: FormTaskViewerProps) {
  const [formData, setFormData] = useState<Record<string, any>>(
    task.formData?.responseData || {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (task.type !== 'FORM' || !task.formData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">Esta tarefa não é um formulário</p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async () => {
    if (readOnly) return;

    setIsSubmitting(true);
    try {
      // Validar campos obrigatórios (se houver)
      // Por enquanto, aceitar qualquer resposta

      if (onComplete) {
        await onComplete(formData);
      }

      toast.success('Formulário respondido com sucesso!');
    } catch (error: any) {
      console.error('Erro ao enviar formulário:', error);
      toast.error('Erro ao enviar formulário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleted = task.formData.completed;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FormInput className="w-5 h-5" />
            {task.title}
          </CardTitle>
          {isCompleted && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Respondido</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {task.formData.formId && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Formulário ID:</strong> {task.formData.formId}
            </p>
            {task.formData.responseUrl && (
              <a
                href={task.formData.responseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2"
              >
                Ver resposta completa
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {!isCompleted && !readOnly ? (
          <>
            {/* Campos de exemplo - em produção, carregar do formId */}
            <div>
              <Label>Nome Completo</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Digite seu nome"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={formData.message || ''}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Digite sua mensagem..."
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="agree"
                checked={formData.agree || false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, agree: checked })
                }
              />
              <Label htmlFor="agree" className="text-sm">
                Concordo com os termos e condições
              </Label>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Resposta'}
            </Button>
          </>
        ) : (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isCompleted
                ? 'Este formulário já foi respondido.'
                : 'Este formulário está em modo somente leitura.'}
            </p>
            {Object.keys(formData).length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Respostas:</p>
                {Object.entries(formData).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <strong>{key}:</strong> {String(value)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

