import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    Users, Car, DollarSign, Activity, TrendingUp, AlertTriangle,
    ShieldCheck, Wrench, Search, Filter, Download, FileText, CheckCircle, XCircle, Clock, Calendar
} from 'lucide-react';
import { getAdminStats, getDetailedRentals, getDetailedUsers } from '../../services/admin/adminService';
import { DashboardStats } from '../../types';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [rentals, setRentals] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'rentals' | 'users'>('overview');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const statsData = await getAdminStats();
            const rentalsData = await getDetailedRentals();
            const usersData = await getDetailedUsers();

            setStats(statsData);
            setRentals(rentalsData);
            setUsers(usersData);
        } catch (error) {
            console.error("Failed to load admin data", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Filter logic
    const filteredRentals = rentals.filter(r =>
        r.renter.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.car.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: 'bg-green-100 text-green-700',
            completed: 'bg-slate-100 text-slate-700',
            pending: 'bg-yellow-100 text-yellow-700',
            late_return: 'bg-red-100 text-red-700',
            late: 'bg-red-100 text-red-700',
            paid: 'bg-green-100 text-green-700'
        };

        const labels: Record<string, string> = {
            active: 'Em Andamento',
            completed: 'Concluído',
            pending: 'Pendente',
            late_return: 'Atrasado',
            late: 'Inadimplente',
            paid: 'Pago'
        };

        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${styles[status] || styles.pending}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-100 p-6 space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestão Operacional VeloCity</h1>
                    <p className="text-slate-500 text-sm">Monitoramento completo de locatários, contratos e pagamentos.</p>
                </div>

                {/* Navigation Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-auto">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'overview' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                    >
                        Visão Geral
                    </button>
                    <button
                        onClick={() => setActiveTab('rentals')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'rentals' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                    >
                        Aluguéis & Contratos
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'users' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                    >
                        Usuários & Parceiros
                    </button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <MetricCard title="Contratos Ativos" value={stats.activeRentals} icon={FileText} color="blue" />
                        <MetricCard title="Atrasos na Devolução" value={rentals.filter(r => r.daysLate > 0).length} isAlert icon={AlertTriangle} color="red" />
                        <MetricCard title="Pagamentos Pendentes" value={rentals.filter(r => r.paymentStatus === 'pending' || r.paymentStatus === 'late').length} icon={DollarSign} color="yellow" />
                        <MetricCard title="Novos Usuários (Mês)" value={stats.userGrowth[stats.userGrowth.length - 1].renters} icon={Users} color="green" />
                    </div>

                    {/* Critical Alerts Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Atenção Necessária (Atrasos e Pendências)
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Locatário</th>
                                        <th className="px-6 py-4">Veículo</th>
                                        <th className="px-6 py-4">Atraso</th>
                                        <th className="px-6 py-4">Valor Devido</th>
                                        <th className="px-6 py-4">Contato</th>
                                        <th className="px-6 py-4">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rentals.filter(r => r.daysLate > 0 || r.paymentStatus === 'late').map(rental => (
                                        <tr key={rental.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                {rental.daysLate > 0 && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold mr-2">Atrasado</span>}
                                                {rental.paymentStatus === 'late' && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">Pagamento</span>}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900">{rental.renter}</td>
                                            <td className="px-6 py-4">{rental.car}</td>
                                            <td className="px-6 py-4 text-red-600 font-bold">{rental.daysLate} dias</td>
                                            <td className="px-6 py-4">R$ {rental.amount.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-slate-500">
                                                <button className="text-indigo-600 hover:underline">Ver Tel.</button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-indigo-700">Resolver</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'rentals' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between gap-4">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-600" />
                            Todos os Aluguéis e Contratos
                        </h3>
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, carro..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Locatário</th>
                                    <th className="px-6 py-4">Locador</th>
                                    <th className="px-6 py-4">Veículo</th>
                                    <th className="px-6 py-4">Período</th>
                                    <th className="px-6 py-4">Contrato</th>
                                    <th className="px-6 py-4">Pagamento</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRentals.map(rental => (
                                    <tr key={rental.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">#{rental.id}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{rental.renter}</td>
                                        <td className="px-6 py-4 text-slate-600">{rental.owner}</td>
                                        <td className="px-6 py-4">{rental.car}</td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(rental.startDate).toLocaleDateString()} - {new Date(rental.endDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {rental.contractSigned ? (
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle className="w-4 h-4" /> Assinado
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-yellow-600">
                                                    <Clock className="w-4 h-4" /> Pendente
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {renderStatusBadge(rental.paymentStatus)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {renderStatusBadge(rental.status)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between gap-4">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            Gestão de Usuários e Parceiros
                        </h3>
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Buscar usuário..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Nome</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Data Registro</th>
                                    <th className="px-6 py-4">Status KYC</th>
                                    <th className="px-6 py-4">Histórico</th>
                                    <th className="px-6 py-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${user.role === 'renter' ? 'bg-blue-100 text-blue-700' :
                                                user.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{user.email}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(user.joinDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            {user.kycStatus === 'verified' ? (
                                                <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                                                    <ShieldCheck className="w-4 h-4" /> Verificado
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-slate-400 text-xs">
                                                    <Clock className="w-4 h-4" /> Pendente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            {user.lateReturns > 0 && <span className="text-red-600 block">{user.lateReturns} atrasos</span>}
                                            {user.carsListed > 0 && <span className="text-purple-600 block">{user.carsListed} carros</span>}
                                            {user.lateReturns === 0 && user.carsListed === undefined && <span className="text-green-600">Sem incidentes</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="text-slate-400 hover:text-indigo-600">Editar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </div>
    );
};

const MetricCard = ({ title, value, icon: Icon, color, isAlert }: any) => (
    <div className={`bg-white p-5 rounded-xl shadow-sm border ${isAlert ? 'border-red-200 bg-red-50' : 'border-slate-200'} flex items-center justify-between`}>
        <div>
            <p className={`text-sm font-medium mb-1 ${isAlert ? 'text-red-600' : 'text-slate-500'}`}>{title}</p>
            <h3 className={`text-2xl font-bold ${isAlert ? 'text-red-700' : 'text-slate-900'}`}>{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${isAlert ? 'bg-red-200 text-red-600' : `bg-${color}-50 text-${color}-600`}`}>
            <Icon className="w-6 h-6" />
        </div>
    </div>
);
