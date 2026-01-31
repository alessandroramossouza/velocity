// ============================================================
// VELOCITY - FASE 1: Programa de Indicação
// ============================================================
// Sistema de indicação: R$50 para quem indica + R$50 para indicado
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Gift, Share2, Copy, Check, Users, DollarSign, TrendingUp,
  Facebook, Twitter, Mail, MessageCircle, Link as LinkIcon,
  Award, Star, Zap
} from 'lucide-react';
import { ReferralStats } from '../types-fase1';
import {
  getUserReferralStats,
  generateReferralLink,
  generateReferralMessage,
  getTopReferrers
} from '../services/referralService';
import { User } from '../types';

interface ReferralProgramProps {
  user: User;
}

export const ReferralProgram: React.FC<ReferralProgramProps> = ({ user }) => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [topReferrers, setTopReferrers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const referralStats = await getUserReferralStats(user.id);
      setStats(referralStats);

      const top = await getTopReferrers(5);
      setTopReferrers(top);
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!stats) return;
    navigator.clipboard.writeText(stats.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!stats) return;
    const link = generateReferralLink(stats.referralCode);
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: 'whatsapp' | 'facebook' | 'twitter' | 'email') => {
    if (!stats) return;

    const link = generateReferralLink(stats.referralCode);
    const message = generateReferralMessage(stats.referralCode, user.name);

    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
      email: `mailto:?subject=${encodeURIComponent('Convite VeloCity')}&body=${encodeURIComponent(message)}`
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-slate-50 rounded-xl p-8 text-center">
        <Gift className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600">Erro ao carregar programa de indicação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                <Gift className="w-8 h-8" />
                Programa de Indicação
              </h2>
              <p className="text-indigo-100 text-lg">
                Indique amigos e ganhe <strong>R$50</strong> para cada cadastro!
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-300" />
              <span className="font-bold">R$50 + R$50</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-indigo-200 text-sm mb-1">Você Ganha</p>
              <p className="text-3xl font-black">R$50</p>
              <p className="text-xs text-indigo-200 mt-1">por amigo cadastrado</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-indigo-200 text-sm mb-1">Seu Amigo Ganha</p>
              <p className="text-3xl font-black">R$50</p>
              <p className="text-xs text-indigo-200 mt-1">de crédito de boas-vindas</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-indigo-200 text-sm mb-1">Limite</p>
              <p className="text-3xl font-black">ILIMITADO</p>
              <p className="text-xs text-indigo-200 mt-1">indique quantos quiser!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Indicações"
          value={stats.totalReferrals.toString()}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Confirmadas"
          value={stats.completedReferrals.toString()}
          icon={Check}
          color="green"
        />
        <StatsCard
          title="Ganhos Totais"
          value={`R$ ${stats.totalRewardsEarned.toFixed(2)}`}
          icon={DollarSign}
          color="purple"
        />
        <StatsCard
          title="Já Recebidos"
          value={`R$ ${stats.totalRewardsPaid.toFixed(2)}`}
          icon={TrendingUp}
          color="indigo"
        />
      </div>

      {/* Share Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-indigo-600" />
          Compartilhe Seu Código
        </h3>

        {/* Referral Code */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3 text-center">
            Seu Código de Indicação
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white rounded-lg px-6 py-4 border-2 border-indigo-300">
              <p className="text-3xl font-black text-center text-indigo-600 tracking-wider">
                {stats.referralCode}
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700 text-center mb-3">
            Compartilhe nas redes sociais:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => handleShare('whatsapp')}
              className="py-3 px-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-2 font-medium"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </button>
            <button
              onClick={() => handleShare('facebook')}
              className="py-3 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 font-medium"
            >
              <Facebook className="w-5 h-5" />
              Facebook
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="py-3 px-4 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition flex items-center justify-center gap-2 font-medium"
            >
              <Twitter className="w-5 h-5" />
              Twitter
            </button>
            <button
              onClick={() => handleShare('email')}
              className="py-3 px-4 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2 font-medium"
            >
              <Mail className="w-5 h-5" />
              E-mail
            </button>
          </div>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full py-3 border-2 border-indigo-300 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition flex items-center justify-center gap-2 font-medium"
          >
            <LinkIcon className="w-5 h-5" />
            {copied ? 'Link Copiado!' : 'Copiar Link de Indicação'}
          </button>
        </div>
      </div>

      {/* Top Referrers Leaderboard */}
      {topReferrers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-yellow-50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Top Indicadores da Plataforma
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {topReferrers.map((referrer, index) => (
                <div
                  key={referrer.referrerId}
                  className={`flex items-center gap-4 p-4 rounded-xl ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300' :
                    index === 1 ? 'bg-slate-50 border border-slate-200' :
                    index === 2 ? 'bg-orange-50 border border-orange-200' :
                    'bg-slate-50 border border-slate-100'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-slate-400 text-white' :
                    index === 2 ? 'bg-orange-500 text-white' :
                    'bg-slate-300 text-slate-700'
                  }`}>
                    {index === 0 && <Award className="w-6 h-6" />}
                    {index > 0 && `${index + 1}º`}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{referrer.name}</p>
                    <p className="text-sm text-slate-500">{referrer.count} indicações</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-green-600 text-lg">
                      R$ {referrer.totalRewards.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">ganhos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-xl p-6 border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-indigo-600" />
          Como Funciona
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StepCard
            number="1"
            title="Compartilhe"
            description="Envie seu código para amigos e familiares"
            icon={Share2}
          />
          <StepCard
            number="2"
            title="Amigo Cadastra"
            description="Ele usa seu código no cadastro e ganha R$50"
            icon={Users}
          />
          <StepCard
            number="3"
            title="Você Ganha"
            description="Receba R$50 creditados na sua conta!"
            icon={Gift}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'indigo';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  );
};

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const StepCard: React.FC<StepCardProps> = ({ number, title, description, icon: Icon }) => {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 relative">
      <div className="absolute -top-3 -left-3 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg">
        {number}
      </div>
      <div className="mt-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
          <Icon className="w-6 h-6 text-indigo-600" />
        </div>
        <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
};
