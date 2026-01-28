import { DashboardStats } from '../../types';

// Mock data generator for the "Ultra Mega Forte" dashboard
export const getAdminStats = async (): Promise<DashboardStats> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
        totalUsers: 1248,
        totalCars: 156,
        activeRentals: 42,
        totalRevenue: 284500.00,
        revenueByMonth: [
            { name: 'Jan', value: 18400 },
            { name: 'Fev', value: 22300 },
            { name: 'Mar', value: 24500 },
            { name: 'Abr', value: 21200 },
            { name: 'Mai', value: 28900 },
            { name: 'Jun', value: 32400 },
            { name: 'Jul', value: 38500 },
            { name: 'Ago', value: 42100 },
            { name: 'Set', value: 45000 },
        ],
        userGrowth: [
            { name: 'Jan', renters: 120, owners: 15 },
            { name: 'Fev', renters: 150, owners: 22 },
            { name: 'Mar', renters: 220, owners: 35 },
            { name: 'Abr', renters: 310, owners: 48 },
            { name: 'Mai', renters: 450, owners: 62 },
            { name: 'Jun', renters: 580, owners: 85 },
        ],
        carStatus: [
            { name: 'Disponível', value: 85 },
            { name: 'Alugado', value: 42 },
            { name: 'Manutenção', value: 12 },
            { name: 'Indisponível', value: 17 },
        ]
    };
};

// Dados detalhados para tabelas de gestão
export const getDetailedRentals = () => {
    return [
        { id: 'R101', car: 'Jeep Renegade', renter: 'Carlos Silva', owner: 'Maria Souza', startDate: '2024-03-01', endDate: '2024-03-10', status: 'active', paymentStatus: 'late', contractSigned: true, daysLate: 2, amount: 2500.00 },
        { id: 'R102', car: 'Toyota Corolla', renter: 'Ana Santos', owner: 'João Pedro', startDate: '2024-03-05', endDate: '2024-03-12', status: 'active', paymentStatus: 'paid', contractSigned: true, daysLate: 0, amount: 1800.00 },
        { id: 'R103', car: 'BMW 320i', renter: 'Roberto Lima', owner: 'Global Motors', startDate: '2024-03-08', endDate: '2024-03-15', status: 'pending', paymentStatus: 'pending', contractSigned: false, daysLate: 0, amount: 4200.00 },
        { id: 'R104', car: 'Hyundai HB20', renter: 'Fernanda Costa', owner: 'Maria Souza', startDate: '2024-02-28', endDate: '2024-03-05', status: 'completed', paymentStatus: 'paid', contractSigned: true, daysLate: 0, amount: 900.00 },
        { id: 'R105', car: 'Fiat Pulse', renter: 'Lucas Pereira', owner: 'João Pedro', startDate: '2024-03-02', endDate: '2024-03-05', status: 'late_return', paymentStatus: 'paid', contractSigned: true, daysLate: 5, amount: 1200.00 },
    ];
};

export const getDetailedUsers = () => {
    return [
        { id: 'U001', name: 'Carlos Silva', email: 'carlos@email.com', role: 'renter', kycStatus: 'verified', joinDate: '2023-11-15', lateReturns: 2 },
        { id: 'U002', name: 'Maria Souza', email: 'maria@email.com', role: 'owner', kycStatus: 'verified', joinDate: '2023-10-10', carsListed: 5 },
        { id: 'U003', name: 'Roberto Lima', email: 'roberto@email.com', role: 'renter', kycStatus: 'pending', joinDate: '2024-02-20', lateReturns: 0 },
        { id: 'U004', name: 'Mecânica Total', email: 'contato@mecanica.com', role: 'partner', kycStatus: 'verified', joinDate: '2023-12-01', type: 'mechanic' },
    ];
};

export const getLateRentals = () => {
    return getDetailedRentals().filter(r => r.daysLate > 0 || r.status === 'late_return');
};
