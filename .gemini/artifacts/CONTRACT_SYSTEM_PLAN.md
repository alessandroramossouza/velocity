# 📜 PLANO ULTRA MEGA COMPLETO: SISTEMA DE CONTRATOS VELOCITY

## 🎯 Visão Geral

**Objetivo:** Criar um sistema de contratos robusto e automatizado onde o locador envia o contrato já preenchido com todos os dados necessários (ambas as partes, veículo e locação), e o locatário apenas assina digitalmente.

**Data:** 31/01/2026  
**Versão:** 1.0  
**Status:** PLANO DE IMPLEMENTAÇÃO

---

## 📋 DIAGNÓSTICO DO SISTEMA ATUAL

### ✅ O que já existe:
| Funcionalidade | Status | Arquivo |
|----------------|--------|---------|
| Upload de template PDF pelo locador | ✅ Implementado | `contractService.ts` |
| Geração de contrato padrão | ✅ Implementado | `generateDefaultContract()` |
| Inserção de capa com dados | ✅ Implementado | `generateFilledContract()` |
| Modal de assinatura digital | ✅ Implementado | `ContractSignatureModal.tsx` |
| Salvamento de contrato assinado | ✅ Implementado | `saveSignedContract()` |
| Tabela `signed_contracts` | ✅ Existe no Supabase |

### ❌ O que está faltando / Problemas:
| Problema | Impacto | Prioridade |
|----------|---------|------------|
| Locador precisa clicar para "enviar contrato" manualmente | Atrito no fluxo | 🔴 Alta |
| Contrato não mostra dados completos do locador no template | Falta informação | 🔴 Alta |
| Sem opção de usar templates com placeholders dinâmicos | Flexibilidade limitada | 🟡 Média |
| Locador não consegue ver prévia do contrato preenchido | Confiança | 🟡 Média |
| Falta dados do veículo (placa, RENAVAM, chassi) | Incompletude | 🔴 Alta |
| Sem histórico de versões de contrato | Rastreabilidade | 🟢 Baixa |
| Sem lembretes automáticos para assinatura | Conversão | 🟡 Média |

---

## 🏗️ ARQUITETURA PROPOSTA

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUXO DO CONTRATO V2                        │
└─────────────────────────────────────────────────────────────────┘

       LOCADOR                           LOCATÁRIO
          │                                   │
          ▼                                   │
    ┌───────────┐                             │
    │ Cadastra  │                             │
    │  Veículo  │                             │
    │ + Template│                             │
    └─────┬─────┘                             │
          │                                   │
          ▼                                   ▼
    ┌───────────┐                      ┌───────────┐
    │ Recebe    │                      │ Envia     │
    │ Proposta  │◄─────────────────────│ Proposta  │
    └─────┬─────┘                      └───────────┘
          │
          │ ✅ APROVA
          ▼
    ┌─────────────────────────────────────────────┐
    │     🔄 GERAÇÃO AUTOMÁTICA DO CONTRATO       │
    │  ┌────────────────────────────────────────┐ │
    │  │ 📄 Template do Locador (ou Padrão)    │ │
    │  │ + Dados do Locador (users table)      │ │
    │  │ + Dados do Locatário (users table)    │ │
    │  │ + Dados do Veículo (cars table)       │ │
    │  │ + Dados da Locação (rentals table)    │ │
    │  └────────────────────────────────────────┘ │
    └─────────────────┬───────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │   PDF Gerado  │
              │  Automaticamente │
              └───────┬───────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
    ┌───────────┐           ┌───────────┐
    │  Locador  │           │ Locatário │
    │  Visualiza│           │  Recebe   │
    │  Prévia   │           │Notificação│
    └───────────┘           └─────┬─────┘
                                  │
                                  ▼
                          ┌───────────────┐
                          │ 📱 Assina     │
                          │ Digitalmente  │
                          └───────┬───────┘
                                  │
                                  ▼
                      ┌───────────────────────┐
                      │ 🔐 Contrato Assinado  │
                      │ + IP, Timestamp, Hash │
                      │ Armazenado no Supabase│
                      └───────────────────────┘
```

---

## 📊 MODELO DE DADOS APRIMORADO

### Tabela: `cars` (Adicionar campos)
```sql
-- Novos campos para o veículo
ALTER TABLE cars ADD COLUMN IF NOT EXISTS plate VARCHAR(10);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS renavam VARCHAR(20);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS chassis VARCHAR(50);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS color VARCHAR(50);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(30);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS odometer INTEGER;
```

### Tabela: `users` (Verificar campos existentes)
```sql
-- Campos necessários para o contrato (já devem existir)
-- id, name, email, cpf, rg, address, number, neighborhood, city, state, cep, phone
```

### Tabela: `contract_templates` (NOVA)
```sql
CREATE TABLE IF NOT EXISTS public.contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    template_type VARCHAR(20) DEFAULT 'custom', -- 'default', 'custom', 'legal'
    template_url TEXT,                           -- URL do PDF template
    placeholders JSONB DEFAULT '[]'::jsonb,      -- Lista de placeholders usados
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: `signed_contracts` (Aprimorar)
```sql
-- Adicionar campos para validade jurídica
ALTER TABLE signed_contracts ADD COLUMN IF NOT EXISTS hash_sha256 VARCHAR(64);
ALTER TABLE signed_contracts ADD COLUMN IF NOT EXISTS geolocation JSONB;
ALTER TABLE signed_contracts ADD COLUMN IF NOT EXISTS device_info JSONB;
ALTER TABLE signed_contracts ADD COLUMN IF NOT EXISTS contract_version VARCHAR(10) DEFAULT '1.0';
```

---

## 🔧 FUNCIONALIDADES A IMPLEMENTAR

### FASE 1: Automatização do Fluxo (Prioridade Alta)

#### 1.1 Auto-Envio do Contrato na Aprovação ✨
```typescript
// Quando locador aprova proposta:
// 1. Gera contrato automaticamente
// 2. Envia notificação ao locatário
// 3. Atualiza status para "contract_pending_signature"
```

**Arquivo:** `OwnerDashboard.tsx` → função `handleApproveProposal`

#### 1.2 Pré-Visualização do Contrato pelo Locador
- Botão "Visualizar Contrato" antes de aprovar
- Modal com PDF preenchido para conferência
- Opção de fazer ajustes

**Novo componente:** `ContractPreviewModal.tsx`

#### 1.3 Dados Completos do Veículo no Formulário
```
┌─────────────────────────────────────────────────────┐
│ 📝 CADASTRO DO VEÍCULO - DADOS ADICIONAIS          │
├─────────────────────────────────────────────────────┤
│ Placa: [ABC-1234]        RENAVAM: [123456789]      │
│ Chassi: [9BWZZZ377VT...]  Cor: [Preto]             │
│ Combustível: [Flex]       Hodômetro: [45.000 km]   │
└─────────────────────────────────────────────────────┘
```

**Arquivo:** `OwnerDashboard.tsx` → formulário de cadastro

---

### FASE 2: Templates Inteligentes (Prioridade Média)

#### 2.1 Sistema de Placeholders Dinâmicos
Suporte a marcadores que serão substituídos automaticamente:

| Placeholder | Descrição |
|-------------|-----------|
| `{{LOCADOR_NOME}}` | Nome completo do locador |
| `{{LOCADOR_CPF}}` | CPF do locador |
| `{{LOCADOR_RG}}` | RG do locador |
| `{{LOCADOR_ENDERECO}}` | Endereço completo do locador |
| `{{LOCATARIO_NOME}}` | Nome completo do locatário |
| `{{LOCATARIO_CPF}}` | CPF do locatário |
| `{{LOCATARIO_RG}}` | RG do locatário |
| `{{LOCATARIO_ENDERECO}}` | Endereço completo do locatário |
| `{{LOCATARIO_CNH}}` | Número da CNH |
| `{{VEICULO_MODELO}}` | Marca/Modelo do veículo |
| `{{VEICULO_ANO}}` | Ano do veículo |
| `{{VEICULO_PLACA}}` | Placa do veículo |
| `{{VEICULO_RENAVAM}}` | RENAVAM |
| `{{VEICULO_CHASSI}}` | Número do chassi |
| `{{VEICULO_COR}}` | Cor do veículo |
| `{{DATA_INICIO}}` | Data de início da locação |
| `{{DATA_FIM}}` | Data de término |
| `{{VALOR_DIARIA}}` | Valor da diária |
| `{{VALOR_TOTAL}}` | Valor total do contrato |
| `{{VALOR_CAUCAO}}` | Valor da caução |
| `{{DATA_ATUAL}}` | Data de geração do contrato |

#### 2.2 Editor Visual de Template
- Upload de PDF Word/PDF
- Preview em tempo real
- Validação de placeholders

---

### FASE 3: Experiência do Locatário (Prioridade Média)

#### 3.1 Página de Assinatura Mobile-First
```
┌─────────────────────────────────────────┐
│ 📜 CONTRATO DE LOCAÇÃO                  │
│ Toyota Corolla 2023 • ABC-1234          │
├─────────────────────────────────────────┤
│                                         │
│ [📄 VISUALIZAR CONTRATO COMPLETO]       │
│                                         │
│ ─────────────────────────               │
│ ℹ️ Resumo:                              │
│ • Locador: João Silva                   │
│ • Período: 01/02 a 28/02/2026          │
│ • Valor: R$ 3.500,00                    │
│ • Caução: R$ 1.000,00                   │
│ ─────────────────────────               │
│                                         │
│ ☑️ Li e concordo com os termos          │
│                                         │
│ [   Desenhe sua assinatura aqui    ]    │
│ └──────────────────────────────────┘    │
│                                         │
│ [    ✍️ ASSINAR CONTRATO    ]           │
└─────────────────────────────────────────┘
```

#### 3.2 Notificações de Lembrete
- Email após 24h sem assinatura
- Push notification após 48h
- SMS após 72h (opcional)

---

### FASE 4: Segurança e Validade Jurídica (Prioridade Baixa)

#### 4.1 Hash SHA-256 do Documento
- Gerar hash do PDF original
- Armazenar para verificação posterior
- Detectar adulterações

#### 4.2 Carimbo de Tempo
- Timestamp do servidor
- Opcional: Integração com autoridade de tempo

#### 4.3 Registro de Dispositivo
```json
{
  "ip": "187.123.45.67",
  "userAgent": "Mozilla/5.0...",
  "platform": "Android",
  "geolocation": { "lat": -23.55, "lng": -46.63 },
  "timestamp": "2026-01-31T15:30:00Z"
}
```

---

## 📁 ESTRUTURA DE ARQUIVOS

```
src/
├── components/
│   ├── contract/
│   │   ├── ContractPreviewModal.tsx      🆕 Prévia do contrato
│   │   ├── ContractSignatureModal.tsx    ✅ Já existe
│   │   ├── ContractViewer.tsx            ✅ Já existe
│   │   ├── ContractTemplate.ts           ✅ Já existe
│   │   ├── TemplateEditor.tsx            🆕 Editor de templates
│   │   └── PlaceholderGuide.tsx          🆕 Guia de placeholders
│   │
│   ├── OwnerDashboard.tsx                📝 Modificar
│   └── RenterHistory.tsx                 📝 Modificar
│
├── services/
│   └── contractService.ts                📝 Expandir
│
└── types.ts                              📝 Adicionar tipos
```

---

## 🚀 PLANO DE IMPLEMENTAÇÃO

### Sprint 1: Automatização Básica (3-5 dias) ✅ CONCLUÍDO!
| Task | Descrição | Status |
|------|-----------|--------|
| 1.1 | Adicionar campos do veículo (placa, RENAVAM, etc.) | ✅ FEITO |
| 1.2 | Atualizar formulário do carro no OwnerDashboard | ✅ FEITO |
| 1.3 | Modificar `generateFilledContract` para incluir novos dados | ✅ FEITO |
| 1.4 | Auto-gerar contrato ao aprovar proposta | ✅ FEITO |
| 1.5 | Criar SQL de migração para novos campos | ✅ FEITO |

### Sprint 2: Preview e Templates (3-5 dias)
| Task | Descrição | Prioridade |
|------|-----------|------------|
| 2.1 | Criar `ContractPreviewModal.tsx` | 🟡 Média |
| 2.2 | Sistema de placeholders no PDF | 🟡 Média |
| 2.3 | Botão "Visualizar Contrato" para locador | 🟡 Média |
| 2.4 | Documentação de placeholders para locador | 🟡 Média |

### Sprint 3: Experiência e Polimento (2-3 dias)
| Task | Descrição | Prioridade |
|------|-----------|------------|
| 3.1 | Melhorar UI da assinatura mobile | 🟡 Média |
| 3.2 | Notificações de lembrete | 🟢 Baixa |
| 3.3 | Hash SHA-256 para validade | 🟢 Baixa |

---

## 📝 SQL DE MIGRAÇÃO

```sql
-- =====================================================
-- V5: CONTRATO AUTOMATIZADO - MIGRAÇÃO
-- =====================================================

-- 1. Campos adicionais para veículos
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS plate VARCHAR(10);
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS renavam VARCHAR(20);
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS chassis VARCHAR(50);
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS color VARCHAR(50);
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(30) DEFAULT 'Flex';
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS odometer INTEGER DEFAULT 0;

-- 2. Melhorias na tabela de contratos assinados
ALTER TABLE public.signed_contracts ADD COLUMN IF NOT EXISTS hash_sha256 VARCHAR(64);
ALTER TABLE public.signed_contracts ADD COLUMN IF NOT EXISTS geolocation JSONB;
ALTER TABLE public.signed_contracts ADD COLUMN IF NOT EXISTS device_info JSONB;
ALTER TABLE public.signed_contracts ADD COLUMN IF NOT EXISTS contract_version VARCHAR(10) DEFAULT '1.0';

-- 3. Tabela de templates de contrato (opcional)
CREATE TABLE IF NOT EXISTS public.contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT NOT NULL,
    name VARCHAR(100) NOT NULL DEFAULT 'Contrato Padrão',
    template_type VARCHAR(20) DEFAULT 'custom',
    template_url TEXT,
    placeholders JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contract_templates_owner ON public.contract_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_signed_contracts_hash ON public.signed_contracts(hash_sha256);

-- RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open Contract Templates" ON public.contract_templates;
CREATE POLICY "Open Contract Templates" ON public.contract_templates FOR ALL USING (true) WITH CHECK (true);

SELECT 'Migração V5 concluída com sucesso!' as status;
```

---

## 🎯 RESULTADO ESPERADO

### Antes:
1. Locador recebe proposta
2. Locador aprova proposta
3. Locador clica em "Enviar Contrato" ❌ (passo manual)
4. Sistema gera contrato
5. Locatário assina

### Depois:
1. Locador recebe proposta
2. Locador pode visualizar prévia do contrato ✨ (novo)
3. Locador aprova proposta
4. **Sistema gera e envia contrato automaticamente** ✅
5. Locatário recebe notificação
6. Locatário assina

### Benefícios:
- ⏱️ **Menos atrito** - 1 passo a menos
- 📋 **Dados completos** - Placa, RENAVAM, Chassi inclusos
- 👁️ **Transparência** - Locador vê prévia
- 🔐 **Validade jurídica** - Hash, IP, timestamp
- 📱 **Mobile-first** - Assinatura otimizada

---

## ❓ DECISÕES PENDENTES

1. **Template padrão obrigatório?**
   - [ ] Sim, sempre gerar padrão se não houver custom
   - [ ] Não, exigir upload do locador

2. **Validade do contrato sem assinatura?**
   - [ ] 7 dias
   - [ ] 15 dias
   - [ ] 30 dias

3. **Integração com certificado digital ICP-Brasil?**
   - [ ] Sim, fase futura
   - [ ] Não, assinatura simples é suficiente

---

## 👉 PRÓXIMOS PASSOS IMEDIATOS

1. **Aprovar este plano** ✋
2. Executar SQL de migração no Supabase
3. Implementar Sprint 1 (campos + auto-geração)
4. Testar fluxo completo
5. Deploy em produção

---

**Criado por:** VeloCity Development Team  
**Revisado em:** 31/01/2026
