-- =====================================================
-- VeloCity V5: Sistema de Contratos Automatizado
-- MIGRAÇÃO PARA PRODUÇÃO
-- Data: 31/01/2026
-- =====================================================
-- INSTRUÇÕES:
-- Execute este script no Supabase SQL Editor ANTES
-- de fazer deploy do código atualizado.
-- =====================================================

-- =====================================================
-- 1. CAMPOS ADICIONAIS PARA VEÍCULOS (CARS)
-- =====================================================

-- Placa do veículo (obrigatório para contrato)
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS plate VARCHAR(10);

-- RENAVAM (obrigatório para transferências/multas)
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS renavam VARCHAR(20);

-- Número do Chassi (identificação única)
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS chassis VARCHAR(50);

-- Cor do veículo
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS color VARCHAR(50);

-- Tipo de combustível
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(30) DEFAULT 'Flex';

-- Quilometragem atual
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS odometer INTEGER DEFAULT 0;

-- Comentário descritivo
COMMENT ON COLUMN public.cars.plate IS 'Placa do veículo no formato ABC-1234 ou ABC1D23';
COMMENT ON COLUMN public.cars.renavam IS 'Registro Nacional de Veículos Automotores';
COMMENT ON COLUMN public.cars.chassis IS 'Número do chassi/VIN do veículo';
COMMENT ON COLUMN public.cars.color IS 'Cor predominante do veículo';
COMMENT ON COLUMN public.cars.fuel_type IS 'Tipo de combustível: Gasolina, Etanol, Flex, Diesel, Elétrico, Híbrido';
COMMENT ON COLUMN public.cars.odometer IS 'Quilometragem atual do veículo';

-- =====================================================
-- 2. MELHORIAS NA TABELA DE CONTRATOS ASSINADOS
-- =====================================================

-- Hash SHA-256 do documento para verificação de integridade
ALTER TABLE public.signed_contracts ADD COLUMN IF NOT EXISTS hash_sha256 VARCHAR(64);

-- Geolocalização no momento da assinatura
ALTER TABLE public.signed_contracts ADD COLUMN IF NOT EXISTS geolocation JSONB;

-- Informações do dispositivo usado para assinar
ALTER TABLE public.signed_contracts ADD COLUMN IF NOT EXISTS device_info JSONB;

-- Versão do template de contrato usado
ALTER TABLE public.signed_contracts ADD COLUMN IF NOT EXISTS contract_version VARCHAR(10) DEFAULT '1.0';

-- Data de expiração do contrato (se não assinado)
ALTER TABLE public.signed_contracts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Status do contrato (para controle de lifecycle)
ALTER TABLE public.signed_contracts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Comentários
COMMENT ON COLUMN public.signed_contracts.hash_sha256 IS 'Hash SHA-256 do PDF para verificação de integridade';
COMMENT ON COLUMN public.signed_contracts.geolocation IS 'Coordenadas GPS no momento da assinatura {"lat": -23.55, "lng": -46.63}';
COMMENT ON COLUMN public.signed_contracts.device_info IS 'Informações do dispositivo: browser, OS, screen, etc';
COMMENT ON COLUMN public.signed_contracts.status IS 'Status: pending, active, completed, cancelled, expired';

-- =====================================================
-- 3. TABELA DE TEMPLATES DE CONTRATO
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Proprietário do template
    owner_id TEXT NOT NULL,
    
    -- Identificação
    name VARCHAR(100) NOT NULL DEFAULT 'Contrato Padrão',
    description TEXT,
    
    -- Tipo de template
    template_type VARCHAR(20) DEFAULT 'custom' CHECK (template_type IN ('default', 'custom', 'legal', 'simplified')),
    
    -- URL do arquivo PDF template
    template_url TEXT,
    
    -- Lista de placeholders usados no template
    placeholders JSONB DEFAULT '[]'::jsonb,
    
    -- Configurações
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contract_templates_owner ON public.contract_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_active ON public.contract_templates(owner_id, is_active);
CREATE INDEX IF NOT EXISTS idx_signed_contracts_hash ON public.signed_contracts(hash_sha256);
CREATE INDEX IF NOT EXISTS idx_signed_contracts_status ON public.signed_contracts(status);

-- =====================================================
-- 4. TABELA AUXILIAR: HISTÓRICO DE CONTRATOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contract_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referências
    signed_contract_id UUID REFERENCES public.signed_contracts(id) ON DELETE CASCADE,
    rental_id UUID REFERENCES public.rentals(id) ON DELETE CASCADE,
    
    -- Ação realizada
    action VARCHAR(50) NOT NULL, -- 'generated', 'sent', 'viewed', 'signed', 'downloaded', 'expired'
    
    -- Quem realizou
    performed_by TEXT NOT NULL,
    
    -- Metadados
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_history_contract ON public.contract_history(signed_contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_history_rental ON public.contract_history(rental_id);

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_history ENABLE ROW LEVEL SECURITY;

-- Políticas para Templates
DROP POLICY IF EXISTS "Users can view their templates" ON public.contract_templates;
CREATE POLICY "Users can view their templates" ON public.contract_templates 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create templates" ON public.contract_templates;
CREATE POLICY "Users can create templates" ON public.contract_templates 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update templates" ON public.contract_templates;
CREATE POLICY "Users can update templates" ON public.contract_templates 
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete templates" ON public.contract_templates;
CREATE POLICY "Users can delete templates" ON public.contract_templates 
    FOR DELETE USING (true);

-- Políticas para Histórico
DROP POLICY IF EXISTS "Users can view contract history" ON public.contract_history;
CREATE POLICY "Users can view contract history" ON public.contract_history 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert history" ON public.contract_history;
CREATE POLICY "System can insert history" ON public.contract_history 
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 6. TRIGGER PARA ATUALIZAR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_contract_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contract_template_timestamp ON public.contract_templates;
CREATE TRIGGER trigger_update_contract_template_timestamp
    BEFORE UPDATE ON public.contract_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_template_timestamp();

-- =====================================================
-- 7. FUNÇÃO PARA REGISTRAR HISTÓRICO DE CONTRATO
-- =====================================================

CREATE OR REPLACE FUNCTION log_contract_action(
    p_signed_contract_id UUID,
    p_rental_id UUID,
    p_action VARCHAR(50),
    p_performed_by TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_ip_address VARCHAR(45) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_history_id UUID;
BEGIN
    INSERT INTO public.contract_history (
        signed_contract_id,
        rental_id,
        action,
        performed_by,
        metadata,
        ip_address
    ) VALUES (
        p_signed_contract_id,
        p_rental_id,
        p_action,
        p_performed_by,
        p_metadata,
        p_ip_address
    ) RETURNING id INTO v_history_id;
    
    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. VIEW PARA CONTRATOS COM DADOS COMPLETOS
-- =====================================================

CREATE OR REPLACE VIEW public.v_contracts_full AS
SELECT 
    sc.id,
    sc.rental_id,
    sc.car_id,
    sc.renter_id,
    sc.owner_id,
    sc.signed_pdf_url,
    sc.original_pdf_url,
    sc.signed_at,
    sc.status,
    sc.hash_sha256,
    -- Dados do locatário
    ru.name as renter_name,
    ru.email as renter_email,
    ru.cpf as renter_cpf,
    ru.phone as renter_phone,
    -- Dados do locador
    ou.name as owner_name,
    ou.email as owner_email,
    ou.cpf as owner_cpf,
    ou.phone as owner_phone,
    -- Dados do veículo
    c.make,
    c.model,
    c.year,
    c.plate,
    c.color,
    c.renavam,
    -- Dados da locação
    r.start_date,
    r.end_date,
    r.total_price,
    r.status as rental_status
FROM public.signed_contracts sc
LEFT JOIN public.users ru ON sc.renter_id = ru.id
LEFT JOIN public.users ou ON sc.owner_id = ou.id
LEFT JOIN public.cars c ON sc.car_id = c.id
LEFT JOIN public.rentals r ON sc.rental_id = r.id;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT 'Migração V5 - Sistema de Contratos concluída!' as status;

-- Listar todas as tabelas criadas/modificadas
SELECT 
    'cars' as tabela, 
    COUNT(*) as registros,
    'Campos: plate, renavam, chassis, color, fuel_type, odometer adicionados' as alteracao
FROM public.cars
UNION ALL
SELECT 
    'contract_templates', 
    COUNT(*), 
    'Nova tabela para templates de contrato'
FROM public.contract_templates
UNION ALL
SELECT 
    'contract_history', 
    COUNT(*), 
    'Nova tabela para histórico de ações'
FROM public.contract_history
UNION ALL
SELECT 
    'signed_contracts', 
    COUNT(*), 
    'Campos: hash_sha256, geolocation, device_info, status adicionados'
FROM public.signed_contracts;
