// ============================================================
// VELOCITY - FASE 1: Dashboard Financeiro Avançado
// ============================================================
// Analytics financeiro completo para locadores
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3,
  Download, RefreshCw, Lightbulb, Target, Award, AlertCircle,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { FinancialMetrics, PricingSuggestion } from '../types-fase1';
import {
  getOwnerFinancialMetrics,
  getPricingSuggestions,
  downloadFinancialReport,
  formatRevenue,
  formatOccupancyRate,
  getOccupancyColor,
  getGrowthColor
} from '../services/financialService';
import { User } from '../types';

interface OwnerFinancialDashboardProps {
  user: User;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const OwnerFinancialDashboard: React.FC<OwnerFinancialDashboardProps> = ({ user }) => {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [suggestions, setSuggestions] = useState<PricingSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    loadMetrics();
  }, [user.id, selectedPeriod]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: string;

      if (selectedPeriod === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else if (selectedPeriod === 'quarter') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
      } else {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString();
      }

      const data = await getOwnerFinancialMetrics(user.id, { startDate });
      setMetrics(data);

      const pricingSuggestions = await getPricingSuggestions(user.id);
      setSuggestions(pricingSuggestions);
    } catch (error) {
      console.error('Error loading financial metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    await downloadFinancialReport(user.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-slate-50 rounded-xl p-12 text-center">
        <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Sem Dados Financeiros</h3>
        <p className="text-slate-600">
          Complete seu primeiro aluguel para ver suas métricas financeiras.
        </p>
      </div>
    );
  }

  const growthTrend = metrics.revenueByMonth.length >= 2
    ? metrics.revenueByMonth[metrics.revenueByMonth.length - 1].revenue -
      metrics.revenueByMonth[metrics.revenueByMonth.length - 2].revenue
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-indigo-600" />
              Dashboard Financeiro
            </h2>
            <p className="text-slate-500 text-sm">
              Analytics e insights para otimizar sua receita
            </p>
          </div>

          <div className="flex gap-2">
            {/* Period Selector */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {(['month', 'quarter', 'year'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    selectedPeriod === period
                      ? 'bg-white shadow text-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {period === 'month' && 'Mês'}
                  {period === 'quarter' && 'Trimestre'}
                  {period === 'year' && 'Ano'}
                </button>
              ))}
            </div>

            {/* Actions */}
            <button
              onClick={loadMetrics}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Receita Total"
          value={formatRevenue(metrics.totalRevenue)}
          trend={growthTrend}
          icon={DollarSign}
          color="green"
        />
        <KPICard
          title="Taxa de Ocupação"
          value={formatOccupancyRate(metrics.averageOccupancyRate)}
          subtitle={`${metrics.totalDaysBooked} dias alugados`}
          icon={Calendar}
          color="blue"
        />
        <KPICard
          title="Taxa de Conversão"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          subtitle={`${metrics.approvedProposals}/${metrics.totalProposals} propostas`}
          icon={Target}
          color="purple"
        />
        <KPICard
          title="Projeção Próximo Mês"
          value={formatRevenue(metrics.nextMonthProjection)}
          subtitle="Baseado em histórico"
          icon={TrendingUp}
          color="indigo"
        />
      </div>

      {/* Pricing Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            Sugestões de Otimização de Preço
          </h3>
          <div className="space-y-3">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-amber-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-slate-900">Veículo #{suggestion.carId}</p>
                    <p className="text-sm text-slate-600">{suggestion.reason}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    suggestion.confidence === 'high' ? 'bg-green-100 text-green-700' :
                    suggestion.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {suggestion.confidence === 'high' && 'Alta Confiança'}
                    {suggestion.confidence === 'medium' && 'Média Confiança'}
                    {suggestion.confidence === 'low' && 'Baixa Confiança'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Atual:</span>
                    <span className="font-bold text-slate-900 ml-1">
                      {formatRevenue(suggestion.currentPrice)}/dia
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-slate-500">Sugerido:</span>
                    <span className="font-bold text-indigo-600 ml-1">
                      {formatRevenue(suggestion.suggestedPrice)}/dia
                    </span>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs text-green-600 font-bold">
                      +{formatRevenue(suggestion.potentialRevenueIncrease)}/mês
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Month */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Receita por Mês
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                formatter={(value: any) => formatRevenue(Number(value))}
              />
              <Bar dataKey="revenue" fill="#4f46e5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Vehicle */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            Receita por Veículo
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={metrics.revenueByVehicle}
                dataKey="revenue"
                nameKey="carName"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.carName}: ${formatRevenue(entry.revenue)}`}
                labelLine={false}
              >
                {metrics.revenueByVehicle.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatRevenue(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Occupancy Rate Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Taxa de Ocupação por Veículo
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Veículo</th>
                <th className="px-6 py-4">Taxa de Ocupação</th>
                <th className="px-6 py-4">Receita</th>
                <th className="px-6 py-4">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.occupancyByVehicle.map((vehicle, index) => {
                const revenueData = metrics.revenueByVehicle.find(r => r.carId === vehicle.carId);
                const isBest = metrics.bestPerformingCar?.carId === vehicle.carId;
                const isWorst = metrics.worstPerformingCar?.carId === vehicle.carId;

                return (
                  <tr key={vehicle.carId} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {isBest && (
                          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Award className="w-4 h-4 text-yellow-600" />
                          </div>
                        )}
                        <span className="font-medium text-slate-900">{vehicle.carName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[120px]">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              vehicle.rate >= 70 ? 'bg-green-500' :
                              vehicle.rate >= 40 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(vehicle.rate, 100)}%` }}
                          />
                        </div>
                        <span className={`font-bold ${getOccupancyColor(vehicle.rate)}`}>
                          {formatOccupancyRate(vehicle.rate)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatRevenue(revenueData?.revenue || 0)}
                    </td>
                    <td className="px-6 py-4">
                      {isBest && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold">
                          Melhor
                        </span>
                      )}
                      {isWorst && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                          Precisa Atenção
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best and Worst Performers */}
      {(metrics.bestPerformingCar || metrics.worstPerformingCar) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.bestPerformingCar && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-green-900 mb-1">Melhor Performance</h4>
                  <p className="text-lg font-bold text-slate-900">{metrics.bestPerformingCar.name}</p>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Receita:</span>
                      <span className="font-bold text-green-900">
                        {formatRevenue(metrics.bestPerformingCar.revenue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Ocupação:</span>
                      <span className="font-bold text-green-900">
                        {formatOccupancyRate(metrics.bestPerformingCar.occupancyRate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {metrics.worstPerformingCar && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 mb-1">Precisa Atenção</h4>
                  <p className="text-lg font-bold text-slate-900">{metrics.worstPerformingCar.name}</p>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-red-700">Receita:</span>
                      <span className="font-bold text-red-900">
                        {formatRevenue(metrics.worstPerformingCar.revenue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">Ocupação:</span>
                      <span className="font-bold text-red-900">
                        {formatOccupancyRate(metrics.worstPerformingCar.occupancyRate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Market Comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-600" />
          Comparação com Mercado
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-1">Sua Média</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatRevenue(metrics.yourAveragePrice)}
            </p>
            <p className="text-xs text-slate-400">por dia</p>
          </div>
          <div className="flex items-center justify-center">
            {metrics.priceDifference > 0 ? (
              <div className="flex flex-col items-center">
                <ArrowUp className="w-8 h-8 text-green-600" />
                <span className="text-sm font-bold text-green-600">
                  {Math.abs(metrics.priceDifference).toFixed(1)}% acima
                </span>
              </div>
            ) : metrics.priceDifference < 0 ? (
              <div className="flex flex-col items-center">
                <ArrowDown className="w-8 h-8 text-red-600" />
                <span className="text-sm font-bold text-red-600">
                  {Math.abs(metrics.priceDifference).toFixed(1)}% abaixo
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Minus className="w-8 h-8 text-slate-400" />
                <span className="text-sm font-bold text-slate-600">Na média</span>
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-1">Média do Mercado</p>
            <p className="text-2xl font-bold text-indigo-600">
              {formatRevenue(metrics.marketAveragePrice)}
            </p>
            <p className="text-xs text-slate-400">por dia</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// KPI CARD COMPONENT
// ============================================================

interface KPICardProps {
  title: string;
  value: string;
  trend?: number;
  subtitle?: string;
  icon: React.ElementType;
  color: 'green' | 'blue' | 'purple' | 'indigo' | 'red';
}

const KPICard: React.FC<KPICardProps> = ({ title, value, trend, subtitle, icon: Icon, color }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
      {subtitle && (
        <p className="text-xs text-slate-500">{subtitle}</p>
      )}
      {trend !== undefined && trend !== 0 && (
        <div className={`flex items-center gap-1 text-xs font-medium mt-2 ${getGrowthColor(trend)}`}>
          {trend > 0 ? (
            <>
              <TrendingUp className="w-3 h-3" />
              +{formatRevenue(Math.abs(trend))} vs mês anterior
            </>
          ) : (
            <>
              <TrendingDown className="w-3 h-3" />
              {formatRevenue(Math.abs(trend))} vs mês anterior
            </>
          )}
        </div>
      )}
    </div>
  );
};
