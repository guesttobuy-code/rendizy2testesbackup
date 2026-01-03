# Comandos para Testar Categorias do Plano de Contas

## 1. Listar TODAS as categorias existentes

Execute este SQL no Supabase Dashboard (SQL Editor):

```sql
SELECT 
  id,
  codigo,
  nome,
  tipo,
  natureza,
  nivel,
  ativo,
  organization_id,
  created_at
FROM financeiro_categorias
ORDER BY codigo;
```

## 2. Criar uma categoria teste

```sql
INSERT INTO financeiro_categorias (
  id,
  organization_id,
  codigo,
  nome,
  tipo,
  natureza,
  nivel,
  ativo,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  id,  -- Usa a primeira organização disponível
  '9.9.9',
  'Categoria Teste',
  'receita',
  'credora',
  3,
  true,
  NOW(),
  NOW()
FROM organizations
LIMIT 1;
```

## 3. Verificar se a categoria foi criada

```sql
SELECT * FROM financeiro_categorias WHERE codigo = '9.9.9';
```

## 4. Contar total de categorias por organização

```sql
SELECT 
  organization_id,
  COUNT(*) as total_categorias
FROM financeiro_categorias
GROUP BY organization_id;
```

