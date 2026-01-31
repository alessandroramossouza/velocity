// ============================================================
// VELOCITY - FASE 1: Serviço de Indicações (Referral)
// ============================================================
// Sistema de indicação: R$50 para quem indica + R$50 para indicado
// ============================================================

import { supabase } from '../lib/supabase';
import { Referral, ReferralStats } from '../types-fase1';

const REFERRER_REWARD = 50; // R$50 para quem indica
const REFERRED_REWARD = 50; // R$50 para quem foi indicado

// ============================================================
// GERAÇÃO DE CÓDIGO
// ============================================================

/**
 * Gera código de indicação único para um usuário
 */
export const generateReferralCode = (userId: string): string => {
  const prefix = 'VELOCITY';
  const userPart = userId.substring(0, 6).toUpperCase();
  return `${prefix}-${userPart}`;
};

/**
 * Cria ou obtém código de indicação de um usuário
 */
export const getOrCreateReferralCode = async (userId: string): Promise<string> => {
  // Verificar se já existe
  const { data: existing } = await supabase
    .from('referrals')
    .select('referral_code')
    .eq('referrer_id', userId)
    .maybeSingle();

  if (existing) {
    return existing.referral_code;
  }

  // Criar novo código
  const code = generateReferralCode(userId);

  const { data, error } = await supabase
    .from('referrals')
    .insert([{
      referrer_id: userId,
      referral_code: code,
      status: 'pending',
      reward_amount: REFERRER_REWARD
    }])
    .select('referral_code')
    .single();

  if (error) {
    console.error('Error creating referral code:', error);
    // Fallback: gerar código com sufixo aleatório
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${code}-${randomSuffix}`;
  }

  return data?.referral_code || code;
};

// ============================================================
// VALIDAÇÃO E APLICAÇÃO DE CÓDIGO
// ============================================================

/**
 * Valida se um código de indicação existe e está ativo
 */
export const validateReferralCode = async (code: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('referrals')
    .select('id, status')
    .eq('referral_code', code)
    .is('referred_id', null) // Ainda não foi usado
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return data.status === 'pending';
};

/**
 * Aplica código de indicação a um novo usuário
 */
export const applyReferralCode = async (
  code: string,
  newUserId: string,
  newUserEmail: string
): Promise<boolean> => {
  // Validar código
  const isValid = await validateReferralCode(code);
  if (!isValid) {
    return false;
  }

  // Atualizar registro de indicação
  const { data, error } = await supabase
    .from('referrals')
    .update({
      referred_id: newUserId,
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('referral_code', code)
    .is('referred_id', null)
    .select()
    .maybeSingle();

  if (error || !data) {
    console.error('Error applying referral code:', error);
    return false;
  }

  // Criar notificações
  await Promise.all([
    // Notificar quem indicou
    createReferralNotification(
      data.referrer_id,
      'referral_completed',
      'Nova Indicação Confirmada!',
      `Você ganhou R$${REFERRER_REWARD}! Seu indicado ${newUserEmail} completou o cadastro.`
    ),
    // Notificar indicado
    createReferralNotification(
      newUserId,
      'referral_reward',
      'Bônus de Boas-Vindas!',
      `Você ganhou R$${REFERRED_REWARD} de crédito por usar o código ${code}!`
    )
  ]);

  return true;
};

// ============================================================
// RECOMPENSAS
// ============================================================

/**
 * Marca uma indicação como recompensada (após 1º aluguel do indicado)
 */
export const rewardReferral = async (referralId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('referrals')
    .update({
      status: 'rewarded',
      reward_paid_at: new Date().toISOString()
    })
    .eq('id', referralId)
    .eq('status', 'completed');

  if (error) {
    console.error('Error rewarding referral:', error);
    return false;
  }

  return true;
};

/**
 * Processa recompensas pendentes (usuários que completaram 1º aluguel)
 */
export const processReferralRewards = async (): Promise<number> => {
  // Buscar indicações completadas mas não recompensadas
  const { data: referrals, error: fetchError } = await supabase
    .from('referrals')
    .select('*, referred_id')
    .eq('status', 'completed')
    .not('referred_id', 'is', null);

  if (fetchError || !referrals) {
    console.error('Error fetching referrals:', fetchError);
    return 0;
  }

  let rewardsProcessed = 0;

  for (const referral of referrals) {
    // Verificar se o indicado completou ao menos 1 aluguel
    const { data: rentals } = await supabase
      .from('rentals')
      .select('id')
      .eq('renter_id', referral.referred_id)
      .eq('status', 'completed')
      .limit(1);

    if (rentals && rentals.length > 0) {
      // Marcar como recompensado
      const success = await rewardReferral(referral.id);
      if (success) {
        rewardsProcessed++;
        
        // Notificar o referrer
        await createReferralNotification(
          referral.referrer_id,
          'referral_reward',
          'Recompensa Liberada!',
          `Parabéns! Seu indicado completou o 1º aluguel. R$${REFERRER_REWARD} creditados!`
        );
      }
    }
  }

  return rewardsProcessed;
};

// ============================================================
// ESTATÍSTICAS
// ============================================================

/**
 * Obtém estatísticas de indicações de um usuário
 */
export const getUserReferralStats = async (userId: string): Promise<ReferralStats> => {
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', userId);

  if (error) {
    console.error('Error fetching referral stats:', error);
    return {
      totalReferrals: 0,
      completedReferrals: 0,
      pendingReferrals: 0,
      totalRewardsEarned: 0,
      totalRewardsPaid: 0,
      referralCode: await getOrCreateReferralCode(userId)
    };
  }

  const refs = referrals || [];

  const completed = refs.filter(r => r.status === 'completed' || r.status === 'rewarded');
  const rewarded = refs.filter(r => r.status === 'rewarded');
  const pending = refs.filter(r => r.status === 'pending');

  return {
    totalReferrals: refs.length,
    completedReferrals: completed.length,
    pendingReferrals: pending.length,
    totalRewardsEarned: completed.length * REFERRER_REWARD,
    totalRewardsPaid: rewarded.length * REFERRER_REWARD,
    referralCode: refs[0]?.referral_code || await getOrCreateReferralCode(userId)
  };
};

/**
 * Obtém top indicadores da plataforma
 */
export const getTopReferrers = async (limit: number = 10) => {
  const { data, error } = await supabase
    .from('referrals')
    .select('referrer_id, referral_code')
    .in('status', ['completed', 'rewarded']);

  if (error || !data) {
    return [];
  }

  // Agrupar por referrer_id
  const grouped = data.reduce((acc: any, ref) => {
    if (!acc[ref.referrer_id]) {
      acc[ref.referrer_id] = {
        referrerId: ref.referrer_id,
        code: ref.referral_code,
        count: 0
      };
    }
    acc[ref.referrer_id].count++;
    return acc;
  }, {});

  const sorted = Object.values(grouped).sort((a: any, b: any) => b.count - a.count);

  // Buscar nomes dos usuários
  const topReferrers = sorted.slice(0, limit);
  const userIds = topReferrers.map((r: any) => r.referrerId);

  const { data: users } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', userIds);

  return topReferrers.map((ref: any) => {
    const user = users?.find(u => u.id === ref.referrerId);
    return {
      ...ref,
      name: user?.name || 'Usuário',
      email: user?.email || '',
      totalRewards: ref.count * REFERRER_REWARD
    };
  });
};

// ============================================================
// NOTIFICAÇÕES
// ============================================================

/**
 * Cria notificação de indicação
 */
const createReferralNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string
): Promise<void> => {
  try {
    await supabase.from('notifications').insert([{
      user_id: userId,
      type: type as any,
      title,
      message,
      is_read: false,
      created_at: new Date().toISOString()
    }]);
  } catch (error) {
    console.error('Error creating referral notification:', error);
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Mapeia dados do Supabase para o tipo Referral
 */
const mapReferral = (data: any): Referral => ({
  id: data.id,
  referrerId: data.referrer_id,
  referredId: data.referred_id,
  referralCode: data.referral_code,
  status: data.status,
  rewardAmount: Number(data.reward_amount || REFERRER_REWARD),
  rewardPaidAt: data.reward_paid_at,
  createdAt: data.created_at,
  completedAt: data.completed_at
});

/**
 * Gera link de compartilhamento
 */
export const generateReferralLink = (code: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}?ref=${code}`;
};

/**
 * Gera mensagem para compartilhamento
 */
export const generateReferralMessage = (code: string, userName: string): string => {
  return `Olá! 🚗 ${userName} está te convidando para o VeloCity - a melhor plataforma de aluguel de carros!\n\nCadastre-se com o código ${code} e ganhe R$50 de crédito!\n\n${generateReferralLink(code)}`;
};
