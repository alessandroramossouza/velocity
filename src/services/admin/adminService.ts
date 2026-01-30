import { supabase } from '../../lib/supabase';
import { DashboardStats } from '../../types';

export const getAdminStats = async (): Promise<DashboardStats> => {
    // 1. Fetch key counts
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: totalCars } = await supabase.from('cars').select('*', { count: 'exact', head: true });

    // Active rentals: status = 'active'
    const { count: activeRentals } = await supabase.from('rentals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

    // 2. Revenue Calculation (Sum of approved payments)
    const { data: payments } = await supabase
        .from('payments')
        .select('amount, paid_at')
        .eq('status', 'approved');

    const totalRevenue = payments?.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) || 0;

    // 3. Revenue by Month
    const revenueByMonthMap = new Map<string, number>();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Initialize months with 0
    months.forEach(m => revenueByMonthMap.set(m, 0));

    payments?.forEach(p => {
        if (!p.paid_at) return;
        const date = new Date(p.paid_at);
        const monthIndex = date.getMonth();
        const monthName = months[monthIndex];
        revenueByMonthMap.set(monthName, (revenueByMonthMap.get(monthName) || 0) + Number(p.amount));
    });

    const revenueByMonth = months.map(m => ({
        name: m,
        value: revenueByMonthMap.get(m) || 0
    }));

    // 4. Car Status (Approximation)
    const carStatus = [
        { name: 'Disponível', value: (totalCars || 0) - (activeRentals || 0) },
        { name: 'Alugado', value: activeRentals || 0 },
        { name: 'Manutenção', value: 0 }, // Placeholder until maintenance module is real
        { name: 'Indisponível', value: 0 },
    ];

    // 5. User Growth (Mocked for now as we don't have created_at history easily accessible without more queries)
    // We'll return a static recent growth based on total users
    const userGrowth = [
        { name: 'Jan', renters: Math.floor((totalUsers || 0) * 0.8), owners: Math.floor((totalUsers || 0) * 0.2) }
    ];

    return {
        totalUsers: totalUsers || 0,
        totalCars: totalCars || 0,
        activeRentals: activeRentals || 0,
        totalRevenue,
        revenueByMonth,
        userGrowth,
        carStatus
    };
};

export const getDetailedRentals = async () => {
    // Fetch Rentals
    const { data: rentals } = await supabase
        .from('rentals')
        .select('*')
        .order('created_at', { ascending: false });

    if (!rentals) return [];

    // Fetch related data
    const userIds = new Set<string>();
    const carIds = new Set<string>();
    const rentalIds = rentals.map(r => r.id);

    rentals.forEach(r => {
        if (r.renter_id) userIds.add(r.renter_id);
        if (r.owner_id) userIds.add(r.owner_id);
        if (r.car_id) carIds.add(r.car_id);
    });

    const { data: users } = await supabase.from('users').select('id, name, email').in('id', Array.from(userIds));
    const { data: cars } = await supabase.from('cars').select('id, make, model').in('id', Array.from(carIds));
    const { data: payments } = await supabase.from('payments').select('rental_id, status, amount').in('rental_id', rentalIds);

    // Create Maps for fast lookup
    const usersMap = new Map(users?.map(u => [u.id, u]));
    const carsMap = new Map(cars?.map(c => [c.id, c]));
    const paymentsMap = new Map();

    // Group payments by rental (taking the latest or most relevant status)
    payments?.forEach(p => {
        // If we have an approved payment, that wins. Else take whatever.
        const current = paymentsMap.get(p.rental_id);
        if (current !== 'paid') {
            if (p.status === 'approved') paymentsMap.set(p.rental_id, 'paid');
            else if (p.status === 'pending') paymentsMap.set(p.rental_id, 'pending');
            else if (!current) paymentsMap.set(p.rental_id, 'late'); // Default/Fallback
        }
    });

    return rentals.map(r => {
        const renter = usersMap.get(r.renter_id);
        const owner = usersMap.get(r.owner_id);
        const car = carsMap.get(r.car_id);

        const endDate = new Date(r.end_date);
        const today = new Date();
        const isLate = r.status === 'active' && today > endDate;
        const daysLate = isLate ? Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 3600 * 24)) : 0;

        // Payment status logic
        let paymentStatus = paymentsMap.get(r.id) || 'pending';
        // If rental is completed, assume paid for old data, or trust payments table
        if (r.status === 'completed' && paymentStatus === 'pending') paymentStatus = 'paid';

        return {
            id: r.id,
            car: car ? `${car.make} ${car.model}` : 'Veículo Removido',
            renter: renter ? renter.name : 'Usuário Desconhecido',
            owner: owner ? owner.name : 'Desconhecido',
            startDate: r.start_date,
            endDate: r.end_date,
            status: r.status,
            paymentStatus: paymentStatus,
            contractSigned: !!r.terms_accepted, // Assuming this column exists from previous step
            daysLate: daysLate,
            amount: Number(r.total_price) || 0,
            renterId: r.renter_id,
            ownerId: r.owner_id
        };
    });
};

export const getDetailedUsers = async () => {
    const { data: users } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (!users) return [];

    return users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        kycStatus: u.is_verified ? 'verified' : 'pending',
        cnhUrl: u.cnh_url,
        selfieUrl: u.selfie_url,
        joinDate: u.created_at || new Date().toISOString(),
        lateReturns: 0, // Need to implement based on rental history query
        carsListed: 0   // Need to implement based on cars count query
    }));
};

export const updateUser = async (userId: string, updates: any) => {
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating user:', error);
        throw error;
    }

    return data;
};

// Helper for existing components
export const getLateRentals = async () => {
    const rentals = await getDetailedRentals();
    return rentals.filter(r => r.daysLate > 0 || r.status === 'late_return');
};
