-- ============================================================
-- VELOCITY - FASE 1: Novas Tabelas para Crescimento
-- ============================================================
-- Este script cria as tabelas necessárias para as 5 funcionalidades da Fase 1
-- SEM ALTERAR nenhuma tabela ou funcionalidade existente
-- ============================================================

-- ============================================================
-- 1. SISTEMA DE COMISSÕES AUTOMATIZADO
-- ============================================================

-- Tabela para registrar ganhos da plataforma por aluguel
CREATE TABLE IF NOT EXISTS platform_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL,
    gross_amount NUMERIC(10, 2) NOT NULL,
    commission_percentage NUMERIC(5, 2) DEFAULT 15.00,
    commission_amount NUMERIC(10, 2) NOT NULL,
    net_to_owner NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid')),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_platform_earnings_rental ON platform_earnings(rental_id);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_status ON platform_earnings(status);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_created ON platform_earnings(created_at DESC);

-- ============================================================
-- 2. PROGRAMA DE INDICAÇÃO (REFERRAL)
-- ============================================================

-- Tabela para gerenciar indicações entre usuários
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id TEXT NOT NULL,
    referred_id TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
    reward_amount NUMERIC(10, 2) DEFAULT 50.00,
    reward_paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- ============================================================
-- 3. CHECK-IN/CHECK-OUT COM VISTORIA FOTOGRÁFICA
-- ============================================================

-- Tabela para registrar vistorias de veículos
CREATE TABLE IF NOT EXISTS vehicle_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL,
    inspection_type TEXT NOT NULL CHECK (inspection_type IN ('check_in', 'check_out')),
    photos JSONB DEFAULT '[]'::jsonb,
    odometer_reading INTEGER,
    fuel_level INTEGER CHECK (fuel_level >= 0 AND fuel_level <= 100),
    damages JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    signature_url TEXT,
    inspector_id TEXT NOT NULL,
    inspector_name TEXT,
    location TEXT,
    weather_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_rental ON vehicle_inspections(rental_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_type ON vehicle_inspections(inspection_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_created ON vehicle_inspections(created_at DESC);

-- ============================================================
-- 4. ESTATÍSTICAS FINANCEIRAS (para Dashboard Avançado)
-- ============================================================

-- Tabela para armazenar métricas consolidadas por locador
CREATE TABLE IF NOT EXISTS owner_financial_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_revenue NUMERIC(10, 2) DEFAULT 0,
    total_rentals INTEGER DEFAULT 0,
    average_daily_rate NUMERIC(10, 2) DEFAULT 0,
    occupancy_rate NUMERIC(5, 2) DEFAULT 0,
    conversion_rate NUMERIC(5, 2) DEFAULT 0,
    top_performing_car_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_owner_stats_owner ON owner_financial_stats(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_stats_period ON owner_financial_stats(period_start, period_end);

-- ============================================================
-- 5. AUDITORIA E LOGS (para compliance e rastreabilidade)
-- ============================================================

-- Tabela para registrar eventos importantes do sistema
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    user_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON system_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON system_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON system_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON system_audit_logs(created_at DESC);

-- ============================================================
-- VIEWS ÚTEIS PARA REPORTING
-- ============================================================

-- View: Receita da plataforma por período
CREATE OR REPLACE VIEW v_platform_revenue AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as total_transactions,
    SUM(gross_amount) as total_gross,
    SUM(commission_amount) as total_commission,
    SUM(net_to_owner) as total_net_to_owners,
    AVG(commission_percentage) as avg_commission_rate
FROM platform_earnings
WHERE status != 'pending'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- View: Top locadores por receita
CREATE OR REPLACE VIEW v_top_owners_revenue AS
SELECT 
    pe.rental_id,
    u.name as owner_name,
    u.email as owner_email,
    COUNT(*) as total_rentals,
    SUM(pe.net_to_owner) as total_earned,
    AVG(pe.net_to_owner) as avg_per_rental
FROM platform_earnings pe
LEFT JOIN users u ON u.id = (
    SELECT owner_id FROM rentals WHERE id::text = pe.rental_id::text LIMIT 1
)
WHERE pe.status = 'paid'
GROUP BY pe.rental_id, u.name, u.email
ORDER BY total_earned DESC
LIMIT 50;

-- View: Indicações bem-sucedidas
CREATE OR REPLACE VIEW v_successful_referrals AS
SELECT 
    r.referral_code,
    u1.name as referrer_name,
    u1.email as referrer_email,
    u2.name as referred_name,
    u2.email as referred_email,
    r.reward_amount,
    r.status,
    r.completed_at,
    r.reward_paid_at
FROM referrals r
LEFT JOIN users u1 ON u1.id = r.referrer_id
LEFT JOIN users u2 ON u2.id = r.referred_id
WHERE r.status IN ('completed', 'rewarded')
ORDER BY r.completed_at DESC;

-- ============================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================

COMMENT ON TABLE platform_earnings IS 'Registra comissões da plataforma por cada aluguel (15% padrão)';
COMMENT ON TABLE referrals IS 'Sistema de indicação: R$50 para quem indica + R$50 para indicado';
COMMENT ON TABLE vehicle_inspections IS 'Vistorias com fotos no check-in e check-out para evitar disputas';
COMMENT ON TABLE owner_financial_stats IS 'Métricas consolidadas para dashboard financeiro avançado';
COMMENT ON TABLE system_audit_logs IS 'Log de auditoria para compliance e rastreabilidade';

-- ============================================================
-- FUNÇÕES ÚTEIS
-- ============================================================

-- Função para calcular comissão automaticamente
CREATE OR REPLACE FUNCTION calculate_commission(
    p_gross_amount NUMERIC,
    p_commission_rate NUMERIC DEFAULT 15.00
)
RETURNS TABLE (
    commission_amount NUMERIC,
    net_to_owner NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(p_gross_amount * (p_commission_rate / 100), 2) as commission_amount,
        ROUND(p_gross_amount - (p_gross_amount * (p_commission_rate / 100)), 2) as net_to_owner;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para gerar código de indicação único
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Gera código: VELOCITY-{6 primeiros chars do user_id em uppercase}
        v_code := 'VELOCITY-' || UPPER(SUBSTRING(p_user_id, 1, 6));
        
        -- Verifica se já existe
        SELECT EXISTS(SELECT 1 FROM referrals WHERE referral_code = v_code) INTO v_exists;
        
        -- Se não existe, retorna
        IF NOT v_exists THEN
            RETURN v_code;
        END IF;
        
        -- Se existe, adiciona sufixo aleatório
        v_code := v_code || '-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
        
        SELECT EXISTS(SELECT 1 FROM referrals WHERE referral_code = v_code) INTO v_exists;
        
        IF NOT v_exists THEN
            RETURN v_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS PARA AUTOMAÇÃO
-- ============================================================

-- Trigger para criar comissão automaticamente quando rental é criado
CREATE OR REPLACE FUNCTION create_platform_earning()
RETURNS TRIGGER AS $$
DECLARE
    v_commission RECORD;
BEGIN
    -- Só cria se o rental foi aprovado/ativo
    IF NEW.status IN ('active', 'completed') AND NEW.payment_status = 'approved' THEN
        -- Calcula comissão
        SELECT * INTO v_commission FROM calculate_commission(NEW.total_price);
        
        -- Insere registro de comissão
        INSERT INTO platform_earnings (
            rental_id,
            gross_amount,
            commission_amount,
            net_to_owner,
            status
        ) VALUES (
            NEW.id::uuid,
            NEW.total_price,
            v_commission.commission_amount,
            v_commission.net_to_owner,
            'pending'
        )
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Não vamos criar o trigger automaticamente para não interferir com rentals existentes
-- O usuário pode ativar manualmente se desejar:
-- CREATE TRIGGER trigger_create_platform_earning
-- AFTER INSERT OR UPDATE ON rentals
-- FOR EACH ROW
-- EXECUTE FUNCTION create_platform_earning();

-- ============================================================
-- DADOS INICIAIS (SEED)
-- ============================================================

-- Criar código de indicação para todos os usuários existentes
INSERT INTO referrals (referrer_id, referral_code, status)
SELECT 
    id,
    generate_referral_code(id),
    'pending'
FROM users
ON CONFLICT (referral_code) DO NOTHING;

-- ============================================================
-- SUCESSO!
-- ============================================================

SELECT 
    'FASE 1 - Tabelas criadas com sucesso!' as status,
    'platform_earnings, referrals, vehicle_inspections, owner_financial_stats, system_audit_logs' as tables_created,
    'Views, funções e triggers disponíveis para ativação' as extras;
