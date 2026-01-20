-- Script para corrigir a migration 004_notifications.sql
-- Execute este SQL no Supabase se a função não existir

-- 1. Primeiro, criar/recriar a função notify_proposal_accepted
CREATE OR REPLACE FUNCTION notify_proposal_accepted()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        -- Notificar o prestador
        PERFORM create_notification(
            NEW.provider_id,
            'proposal_accepted',
            'Proposta Aceita!',
            'Sua proposta foi aceita pelo cliente.',
            '/services/requests/' || NEW.request_id,
            NEW.id,
            'proposal'
        );
        
        -- Notificar o cliente (opcional, já que ele aceitou)
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar/recriar a função notify_new_proposal
CREATE OR REPLACE FUNCTION notify_new_proposal()
RETURNS TRIGGER AS $$
DECLARE
    v_request_title TEXT;
BEGIN
    -- Buscar título do pedido
    SELECT title INTO v_request_title
    FROM service_requests
    WHERE id = NEW.request_id;
    
    -- Notificar o autor do pedido
    PERFORM create_notification(
        (SELECT author_id FROM service_requests WHERE id = NEW.request_id),
        'new_proposal',
        'Nova Proposta Recebida',
        'Você recebeu uma nova proposta para: ' || COALESCE(v_request_title, 'seu pedido'),
        '/services/requests/' || NEW.request_id,
        NEW.id,
        'proposal'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Agora criar os triggers (depois das funções)
DROP TRIGGER IF EXISTS trigger_notify_proposal_accepted ON service_proposals;
CREATE TRIGGER trigger_notify_proposal_accepted
    AFTER UPDATE ON service_proposals
    FOR EACH ROW
    EXECUTE FUNCTION notify_proposal_accepted();

DROP TRIGGER IF EXISTS trigger_notify_new_proposal ON service_proposals;
CREATE TRIGGER trigger_notify_new_proposal
    AFTER INSERT ON service_proposals
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_proposal();
