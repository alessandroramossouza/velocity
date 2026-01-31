// ============================================================
// VELOCITY - FASE 1: Dashboard de Comissões (Admin)
// ============================================================
// Visualização e gestão de comissões da plataforma
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Clock, CheckCircle, Download,
  RefreshCw, Calendar, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { PlatformEarning } from '../../types-fase1';
import {
  getAllPlatformEarnings,
  getPlatformCommissionStats,
  processCommissions,
  formatCurrency,
  formatPercentage
} from '../../services/commissionService';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export const CommissionDashboard: React.FC = () => {
  const [earnings, setEarnings] = useState<PlatformEarning[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'processed' | 'paid'>('all');

  useEffect(() => {
    loadData();
  }, [selectedPeriod, selectedStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: string | undefined;

      if (selectedPeriod === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString();
      } else if (selectedPeriod === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else {
        const quarterStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        startDate = quarterStart.toISOString();
      }

      const filters = selectedStatus !== 'all' ? { status: selectedStatus as any, startDate } : { startDate };
      const earningsData = await getAllPlatformEarnings(filters);
      setEarnings(earningsData);

      const statsData = await getPlatformCommissionStats(startDate);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading commission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessSelected = async () => {
    const pendingIds = earnings.filter(e => e.status === 'pending').map(e => e.id);
    if (pendingIds.length === 0) {
      alert('Nenhuma comissão pendente para processar.');
      return;
    }

    const success = await processCommissions(pendingIds);
    if (success) {
      alert(`${pendingIds.length} comissões processadas com sucesso!`);
      loadData();
    } else {
      alert('Erro ao processar comissões.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const statusDistribution = [
    { name: 'Pendente', value: stats?.pendingCommissions || 0, color: '#f59e0b' },
    { name: 'Processado', value: stats?.processedCommissions || 0, color: '#10b981' },
    { name: 'Pago', value: stats?.paidCommissions || 0, color: '#4f46e5' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-green-600" />
              Receita da Plataforma
            </h2>
            <p className="text-slate-500 text-sm">
              Comissões de {formatPercentage(stats?.averageCommissionRate || 15)} por transação
            </p>
          </div>

          <div className="flex gap-2">
            {/* Period Selector */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {(['week', 'month', 'quarter'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    selectedPeriod === period
                      ? 'bg-white shadow text-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {period === 'week' && 'Semana'}
                  {period === 'month' && 'Mês'}
                  {period === 'quarter' && 'Trimestre'}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">Todos Status</option>
              <option value="pending">Pendente</option>
              <option value="processed">Processado</option>
              <option value="paid">Pago</option>
            </select>

            {/* Actions */}
            <button
              onClick={loadData}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleProcessSelected}
              disabled={!stats || stats.pendingCommissions === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Processar Pendentes
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Receita Total (Comissões)"
          value={formatCurrency(stats?.totalCommission || 0)}
          icon={DollarSign}
          color="green"
        />
        <KPICard
          title="Valor Bruto"
          value={formatCurrency(stats?.totalGross || 0)}
          icon={TrendingUp}
          color="blue"
        />
        <KPICard
          title="Repasse a Locadores"
          value={formatCurrency(stats?.totalNetToOwners || 0)}
          icon={Calendar}
          color="purple"
        />
        <KPICard
          title="Total de Transações"
          value={stats?.totalTransactions?.toString() || '0'}
          icon={BarChart3}
          color="indigo"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-indigo-600" />
            Distribuição por Status
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4">Resumo de Status</h3>
          <div className="space-y-4">
            <StatusRow
              label="Pendente"
              count={stats?.pendingCommissions || 0}
              color="yellow"
              icon={Clock}
            />
            <StatusRow
              label="Processado"
              count={stats?.processedCommissions || 0}
              color="green"
              icon={CheckCircle}
            />
            <StatusRow
              label="Pago"
              count={stats?.paidCommissions || 0}
              color="indigo"
              icon={CheckCircle}
            />
            <div className="pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Taxa Média:</span>
                <span className="font-bold text-indigo-600 text-xl">
                  {formatPercentage(stats?.averageCommissionRate || 15)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Histórico de Comissões
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Rental ID</th>
                <th className="px-6 py-4">Valor Bruto</th>
                <th className="px-6 py-4">Comissão (%)</th>
                <th className="px-6 py-4">Comissão (R$)</th>
                <th className="px-6 py-4">Repasse Locador</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {earnings.map(earning => (
                <tr key={earning.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(earning.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    #{earning.rentalId.substring(0, 8)}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {formatCurrency(earning.grossAmount)}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {formatPercentage(earning.commissionPercentage)}
                  </td>
                  <td className="px-6 py-4 font-bold text-green-600">
                    {formatCurrency(earning.commissionAmount)}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {formatCurrency(earning.netToOwner)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      earning.status === 'paid' ? 'bg-indigo-100 text-indigo-700' :
                      earning.status === 'processed' ? 'bg-green-100 text-green-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {earning.status === 'paid' && 'Pago'}
                      {earning.status === 'processed' && 'Processado'}
                      {earning.status === 'pending' && 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'green' | 'blue' | 'purple' | 'indigo';
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
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

interface StatusRowProps {
  label: string;
  count: number;
  color: 'yellow' | 'green' | 'indigo';
  icon: React.ElementType;
}

const StatusRow: React.FC<StatusRowProps> = ({ label, count, color, icon: Icon }) => {
  const colorClasses = {
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200'
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <span className="font-medium">{label}</span>
      </div>
      <span className="font-bold text-lg">{count}</span>
    </div>
  );
};
