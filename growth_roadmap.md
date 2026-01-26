# VeloCity Growth Roadmap 🚀
## Plano de Expansão e Novas Funcionalidades

Este documento descreve um plano estratégico para transformar o VeloCity em uma plataforma de aluguel de carros completa, segura e escalável de nível mundial.

### 🌟 Fase 1: Confiança e Segurança (Prioridade Alta)
*Fundamental para garantir que donos confiem seus carros e locatários confiem na plataforma.*

1.  **Verificação de Identidade (KYC)**
    *   **O que é:** Upload de CNH (Carteira de Motorista) e Selfie antes de permitir o primeiro aluguel.
    *   **Por que:** Evita fraudes e roubos de veículos.
    *   **Complexidade:** Média (Integração com API de OCR ou upload simples com validação manual inicial).

2.  **Check-in e Check-out com Fotos**
    *   **O que é:** App exige fotos do carro (4 ângulos) na retirada e na devolução.
    *   **Por que:** Resolve disputas sobre riscos/amassados ("esse risco já estava lá?").
    *   **Complexidade:** Média (Upload de múltiplas imagens no Supabase Storage).

3.  **Avaliações Bilaterais (Reviews 2.0)**
    *   **O que é:** O Dono avalia o Locatário (limpeza, cuidado) e vice-versa.
    *   **Por que:** Cria reputação. Maus locatários são banidos; bons locatários ganham descontos.
    *   **Complexidade:** Baixa (Já temos a tabela, falta a UI completa).

### 💳 Fase 2: Monetização e Pagamentos
*Transformar a plataforma em um negócio real.*

4.  **Integração de Pagamentos (Stripe ou Mercado Pago)**
    *   **O que é:** Cobrança real no cartão de crédito/PIX. Bloqueio de caução (segurança).
    *   **Por que:** Atualmente é apenas simbólico. Sem pagamento, não há negócio.
    *   **Complexidade:** Alta (Webhooks, Segurança, Split de pagamento para o dono).

5.  **Sistema de Seguros**
    *   **O que é:** Opção de adicionar seguro diário (básico, completo) no checkout.
    *   **Por que:** Aumenta o ticket médio e a segurança mental do dono.
    *   **Complexidade:** Média (Lógica de preço extra no aluguel).

### 🗺️ Fase 3: Experiência do Usuário (UX)
*Facilidade de uso para atrair mais clientes.*

6.  **Busca por Mapa (Geolocalização)**
    *   **O que é:** Visualizar carros em um mapa interativo (Google Maps / Mapbox).
    *   **Por que:** "Quero um carro perto de mim".
    *   **Complexidade:** Alta (Requer coordenadas GPS nos carros e integração de Mapas).

7.  **Chat em Tempo Real (Entre Usuários)**
    *   **O que é:** Dono e Locatário conversam diretamente para combinar a entrega das chaves.
    *   **Por que:** Evita sair da plataforma para o WhatsApp (mantém o controle).
    *   **Complexidade:** Média (Usando Supabase Realtime).

8.  **Gestão de Frota para Donos (Maintenance Mode)**
    *   **O que é:** Marcar carro como "Em Manutenção" ou "Uso Pessoal", bloqueando o calendário.
    *   **Por que:** Evita aluguéis em dias que o carro não pode rodar.
    *   **Complexidade:** Baixa.

### 🤖 Fase 4: Inteligência Artificial Avançada (Diferenciação)

9.  **Preço Dinâmico (IA Revenue Management)**
    *   **O que é:** A IA sugere aumentar o preço em feriados ou alta demanda automaticamente.
    *   **Por que:** Maximiza o lucro do locador.
    *   **Complexidade:** Alta.

10. **Reconhecimento de Danos por IA**
    *   **O que é:** A IA analisa as fotos do Check-in vs Check-out e aponta automaticamente novos riscos.
    *   **Por que:** "Uau factor" e resolução imparcial de conflitos.
    *   **Complexidade:** Muito Alta (Visão Computacional).

---

## 🎯 Recomendação de Próximos Passos

Para tornar a plataforma "Perfeita" agora, eu recomendo seguir esta ordem:

1.  **Check-in/Check-out com Fotos** (Essencial para não ter briga na devolução).
2.  **Review System Completo** (Para criar comunidade).
3.  **Mapa/Geolocalização** (Visualmente incrível).
4.  **Pagamentos** (Quando quiser faturar de verdade).

**Qual dessas features você gostaria de começar a implementar?**
