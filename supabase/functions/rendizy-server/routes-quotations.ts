import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const quotations = new Hono();

// ============================================
// TYPES
// ============================================

interface Quotation {
  id: string;
  organization_id: string;
  quotation_code: string;
  property_id: string;
  property_name: string;
  start_date: string;
  end_date: string;
  nights: number;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  price_per_night: number;
  total_price: number;
  deposit?: number;
  installment_value?: number;
  payment_option: 'full' | 'deposit' | 'installments';
  validity_days: number;
  valid_until: string;
  notes?: string;
  link: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'converted';
  conversation_id?: string;
  reservation_id?: string; // If converted to reservation
  created_at: string;
  updated_at: string;
  created_by: string;
  accepted_at?: string;
  rejected_at?: string;
  converted_at?: string;
}

// ============================================
// QUOTATIONS CRUD
// ============================================

// GET all quotations
quotations.get('/', async (c) => {
  try {
    const orgId = c.req.query('organization_id');
    const status = c.req.query('status');
    
    if (!orgId) {
      return c.json({ success: false, error: 'organization_id is required' }, 400);
    }

    const prefix = `quotation:${orgId}:`;
    let allQuotations = await kv.getByPrefix<Quotation>(prefix);

    // Filter by status if provided
    if (status) {
      allQuotations = allQuotations.filter(q => q.status === status);
    }

    // Update expired quotations
    const now = new Date();
    for (const quotation of allQuotations) {
      if (
        quotation.status === 'pending' && 
        new Date(quotation.valid_until) < now
      ) {
        quotation.status = 'expired';
        quotation.updated_at = now.toISOString();
        const key = `quotation:${orgId}:${quotation.id}`;
        await kv.set(key, quotation);
      }
    }

    // Sort by created_at desc
    allQuotations.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return c.json({ success: true, data: allQuotations });
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// GET single quotation
quotations.get('/:id', async (c) => {
  try {
    const quotationId = c.req.param('id');
    const orgId = c.req.query('organization_id');
    
    if (!orgId) {
      return c.json({ success: false, error: 'organization_id is required' }, 400);
    }

    const key = `quotation:${orgId}:${quotationId}`;
    const quotation = await kv.get<Quotation>(key);

    if (!quotation) {
      return c.json({ success: false, error: 'Quotation not found' }, 404);
    }

    // Check if expired
    if (
      quotation.status === 'pending' && 
      new Date(quotation.valid_until) < new Date()
    ) {
      quotation.status = 'expired';
      quotation.updated_at = new Date().toISOString();
      await kv.set(key, quotation);
    }

    return c.json({ success: true, data: quotation });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// GET quotation by code (public access)
quotations.get('/public/code/:code', async (c) => {
  try {
    const code = c.req.param('code');
    
    // Search across all organizations for this code
    const allKeys = await kv.getByPrefix<Quotation>('quotation:');
    const quotation = allKeys.find(q => q.quotation_code === code);

    if (!quotation) {
      return c.json({ success: false, error: 'Quotation not found' }, 404);
    }

    // Check if expired
    if (
      quotation.status === 'pending' && 
      new Date(quotation.valid_until) < new Date()
    ) {
      quotation.status = 'expired';
      quotation.updated_at = new Date().toISOString();
      const key = `quotation:${quotation.organization_id}:${quotation.id}`;
      await kv.set(key, quotation);
    }

    return c.json({ success: true, data: quotation });
  } catch (error) {
    console.error('Error fetching quotation by code:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// POST create quotation
quotations.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const {
      organization_id,
      property_id,
      property_name,
      start_date,
      end_date,
      guest_name,
      guest_email,
      guest_phone,
      price_per_night,
      payment_option = 'full',
      validity_days = 7,
      notes,
      conversation_id,
      created_by,
    } = body;

    if (!organization_id || !property_id || !property_name || 
        !start_date || !end_date || !guest_name || !guest_email || 
        !price_per_night || !created_by) {
      return c.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, 400);
    }

    // Calculate nights and prices
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = price_per_night * nights;
    const deposit = totalPrice * 0.3;
    const installmentValue = (totalPrice - deposit) / 2;

    // Generate quotation code
    const quotationCode = `QT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Generate unique link
    const linkHash = Math.random().toString(36).substr(2, 12);
    const link = `https://reservas.rendizy.com/cotacao/${linkHash}`;

    const quotationId = `quot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const validUntil = new Date(now.getTime() + validity_days * 24 * 60 * 60 * 1000);

    const quotation: Quotation = {
      id: quotationId,
      organization_id,
      quotation_code: quotationCode,
      property_id,
      property_name,
      start_date,
      end_date,
      nights,
      guest_name,
      guest_email,
      guest_phone,
      price_per_night,
      total_price: totalPrice,
      deposit,
      installment_value: installmentValue,
      payment_option,
      validity_days,
      valid_until: validUntil.toISOString(),
      notes,
      link,
      status: 'pending',
      conversation_id,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      created_by,
    };

    const key = `quotation:${organization_id}:${quotationId}`;
    await kv.set(key, quotation);

    // Store link mapping for public access
    const linkKey = `quotation:link:${linkHash}`;
    await kv.set(linkKey, { quotation_id: quotationId, organization_id });

    return c.json({ success: true, data: quotation });
  } catch (error) {
    console.error('Error creating quotation:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// PATCH update quotation
quotations.patch('/:id', async (c) => {
  try {
    const quotationId = c.req.param('id');
    const body = await c.req.json();
    const orgId = body.organization_id;
    
    if (!orgId) {
      return c.json({ success: false, error: 'organization_id is required' }, 400);
    }

    const key = `quotation:${orgId}:${quotationId}`;
    const quotation = await kv.get<Quotation>(key);

    if (!quotation) {
      return c.json({ success: false, error: 'Quotation not found' }, 404);
    }

    // Don't allow editing expired or converted quotations
    if (quotation.status === 'expired' || quotation.status === 'converted') {
      return c.json({ 
        success: false, 
        error: `Cannot edit ${quotation.status} quotation` 
      }, 400);
    }

    const updated: Quotation = {
      ...quotation,
      ...body,
      id: quotationId,
      organization_id: orgId,
      updated_at: new Date().toISOString(),
    };

    await kv.set(key, updated);

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating quotation:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// PATCH accept quotation
quotations.patch('/:id/accept', async (c) => {
  try {
    const quotationId = c.req.param('id');
    const body = await c.req.json();
    const orgId = body.organization_id;
    
    if (!orgId) {
      return c.json({ success: false, error: 'organization_id is required' }, 400);
    }

    const key = `quotation:${orgId}:${quotationId}`;
    const quotation = await kv.get<Quotation>(key);

    if (!quotation) {
      return c.json({ success: false, error: 'Quotation not found' }, 404);
    }

    if (quotation.status !== 'pending') {
      return c.json({ 
        success: false, 
        error: 'Only pending quotations can be accepted' 
      }, 400);
    }

    quotation.status = 'accepted';
    quotation.accepted_at = new Date().toISOString();
    quotation.updated_at = new Date().toISOString();

    await kv.set(key, quotation);

    return c.json({ success: true, data: quotation });
  } catch (error) {
    console.error('Error accepting quotation:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// PATCH reject quotation
quotations.patch('/:id/reject', async (c) => {
  try {
    const quotationId = c.req.param('id');
    const body = await c.req.json();
    const orgId = body.organization_id;
    
    if (!orgId) {
      return c.json({ success: false, error: 'organization_id is required' }, 400);
    }

    const key = `quotation:${orgId}:${quotationId}`;
    const quotation = await kv.get<Quotation>(key);

    if (!quotation) {
      return c.json({ success: false, error: 'Quotation not found' }, 404);
    }

    if (quotation.status !== 'pending') {
      return c.json({ 
        success: false, 
        error: 'Only pending quotations can be rejected' 
      }, 400);
    }

    quotation.status = 'rejected';
    quotation.rejected_at = new Date().toISOString();
    quotation.updated_at = new Date().toISOString();

    await kv.set(key, quotation);

    return c.json({ success: true, data: quotation });
  } catch (error) {
    console.error('Error rejecting quotation:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// PATCH convert quotation to reservation
quotations.patch('/:id/convert', async (c) => {
  try {
    const quotationId = c.req.param('id');
    const body = await c.req.json();
    const { organization_id, reservation_id } = body;
    
    if (!organization_id || !reservation_id) {
      return c.json({ 
        success: false, 
        error: 'organization_id and reservation_id are required' 
      }, 400);
    }

    const key = `quotation:${organization_id}:${quotationId}`;
    const quotation = await kv.get<Quotation>(key);

    if (!quotation) {
      return c.json({ success: false, error: 'Quotation not found' }, 404);
    }

    if (quotation.status !== 'accepted' && quotation.status !== 'pending') {
      return c.json({ 
        success: false, 
        error: 'Only accepted or pending quotations can be converted' 
      }, 400);
    }

    quotation.status = 'converted';
    quotation.reservation_id = reservation_id;
    quotation.converted_at = new Date().toISOString();
    quotation.updated_at = new Date().toISOString();

    await kv.set(key, quotation);

    return c.json({ success: true, data: quotation });
  } catch (error) {
    console.error('Error converting quotation:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// DELETE quotation
quotations.delete('/:id', async (c) => {
  try {
    const quotationId = c.req.param('id');
    const orgId = c.req.query('organization_id');
    
    if (!orgId) {
      return c.json({ success: false, error: 'organization_id is required' }, 400);
    }

    const key = `quotation:${orgId}:${quotationId}`;
    const quotation = await kv.get<Quotation>(key);

    if (!quotation) {
      return c.json({ success: false, error: 'Quotation not found' }, 404);
    }

    // Don't allow deleting converted quotations
    if (quotation.status === 'converted') {
      return c.json({ 
        success: false, 
        error: 'Cannot delete converted quotation' 
      }, 400);
    }

    await kv.del(key);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// GET quotations by property
quotations.get('/property/:propertyId', async (c) => {
  try {
    const propertyId = c.req.param('propertyId');
    const orgId = c.req.query('organization_id');
    
    if (!orgId) {
      return c.json({ success: false, error: 'organization_id is required' }, 400);
    }

    const prefix = `quotation:${orgId}:`;
    const allQuotations = await kv.getByPrefix<Quotation>(prefix);

    const propertyQuotations = allQuotations.filter(
      q => q.property_id === propertyId
    );

    // Sort by created_at desc
    propertyQuotations.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return c.json({ success: true, data: propertyQuotations });
  } catch (error) {
    console.error('Error fetching property quotations:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// GET quotations by conversation
quotations.get('/conversation/:conversationId', async (c) => {
  try {
    const conversationId = c.req.param('conversationId');
    const orgId = c.req.query('organization_id');
    
    if (!orgId) {
      return c.json({ success: false, error: 'organization_id is required' }, 400);
    }

    const prefix = `quotation:${orgId}:`;
    const allQuotations = await kv.getByPrefix<Quotation>(prefix);

    const conversationQuotations = allQuotations.filter(
      q => q.conversation_id === conversationId
    );

    // Sort by created_at desc
    conversationQuotations.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return c.json({ success: true, data: conversationQuotations });
  } catch (error) {
    console.error('Error fetching conversation quotations:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

export default quotations;
