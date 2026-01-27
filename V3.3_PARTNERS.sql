
-- Tabela de Parceiros (Partners)
CREATE TABLE IF NOT EXISTS partners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('mechanic', 'insurance')) NOT NULL,
  description TEXT,
  contact_info TEXT,
  rating NUMERIC,
  image_url TEXT,
  benefits JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ver parceiros (Locadores precisam ver)
CREATE POLICY "Public Read Access" ON partners FOR SELECT USING (true);

-- Política: Apenas admins podem inserir (simulado, aqui deixamos aberto para seeds)
CREATE POLICY "Public Insert Access" ON partners FOR INSERT WITH CHECK (true);

-- Insert Mock Data (Elite Partners)

-- Mecânicas
INSERT INTO partners (name, type, description, contact_info, rating, image_url, benefits)
VALUES 
(
  'AutoMaster Prime', 
  'mechanic', 
  'Especializada em carros de luxo e esportivos. Atendimento 24h para parceiros VeloCity.', 
  '(11) 99999-1001', 
  4.9, 
  'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80',
  '["Desconto de 20% em mão de obra", "Prioridade na fila", "Diagnóstico gratuito"]'
),
(
  'Oficina Rápida Express', 
  'mechanic', 
  'Manutenção preventiva e corretiva com agilidade. Ideal para rotatividade alta.', 
  '(11) 98888-2002', 
  4.7, 
  'https://images.unsplash.com/photo-1487754180477-db33d3d62326?auto=format&fit=crop&w=600&q=80',
  '["Troca de óleo em 30min", "Desconto em peças"]'
);

-- Seguradoras
INSERT INTO partners (name, type, description, contact_info, rating, image_url, benefits)
VALUES 
(
  'SafeDrive Seguros', 
  'insurance', 
  'Seguro completo para frotas de aluguel. Cobertura contra terceiros e sinistros.', 
  'contato@safedrive.com', 
  4.8, 
  'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=600&q=80',
  '["Cobertura total", "Carro reserva imediato", "Sem franquia para vidros"]'
),
(
  'Velocity Protect', 
  'insurance', 
  'Parceiro oficial. Seguros micro-período (pay-per-use) integrados à plataforma.', 
  'suporte@velocity.com', 
  5.0, 
  'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&w=600&q=80',
  '["Pagamento por dia alugado", "Rastreamento incluso", "Assistência 24h"]'
);
