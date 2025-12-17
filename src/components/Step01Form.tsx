import React, { useEffect, useRef, useState } from 'react'
import { saveField } from '../lib/anuncioFieldSaver'
import './Step01Form.css'

type FieldState = {
  value: any
  status: 'idle' | 'saving' | 'saved' | 'error'
  error?: string | null
}

// ✅ Whitelists de validação (restauradas do wizard original)
const allowedTipoLocal = new Set([
  'acomodacao_movel','albergue','apartamento','apartamento_residencial','bangalo','barco','barco_beira','boutique','cabana','cama_cafe','camping','casa','casa_movel','castelo','chale','chale_camping','condominio','estalagem','fazenda','hotel','hotel_boutique','hostel','iate','industrial','motel','pousada','residencia','resort','treehouse','villa'
])

const allowedTipoAcomodacao = new Set([
  'apartamento','bangalo','cabana','camping','capsula','casa','casa_dormitorios','chale','condominio','dormitorio','estudio','holiday_home','hostel','hotel','iate','industrial','loft','quarto_compartilhado','quarto_inteiro','quarto_privado','suite','treehouse','villa'
])

const allowedSubtype = new Set(['entire_place','private_room','shared_room'])

export default function Step01Form() {
  const [anuncioId, setAnuncioId] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, FieldState>>({
    internal_name: { value: '', status: 'idle' },
    property_type: { value: '', status: 'idle' },
    accommodation_type: { value: '', status: 'idle' },
    subtype: { value: '', status: 'idle' },
    modalities: { value: [], status: 'idle' },
    listing_structure: { value: 'individual', status: 'idle' },
    subtitle: { value: '', status: 'idle' }
  })

  // debounce timers per field
  const timers = useRef<Record<string, any>>({})

  // ✅ Validação antes de salvar
  const validateField = (key: string, value: any): { valid: boolean; error?: string } => {
    if (key === 'property_type' && value && !allowedTipoLocal.has(value)) {
      console.error('❌ Checkpoint 4: Tipo Local inválido:', value)
      console.error('❌ Whitelist:', Array.from(allowedTipoLocal))
      return { valid: false, error: 'Tipo de local inválido' }
    }
    if (key === 'accommodation_type' && value && !allowedTipoAcomodacao.has(value)) {
      console.error('❌ Checkpoint 6: Tipo Acomodação inválido:', value)
      console.error('❌ Whitelist:', Array.from(allowedTipoAcomodacao))
      return { valid: false, error: 'Tipo de acomodação inválido' }
    }
    if (key === 'subtype' && value && !allowedSubtype.has(value)) {
      console.error('❌ Checkpoint 8: Subtipo inválido:', value)
      console.error('❌ Whitelist:', Array.from(allowedSubtype))
      return { valid: false, error: 'Subtipo inválido' }
    }
    return { valid: true }
  }

  const setField = (key: string, value: any) => {
    // Validar antes de marcar como saving
    const validation = validateField(key, value)
    if (!validation.valid) {
      setFields(prev => ({ ...prev, [key]: { ...(prev[key] || {}), value, status: 'error', error: validation.error } }))
      return
    }

    setFields(prev => ({ ...prev, [key]: { ...(prev[key] || {}), value, status: 'saving', error: null } }))
    if (timers.current[key]) clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => doSaveField(key), 450)
  }

  const doSaveField = async (key: string) => {
    setFields(prev => ({ ...prev, [key]: { ...(prev[key] || {}), status: 'saving', error: null } }))
    const value = fields[key]?.value
    
    // ✅ Checkpoint 1: Salvar o campo principal
    const res = await saveField({ anuncioId, field: key, value })
    if (res.ok) {
      const createdId = res.data?.anuncio?.id || null
      if (!anuncioId && createdId) setAnuncioId(createdId)
      
      // ✅ Se for internal_name, salvar também como internal_id (para display em cards)
      if (key === 'internal_name' && value) {
        console.log('✅ Salvando internal_id duplicado para cards:', value)
        await saveField({ anuncioId: createdId || anuncioId, field: 'internal_id', value })
      }
      
      setFields(prev => ({ ...prev, [key]: { ...(prev[key] || {}), status: 'saved' } }))
    } else {
      setFields(prev => ({ ...prev, [key]: { ...(prev[key] || {}), status: 'error', error: res.error } }))
    }
  }

  // helper for checkbox array toggles
  const toggleModalidade = (value: string) => {
    const arr = Array.isArray(fields.modalities.value) ? [...fields.modalities.value] : []
    const idx = arr.indexOf(value)
    if (idx >= 0) arr.splice(idx, 1)
    else arr.push(value)
    setField('modalities', arr)
  }

  return (
    <div className="step01-card">
      <h2>Tipo e Identificação</h2>
      <p className="muted">Que tipo de propriedade você está anunciando?</p>

      <div className="form-row">
        <label>Identificação Interna</label>
        <input value={fields.internal_name.value} onChange={e => setField('internal_name', e.target.value)} placeholder="Nome para identificar este imóvel (visível apenas para a equipe)" />
        <small className={`status ${fields.internal_name.status}`}>{fields.internal_name.status}</small>
      </div>

      <div className="form-row two-cols">
        <div>
          <label>Tipo do local</label>
          <select value={fields.property_type.value} onChange={e => setField('property_type', e.target.value)}>
            <option value="">Selecione</option>
            <option value="acomodacao_movel">Acomodação Móvel</option>
            <option value="albergue">Albergue</option>
            <option value="apartamento">Apartamento</option>
            <option value="apartamento_residencial">Apartamento Residencial</option>
            <option value="bangalo">Bangalô</option>
            <option value="barco">Barco</option>
            <option value="barco_beira">Barco Beira</option>
            <option value="boutique">Boutique</option>
            <option value="cabana">Cabana</option>
            <option value="cama_cafe">Cama & Café</option>
            <option value="camping">Camping</option>
            <option value="casa">Casa</option>
            <option value="casa_movel">Casa Móvel</option>
            <option value="castelo">Castelo</option>
            <option value="chale">Chalé</option>
            <option value="chale_camping">Chalé Camping</option>
            <option value="condominio">Condomínio</option>
            <option value="estalagem">Estalagem</option>
            <option value="fazenda">Fazenda</option>
            <option value="hotel">Hotel</option>
            <option value="hotel_boutique">Hotel Boutique</option>
            <option value="hostel">Hostel</option>
            <option value="iate">Iate</option>
            <option value="industrial">Industrial</option>
            <option value="motel">Motel</option>
            <option value="pousada">Pousada</option>
            <option value="residencia">Residência</option>
            <option value="resort">Resort</option>
            <option value="treehouse">Treehouse</option>
            <option value="villa">Villa</option>
          </select>
          <small className={`status ${fields.property_type.status}`}>{fields.property_type.status}</small>
          {fields.property_type.error && <small className="error">{fields.property_type.error}</small>}
        </div>

        <div>
          <label>Tipo de acomodação</label>
          <select value={fields.accommodation_type.value} onChange={e => setField('accommodation_type', e.target.value)}>
            <option value="">Selecione</option>
            <option value="apartamento">Apartamento</option>
            <option value="bangalo">Bangalô</option>
            <option value="cabana">Cabana</option>
            <option value="camping">Camping</option>
            <option value="capsula">Cápsula</option>
            <option value="casa">Casa</option>
            <option value="casa_dormitorios">Casa Dormitórios</option>
            <option value="chale">Chalé</option>
            <option value="condominio">Condomínio</option>
            <option value="dormitorio">Dormitório</option>
            <option value="estudio">Estúdio</option>
            <option value="holiday_home">Holiday Home</option>
            <option value="hostel">Hostel</option>
            <option value="hotel">Hotel</option>
            <option value="iate">Iate</option>
            <option value="industrial">Industrial</option>
            <option value="loft">Loft</option>
            <option value="quarto_compartilhado">Quarto Compartilhado</option>
            <option value="quarto_inteiro">Quarto Inteiro</option>
            <option value="quarto_privado">Quarto Privado</option>
            <option value="suite">Suíte</option>
            <option value="treehouse">Treehouse</option>
            <option value="villa">Villa</option>
          </select>
          <small className={`status ${fields.accommodation_type.status}`}>{fields.accommodation_type.status}</small>
          {fields.accommodation_type.error && <small className="error">{fields.accommodation_type.error}</small>}
        </div>
      </div>

      <div className="form-row">
        <label>Subtipo</label>
        <select value={fields.subtype.value} onChange={e => setField('subtype', e.target.value)}>
          <option value="">Selecione</option>
          <option value="entire_place">Lugar Inteiro</option>
          <option value="private_room">Quarto Privado</option>
          <option value="shared_room">Quarto Compartilhado</option>
        </select>
        <small className={`status ${fields.subtype.status}`}>{fields.subtype.status}</small>
        {fields.subtype.error && <small className="error">{fields.subtype.error}</small>}
      </div>

      <div className="form-row">
        <label>Modalidade</label>
        <div className="checkboxes">
          <label><input type="checkbox" checked={fields.modalities.value.includes('seasonal_rent')} onChange={() => toggleModalidade('seasonal_rent')} /> Aluguel por temporada</label>
          <label><input type="checkbox" checked={fields.modalities.value.includes('sale')} onChange={() => toggleModalidade('sale')} /> Compra e venda</label>
          <label><input type="checkbox" checked={fields.modalities.value.includes('residential_rent')} onChange={() => toggleModalidade('residential_rent')} /> Locação residencial</label>
        </div>
        <small className={`status ${fields.modalities.status}`}>{fields.modalities.status}</small>
      </div>

      <div className="form-row">
        <label>Estrutura do Anúncio</label>
        <div className="radios">
          <label><input type="radio" name="structure" checked={fields.listing_structure.value === 'individual'} onChange={() => setField('listing_structure', 'individual')} /> Anúncio Individual</label>
          <label><input type="radio" name="structure" checked={fields.listing_structure.value === 'linked'} onChange={() => setField('listing_structure', 'linked')} /> Anúncio Vinculado</label>
        </div>
        <small className={`status ${fields.listing_structure.status}`}>{fields.listing_structure.status}</small>
      </div>

      <div className="form-row">
        <label>Subtítulo</label>
        <input value={fields.subtitle.value} onChange={e => setField('subtitle', e.target.value)} placeholder="Breve frase que aparece no anúncio" maxLength={120} />
        <small className={`status ${fields.subtitle.status}`}>{fields.subtitle.status}</small>
      </div>

      <div className="footer-actions">
        <button className="btn secondary">Cancelar</button>
        <button className="btn primary" onClick={() => alert('Salvar e Avançar (ainda faz saves campo-a-campo)')}>Salvar e Avançar</button>
      </div>
    </div>
  )
}
