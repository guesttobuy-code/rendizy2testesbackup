import React, { useState } from 'react';
import { ServiceTicketProduct } from '../../types/funnels';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Plus, Trash2, Package, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';

interface TicketProductsManagerProps {
  products: ServiceTicketProduct[];
  onProductsChange: (products: ServiceTicketProduct[]) => void;
  currency?: 'BRL' | 'USD' | 'EUR';
  hideProducts?: boolean;
  onHideProductsChange?: (hide: boolean) => void;
}

export function TicketProductsManager({
  products,
  onProductsChange,
  currency = 'BRL',
  hideProducts = false,
  onHideProductsChange,
}: TicketProductsManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ServiceTicketProduct | null>(null);
  const [productName, setProductName] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  const [productPrice, setProductPrice] = useState(0);
  const [productDescription, setProductDescription] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : currency === 'EUR' ? 'EUR' : 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const calculateTotal = () => {
    return products.reduce((total, product) => total + product.price * product.quantity, 0);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductName('');
    setProductQuantity(1);
    setProductPrice(0);
    setProductDescription('');
    setIsDialogOpen(true);
  };

  const handleEditProduct = (product: ServiceTicketProduct) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductQuantity(product.quantity);
    setProductPrice(product.price);
    setProductDescription(product.description || '');
    setIsDialogOpen(true);
  };

  const handleSaveProduct = () => {
    if (!productName.trim()) {
      return;
    }

    if (editingProduct) {
      // Editar produto existente
      const updatedProducts = products.map(p =>
        p.id === editingProduct.id
          ? {
              ...p,
              name: productName,
              quantity: productQuantity,
              price: productPrice,
              description: productDescription || undefined,
            }
          : p
      );
      onProductsChange(updatedProducts);
    } else {
      // Adicionar novo produto
      const newProduct: ServiceTicketProduct = {
        id: Date.now().toString(),
        name: productName,
        quantity: productQuantity,
        price: productPrice,
        description: productDescription || undefined,
      };
      onProductsChange([...products, newProduct]);
    }

    setIsDialogOpen(false);
    setEditingProduct(null);
    setProductName('');
    setProductQuantity(1);
    setProductPrice(0);
    setProductDescription('');
  };

  const handleDeleteProduct = (productId: string) => {
    onProductsChange(products.filter(p => p.id !== productId));
  };

  return (
    <div className="space-y-4">
      {/* Header com Valor Total e Controles */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm text-gray-500">Products</p>
            {onHideProductsChange && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onHideProductsChange(!hideProducts)}
                title={hideProducts ? 'Mostrar produtos' : 'Ocultar produtos'}
              >
                {hideProducts ? (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Oculto
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Visível
                  </>
                )}
              </Button>
            )}
          </div>
          {!hideProducts && (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(calculateTotal())}
            </p>
          )}
          {hideProducts && (
            <p className="text-sm text-gray-400 italic">
              Produtos ocultos (não visível para clientes)
            </p>
          )}
        </div>
        {!hideProducts && (
          <Button variant="outline" size="sm" onClick={handleAddProduct}>
            <Plus className="w-4 h-4 mr-2" />
            Add products
          </Button>
        )}
      </div>

      {/* Lista de Produtos */}
      {hideProducts ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center justify-center text-center">
              <EyeOff className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-2">Produtos ocultos</p>
              <p className="text-xs text-gray-400 mb-3">
                Os produtos e valores não são visíveis para clientes
              </p>
              {onHideProductsChange && (
                <Button variant="link" size="sm" onClick={() => onHideProductsChange(false)}>
                  Mostrar produtos
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center justify-center text-center">
              <Package className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-2">No products added</p>
              <Button variant="link" size="sm" onClick={handleAddProduct}>
                + Add products
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {products.map(product => (
            <Card key={product.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{product.name}</h4>
                      <span className="text-xs text-gray-500">
                        (Qtd: {product.quantity})
                      </span>
                    </div>
                    {product.description && (
                      <p className="text-xs text-gray-500 mb-2">{product.description}</p>
                    )}
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(product.price * product.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditProduct(product)}
                    >
                      <Package className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para Adicionar/Editar Produto */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Edit the product details below.'
                : 'Add a new product to this ticket.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Product Name *</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Manutenção de ar condicionado"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label>Price ({currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productPrice}
                  onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Additional details about this product..."
                rows={3}
              />
            </div>

            {productPrice > 0 && productQuantity > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Total:</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(productPrice * productQuantity)}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct} disabled={!productName.trim()}>
              {editingProduct ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

