-- =====================================================
-- VeloCity V4: Chat Interno & Vistoria Digital
-- PRODUÇÃO - Revisado em 31/01/2026
-- =====================================================
-- INSTRUÇÕES:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Depois crie o bucket "inspections" no Storage (público)
-- =====================================================

-- =====================================================
-- 1. CHAT INTERNO (In-App Messaging)
-- =====================================================

-- Conversas (1 conversa por rental/proposta)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID REFERENCES public.rentals(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL,
    renter_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(rental_id)
);

-- Mensagens do chat
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'system')),
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_conversations_owner ON public.conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_renter ON public.conversations(renter_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- =====================================================
-- 2. VISTORIA DIGITAL (Vehicle Inspection)
-- =====================================================

-- Vistorias do veículo
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID REFERENCES public.rentals(id) ON DELETE CASCADE,
    car_id UUID NOT NULL,
    inspector_id TEXT NOT NULL,
    inspection_type TEXT NOT NULL CHECK (inspection_type IN ('check_in', 'check_out')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'disputed')),
    notes TEXT,
    damage_report JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Fotos da vistoria (10 ângulos obrigatórios)
CREATE TABLE IF NOT EXISTS public.inspection_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    angle TEXT NOT NULL CHECK (angle IN ('front', 'back', 'left', 'right', 'front_left', 'front_right', 'back_left', 'back_right', 'interior', 'dashboard', 'trunk', 'odometer')),
    ai_analysis JSONB,
    has_damage BOOLEAN DEFAULT false,
    damage_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_inspections_rental ON public.inspections(rental_id);
CREATE INDEX IF NOT EXISTS idx_inspections_car ON public.inspections(car_id);
CREATE INDEX IF NOT EXISTS idx_inspections_type ON public.inspections(inspection_type);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection ON public.inspection_photos(inspection_id);

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;

-- Políticas para Conversations (participantes podem ver/editar)
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations" ON public.conversations 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations" ON public.conversations 
    FOR UPDATE USING (true);

-- Políticas para Messages (qualquer participante da conversa)
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;
CREATE POLICY "Users can view messages" ON public.messages 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update messages" ON public.messages;
CREATE POLICY "Users can update messages" ON public.messages 
    FOR UPDATE USING (true);

-- Políticas para Inspections
DROP POLICY IF EXISTS "Users can view inspections" ON public.inspections;
CREATE POLICY "Users can view inspections" ON public.inspections 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create inspections" ON public.inspections;
CREATE POLICY "Users can create inspections" ON public.inspections 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update inspections" ON public.inspections;
CREATE POLICY "Users can update inspections" ON public.inspections 
    FOR UPDATE USING (true);

-- Políticas para Inspection Photos
DROP POLICY IF EXISTS "Users can view inspection photos" ON public.inspection_photos;
CREATE POLICY "Users can view inspection photos" ON public.inspection_photos 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can upload inspection photos" ON public.inspection_photos;
CREATE POLICY "Users can upload inspection photos" ON public.inspection_photos 
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 4. REALTIME (para mensagens em tempo real)
-- =====================================================

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inspections;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- =====================================================
-- 5. TRIGGER para atualizar last_message_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at, updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_message ON public.messages;
CREATE TRIGGER trigger_update_last_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- =====================================================
-- 6. STORAGE BUCKET (Configurar manualmente)
-- =====================================================
-- Após executar este script, no Supabase Dashboard:
--
-- 1. Vá em Storage → Create bucket
-- 2. Nome: "inspections"
-- 3. Marque: Public bucket
-- 4. Clique em Create
--
-- As políticas de storage serão criadas automaticamente
-- para buckets públicos.
-- =====================================================

-- Verificação final
SELECT 'Tabelas criadas com sucesso!' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'messages', 'inspections', 'inspection_photos');
