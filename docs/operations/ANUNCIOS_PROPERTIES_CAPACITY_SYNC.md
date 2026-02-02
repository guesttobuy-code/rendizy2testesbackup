# 🔁 Sync de Capacidade: `properties` → `properties`

## Problema (por que “funcionava” e parou)

A UI de cards/listas (ex.: gestão de unidades) exibe **quartos / banheiros / camas / hóspedes** a partir das colunas **SQL**:

- `properties.bedrooms`
- `properties.bathrooms`
- `properties.beds`
- `properties.max_guests`

Já a edição interna do anúncio (Anúncio Ultimate) grava os cômodos em:

- `properties.data.rooms` (JSON)

Ou seja: ao editar `rooms[]`, os números no card não mudavam porque **o card não lê `rooms[]`** — ele lê a tabela `properties`.

Isso parecia “funcionar” quando `properties.*` era atualizado junto (ex.: fluxos antigos/imports). Ao mudar o fluxo para editar apenas `properties.data`, o card ficou “travado”.

---

## Solução implementada (regra de ouro)

Sempre que o anúncio atualizar dados que afetam capacidade, o backend deve sincronizar (fan-out) as colunas da tabela `properties`.

### Onde isso acontece

No Edge Function `rendizy-server`, em:

- `POST /properties/save-field`
  - Se `field === "rooms"` (e também quando salvar `guests/max_guests`), recalcula capacidade e faz `UPDATE properties`.
- `PATCH /properties/:id`
  - Após salvar `data`, se existir `data.rooms`, recalcula capacidade e faz `UPDATE properties`.

### Regras de cálculo (alinhadas com o frontend)

A partir de `rooms[]`:

- **Bedrooms**
  - Conta `suite`, `quarto-duplo`, `quarto-individual`, `estudio`
  - Fallback por texto (accent-insensitive): se `type/typeName/customName` contiver `quarto` ou `suite`
- **Bathrooms**
  - Conta `banheiro`, `meio-banheiro`, e também **suítes** (suite conta como banheiro)
  - Fallback por texto: `banheiro`/`lavabo`/`suite`
- **Beds**
  - Soma todas as quantidades em `room.beds`.
- **Max guests**
  - Se existir `data.guests` (ou `data.maxGuests`/`data.max_guests`), usa esse valor para `properties.max_guests`.

---

## Por que isso evita regressão

- A tabela `properties` continua sendo o **modelo de leitura rápida** para cards/listas.
- O JSON `properties.data` continua sendo o **modelo canônico** para edição interna.
- A sincronização garante consistência entre os dois sem depender de refresh manual ou “import”.

---

## Checklist de validação (antes de subir)

1. Editar cômodos (incluindo suíte) no Anúncio Ultimate
2. Salvar (via “Salvar cômodos” ou “Salvar tudo”)
3. Confirmar que o card/lista reflete imediatamente:
   - quartos/banheiros/camas/hóspedes
4. Se necessário, validar no banco:
   - `properties` deve refletir os novos valores

---

## Observações importantes

- A sincronização é sempre filtrada por `organization_id` para não vazar tenant.
- Se no futuro novos tipos de cômodo forem adicionados no frontend, atualizar as regras de derivação aqui também.
