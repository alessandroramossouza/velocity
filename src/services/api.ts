import { supabase } from '../lib/supabase';
import { Car, User, Rental, Review, Favorite, Partner, ServiceRequest } from '../types';

// ============================================
// CARS
// ============================================

export const getCars = async (): Promise<Car[]> => {
    const { data, error } = await supabase
        .from('cars')
        .select(`
            id,
            ownerId:owner_id,
            make,
            model,
            year,
            category,
            pricePerDay:price_per_day,
            pricePerWeek:price_per_week,
            pricePerMonth:price_per_month,
            description,
            imageUrl:image_url,
            features,
            isAvailable:is_available,
            created_at
        `);

    if (error) {
        console.error('Error fetching cars:', error);
        return [];
    }

    return data as unknown as Car[];
};

export const createCar = async (car: Omit<Car, 'id'>): Promise<Car> => {
    const dbPayload = {
        owner_id: car.ownerId,
        make: car.make,
        model: car.model,
        year: car.year,
        category: car.category,
        price_per_day: car.pricePerDay,
        price_per_week: car.pricePerWeek,
        price_per_month: car.pricePerMonth,
        description: car.description,
        image_url: car.imageUrl,
        features: car.features,
        is_available: car.isAvailable
    };

    const { data, error } = await supabase
        .from('cars')
        .insert(dbPayload)
        .select(`
            id,
            ownerId:owner_id,
            make,
            model,
            year,
            category,
            pricePerDay:price_per_day,
            pricePerWeek:price_per_week,
            pricePerMonth:price_per_month,
            description,
            imageUrl:image_url,
            features,
            isAvailable:is_available
        `)
        .single();

    if (error) {
        console.error('Error creating car:', error);
        throw new Error(error.message);
    }

    return data as unknown as Car;
};

export const updateCar = async (car: Car): Promise<Car> => {
    const dbPayload = {
        make: car.make,
        model: car.model,
        year: car.year,
        category: car.category,
        price_per_day: car.pricePerDay,
        price_per_week: car.pricePerWeek,
        price_per_month: car.pricePerMonth,
        description: car.description,
        image_url: car.imageUrl,
        features: car.features,
        is_available: car.isAvailable
    };

    const { data, error } = await supabase
        .from('cars')
        .update(dbPayload)
        .eq('id', car.id)
        .select(`
            id,
            ownerId:owner_id,
            make,
            model,
            year,
            category,
            pricePerDay:price_per_day,
            pricePerWeek:price_per_week,
            pricePerMonth:price_per_month,
            description,
            imageUrl:image_url,
            features,
            isAvailable:is_available
        `)
        .single();

    if (error) {
        console.error('Error updating car:', error);
        throw new Error(error.message);
    }

    return data as unknown as Car;
};

export const setCarAvailability = async (carId: string | number, isAvailable: boolean): Promise<void> => {
    const { error } = await supabase
        .from('cars')
        .update({ is_available: isAvailable })
        .eq('id', carId);

    if (error) {
        console.error('Error updating car availability:', error);
        throw new Error(error.message);
    }
};

// ============================================
// RENTALS
// ============================================

export const createRental = async (
    carId: string | number,
    renterId: string,
    ownerId: string,
    startDate: string,
    endDate: string,
    totalPrice: number
): Promise<Rental> => {
    const { data, error } = await supabase
        .from('rentals')
        .insert({
            car_id: carId,
            renter_id: renterId,
            owner_id: ownerId,
            start_date: startDate,
            end_date: endDate,
            total_price: totalPrice,
            status: 'active'
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating rental:', error);
        throw new Error(error.message);
    }

    // Also mark car as unavailable
    await setCarAvailability(carId, false);

    return {
        id: data.id,
        carId: data.car_id,
        renterId: data.renter_id,
        ownerId: data.owner_id,
        startDate: data.start_date,
        endDate: data.end_date,
        totalPrice: data.total_price,
        status: data.status,
        createdAt: data.created_at
    };
};

export const createRentalProposal = async (
    carId: string | number,
    renterId: string,
    ownerId: string,
    startDate: string,
    endDate: string,
    totalPrice: number,
    rentalType: 'uber' | 'daily' = 'uber'
): Promise<Rental> => {
    // Note: If 'rental_type' column doesn't exist, we rely on 'status'='proposal'
    // to identify pending requests.
    const { data, error } = await supabase
        .from('rentals')
        .insert({
            car_id: carId,
            renter_id: renterId,
            owner_id: ownerId,
            start_date: startDate,
            end_date: endDate,
            total_price: totalPrice,
            status: 'proposal'
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating rental proposal:', error);
        throw new Error(error.message);
    }

    // Do NOT mark car as unavailable for proposals, owner must approve first?
    // Actually, maybe we should to reserve it?
    // For now, let's NOT block availability until approved.

    return {
        id: data.id,
        carId: data.car_id,
        renterId: data.renter_id,
        ownerId: data.owner_id,
        startDate: data.start_date,
        endDate: data.end_date,
        totalPrice: data.total_price,
        status: data.status,
        rentalType: rentalType,
        createdAt: data.created_at
    };
};

export const completeRental = async (rentalId: string, carId: string | number): Promise<void> => {
    const { error } = await supabase
        .from('rentals')
        .update({ status: 'completed' })
        .eq('id', rentalId);

    if (error) {
        console.error('Error completing rental:', error);
        throw new Error(error.message);
    }

    // Mark car as available again
    await setCarAvailability(carId, true);
};

export const getActiveRentals = async (ownerId: string): Promise<Rental[]> => {
    // 1. Fetch Rentals
    const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select(`
            id,
            carId:car_id,
            renterId:renter_id,
            ownerId:owner_id,
            startDate:start_date,
            endDate:end_date,
            totalPrice:total_price,
            status,
            createdAt:created_at
        `)
        .eq('owner_id', ownerId)
        .eq('status', 'active');

    if (rentalsError) {
        console.error('Error fetching rentals:', rentalsError);
        return [];
    }

    if (!rentalsData || rentalsData.length === 0) {
        return [];
    }

    const rentals = rentalsData as Rental[];

    // 2. Fetch Renters (Users) logic
    const renterIds = [...new Set(rentals.map(r => r.renterId))]; // Unique IDs

    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role, cpf, rg, cep, address, number, complement, neighborhood, city, state, cpfUrl:cpf_url, proofResidenceUrl:proof_residence_url, isVerified:is_verified')
        .in('id', renterIds);

    if (usersError) {
        console.error('Error fetching renters:', usersError);
        // Return rentals without renter info if user fetch fails
        return rentals;
    }

    // 3. Merge Data
    const usersMap = new Map(usersData.map(u => [u.id, u]));

    const mergedRentals = rentals.map(rental => ({
        ...rental,
        renter: usersMap.get(rental.renterId) // Attach user object
    }));

    return mergedRentals as Rental[];
};

export const getOwnerRentalHistory = async (ownerId: string): Promise<Rental[]> => {
    // 1. Fetch ALL Rentals for the owner (including completed/cancelled)
    const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select(`
            id,
            carId:car_id,
            renterId:renter_id,
            ownerId:owner_id,
            startDate:start_date,
            endDate:end_date,
            totalPrice:total_price,
            status,
            createdAt:created_at
        `)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

    if (rentalsError) {
        console.error('Error fetching rental history:', rentalsError);
        return [];
    }

    if (!rentalsData || rentalsData.length === 0) {
        return [];
    }

    const rentals = rentalsData as Rental[];

    // 2. Fetch Renters (Users) logic
    const renterIds = [...new Set(rentals.map(r => r.renterId))]; // Unique IDs

    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role, cpf, rg, cep, address, number, complement, neighborhood, city, state, cpfUrl:cpf_url, proofResidenceUrl:proof_residence_url, isVerified:is_verified')
        .in('id', renterIds);

    // 3. Fetch Car Details (to show car name in history)
    const carIds = [...new Set(rentals.map(r => r.carId))];
    const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select('id, make, model')
        .in('id', carIds);

    if (usersError) {
        console.error('Error fetching renters:', usersError);
    }

    // 4. Merge Data
    const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
    const carsMap = new Map(carsData?.map(c => [c.id, c]) || []);

    const mergedRentals = rentals.map(rental => ({
        ...rental,
        renter: usersMap.get(rental.renterId),
        car: carsMap.get(rental.carId) as Car // Attach car partial details
    }));

    return mergedRentals as Rental[];
};

export const getRenterHistory = async (renterId: string): Promise<Rental[]> => {
    const { data, error } = await supabase
        .from('rentals')
        .select(`
            id,
            carId:car_id,
            renterId:renter_id,
            ownerId:owner_id,
            startDate:start_date,
            endDate:end_date,
            totalPrice:total_price,
            status,
            createdAt:created_at
        `)
        .eq('renter_id', renterId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching renter history:', error);
        return [];
    }

    return data as Rental[];
};

// ============================================
// REVIEWS
// ============================================

export const createReview = async (
    rentalId: string,
    carId: string | number,
    renterId: string,
    rating: number,
    comment: string
): Promise<Review> => {
    const { data, error } = await supabase
        .from('reviews')
        .insert({
            rental_id: rentalId,
            car_id: carId,
            renter_id: renterId,
            rating,
            comment
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating review:', error);
        throw new Error(error.message);
    }

    return {
        id: data.id,
        rentalId: data.rental_id,
        carId: data.car_id,
        renterId: data.renter_id,
        reviewerType: data.reviewer_type || 'renter_to_car',
        reviewedUserId: data.reviewed_user_id,
        rating: data.rating,
        comment: data.comment,
        createdAt: data.created_at
    };
};

export const getCarReviews = async (carId: string | number): Promise<Review[]> => {
    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('car_id', carId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }

    return data.map((r: any) => ({
        id: r.id,
        rentalId: r.rental_id,
        carId: r.car_id,
        renterId: r.renter_id,
        reviewerType: r.reviewer_type || 'renter_to_car',
        reviewedUserId: r.reviewed_user_id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at
    }));
};

// ============================================
// FAVORITES
// ============================================

export const addFavorite = async (userId: string, carId: string | number): Promise<void> => {
    const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, car_id: carId });

    if (error && !error.message.includes('duplicate')) {
        console.error('Error adding favorite:', error);
        throw new Error(error.message);
    }
};

export const removeFavorite = async (userId: string, carId: string | number): Promise<void> => {
    const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('car_id', carId);

    if (error) {
        console.error('Error removing favorite:', error);
        throw new Error(error.message);
    }
};

export const getFavorites = async (userId: string): Promise<string[]> => {
    const { data, error } = await supabase
        .from('favorites')
        .select('car_id')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching favorites:', error);
        return [];
    }

    return data.map((f: any) => f.car_id);
};

// ============================================
// USERS
// ============================================

export const getUserByEmail = async (email: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error || !data) {
        return null;
    }

    return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role as 'owner' | 'renter',
        cnhUrl: data.cnh_url,
        selfieUrl: data.selfie_url,
        isVerified: data.is_verified || false,
        verificationDate: data.verification_date,
        cpf: data.cpf,
        rg: data.rg,
        cep: data.cep,
        address: data.address,
        number: data.number,
        complement: data.complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        cpfUrl: data.cpf_url,
        proofResidenceUrl: data.proof_residence_url
    };
};

export const loginUser = async (email: string, password: string): Promise<User | null> => {
    // SECURITY NOTE: In a real production app, use supabase.auth.signInWithPassword
    // This implementation checks against the custom 'users' table as requested for this MVP.
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

    if (error || !data) {
        return null;
    }

    return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role as 'owner' | 'renter',
        cnhUrl: data.cnh_url,
        selfieUrl: data.selfie_url,
        isVerified: data.is_verified || false,
        verificationDate: data.verification_date,
        cpf: data.cpf,
        rg: data.rg,
        cep: data.cep,
        address: data.address,
        number: data.number,
        complement: data.complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        cpfUrl: data.cpf_url,
        proofResidenceUrl: data.proof_residence_url
    };
};

export const registerUser = async (email: string, password: string, name: string, role: 'owner' | 'renter' | 'partner', extendedData?: any): Promise<User> => {
    // Generate a simple ID or let DB generate if using uuid.
    // Our DB uses text ID. Let's use timestamp or random string.
    const id = Math.random().toString(36).substr(2, 9);

    // Check if user exists first to avoid duplicates

    // ... code around ...
    const existing = await getUserByEmail(email);
    if (existing) {
        throw new Error('Usuário já existe com este e-mail.');
    }

    // Prepare extended data payload
    const payload: any = { id, email, password, name, role };
    if (extendedData) {
        payload.cpf = extendedData.cpf;
        payload.rg = extendedData.rg;
        payload.cep = extendedData.cep;
        payload.address = extendedData.address;
        payload.number = extendedData.number;
        payload.complement = extendedData.complement;
        payload.neighborhood = extendedData.neighborhood;
        payload.city = extendedData.city;
        payload.state = extendedData.state;
        // Document URLs
        payload.cpf_url = extendedData.cpfUrl;
        payload.proof_residence_url = extendedData.proofResidenceUrl;

        // Auto verify if docs are present (simplified for demo)
        if (extendedData.cpfUrl && extendedData.proofResidenceUrl) {
            payload.is_verified = true;
            payload.verification_date = new Date().toISOString();
            payload.cnh_url = extendedData.cpfUrl; // Using same slot for now as example or create new col
        }
    }

    const { error } = await supabase
        .from('users')
        .insert(payload);

    if (error) {
        console.error('Error creating user:', error);
        throw new Error(error.message);
    }

    return {
        id,
        email,
        name,
        role,
        // Retorna dados estendidos se disponíveis para atualizar estado global
        ...(extendedData ? {
            cpf: extendedData.cpf,
            rg: extendedData.rg,
            cep: extendedData.cep,
            address: extendedData.address,
            number: extendedData.number,
            complement: extendedData.complement,
            neighborhood: extendedData.neighborhood,
            city: extendedData.city,
            state: extendedData.state,
            cpfUrl: extendedData.cpfUrl,
            proofResidenceUrl: extendedData.proofResidenceUrl,
            // Campos de verificação simplificados
            isVerified: extendedData.cpfUrl && extendedData.proofResidenceUrl ? true : false,
            verificationDate: extendedData.cpfUrl && extendedData.proofResidenceUrl ? new Date().toISOString() : undefined,
            cnhUrl: extendedData.cpfUrl // Exemplo
        } : {})
    };
};

// Legacy function (kept for compatibility)
export const rentCar = async (carId: string): Promise<void> => {
    await setCarAvailability(carId, false);
};

// ============================================
// PARTNERS (Mechanics & Insurance)
// ============================================

export const getPartners = async (): Promise<Partner[]> => {
    const { data, error } = await supabase
        .from('partners')
        .select(`
            id,
            userId:user_id,
            name,
            type,
            description,
            contactInfo:contact_info,
            rating,
            imageUrl:image_url,
            benefits,
            status,
            address,
            serviceArea:service_area,
            website
        `)
        .eq('status', 'active');

    if (error) {
        console.error('Error fetching partners:', error);
        return [];
    }

    return data as unknown as Partner[];
};

// Get partner profile by user_id
export const getPartnerByUserId = async (userId: string): Promise<Partner | null> => {
    const { data, error } = await supabase
        .from('partners')
        .select(`
            id,
            userId:user_id,
            name,
            type,
            description,
            contactInfo:contact_info,
            rating,
            imageUrl:image_url,
            benefits,
            status,
            address,
            serviceArea:service_area,
            website
        `)
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error('Error fetching partner by user_id:', error);
        return null;
    }

    return data as unknown as Partner;
};

// Create or update partner profile
export const upsertPartnerProfile = async (partner: Partial<Partner> & { userId: string }): Promise<Partner | null> => {
    const dbPayload = {
        user_id: partner.userId,
        name: partner.name,
        type: partner.type,
        description: partner.description,
        contact_info: partner.contactInfo,
        rating: partner.rating || 5.0,
        image_url: partner.imageUrl,
        benefits: partner.benefits || [],
        status: partner.status || 'active',
        address: partner.address,
        service_area: partner.serviceArea,
        website: partner.website
    };

    // First check if partner exists for this user
    const { data: existingPartner } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', partner.userId)
        .single();

    let data, error;

    if (existingPartner) {
        // UPDATE existing partner
        const result = await supabase
            .from('partners')
            .update(dbPayload)
            .eq('user_id', partner.userId)
            .select()
            .single();
        data = result.data;
        error = result.error;
    } else {
        // INSERT new partner
        const result = await supabase
            .from('partners')
            .insert(dbPayload)
            .select()
            .single();
        data = result.data;
        error = result.error;
    }

    if (error) {
        console.error('Error upserting partner profile:', error);
        return null;
    }

    return data as unknown as Partner;
};

// ============================================
// SERVICE REQUESTS
// ============================================

export const createServiceRequest = async (
    ownerId: string,
    partnerId: string,
    serviceType: ServiceRequest['serviceType'],
    notes?: string
): Promise<ServiceRequest | null> => {
    const { data, error } = await supabase
        .from('service_requests')
        .insert({
            owner_id: ownerId,
            partner_id: partnerId,
            service_type: serviceType,
            notes,
            status: 'pending'
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating service request:', error);
        return null;
    }

    return {
        id: data.id,
        ownerId: data.owner_id,
        partnerId: data.partner_id,
        serviceType: data.service_type,
        status: data.status,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
};

export const getOwnerServiceRequests = async (ownerId: string): Promise<ServiceRequest[]> => {
    const { data, error } = await supabase
        .from('service_requests')
        .select(`
            id,
            ownerId:owner_id,
            partnerId:partner_id,
            serviceType:service_type,
            status,
            notes,
            createdAt:created_at,
            updatedAt:updated_at
        `)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching owner service requests:', error);
        return [];
    }

    return data as unknown as ServiceRequest[];
};

export const getPartnerServiceRequests = async (partnerId: string): Promise<ServiceRequest[]> => {
    const { data: requestsData, error: requestsError } = await supabase
        .from('service_requests')
        .select(`
            id,
            ownerId:owner_id,
            partnerId:partner_id,
            serviceType:service_type,
            status,
            notes,
            createdAt:created_at,
            updatedAt:updated_at
        `)
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

    if (requestsError) {
        console.error('Error fetching partner service requests:', requestsError);
        return [];
    }

    if (!requestsData || requestsData.length === 0) return [];

    // Fetch owner details
    const ownerIds = [...new Set(requestsData.map((r: any) => r.ownerId))];
    const { data: ownersData } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', ownerIds);

    const ownersMap = new Map(ownersData?.map(o => [o.id, o]) || []);

    return requestsData.map((r: any) => ({
        ...r,
        owner: ownersMap.get(r.ownerId)
    })) as ServiceRequest[];
};

export const updateServiceRequestStatus = async (
    requestId: string,
    status: ServiceRequest['status']
): Promise<boolean> => {
    const { error } = await supabase
        .from('service_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId);

    if (error) {
        console.error('Error updating service request status:', error);
        return false;
    }

    return true;
};

// ============================================
// PROPOSALS
// ============================================

export const getRentalProposals = async (ownerId: string): Promise<Rental[]> => {
    const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select(`
            id,
            carId:car_id,
            renterId:renter_id,
            ownerId:owner_id,
            startDate:start_date,
            endDate:end_date,
            totalPrice:total_price,
            totalPrice:total_price,
            status,
            createdAt:created_at,
            contractUrl:contract_url,
            signedContractUrl:signed_contract_url
        `)
        .eq('owner_id', ownerId)
        .in('status', ['proposal', 'proposal_submitted', 'contract_pending_signature', 'contract_signed', 'payment_pending'])
        .order('created_at', { ascending: false });

    if (rentalsError || !rentalsData) return [];

    const rentals = rentalsData as Rental[];
    if (rentals.length === 0) return [];

    // Fetch Renters & Cars details
    const rentersIds = [...new Set(rentals.map(r => r.renterId))];
    const carIds = [...new Set(rentals.map(r => r.carId))];

    const { data: users } = await supabase
        .from('users')
        .select('id, name, email, role, cpf, rg, cep, address, number, complement, neighborhood, city, state, cpfUrl:cpf_url, proofResidenceUrl:proof_residence_url, isVerified:is_verified')
        .in('id', rentersIds);

    const { data: cars } = await supabase
        .from('cars')
        .select('id, make, model, category, imageUrl:image_url, year, contractPdfUrl:contract_pdf_url')
        .in('id', carIds);

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);
    const carsMap = new Map(cars?.map(c => [c.id, c]) || []);

    return rentals.map(r => ({
        ...r,
        renter: usersMap.get(r.renterId) as unknown as User,
        car: carsMap.get(r.carId) as unknown as Car
    }));
};

export const approveRentalProposal = async (rentalId: string): Promise<void> => {
    const { error } = await supabase
        .from('rentals')
        .update({ status: 'active' })
        .eq('id', rentalId);
    if (error) throw new Error(error.message);
};

export const rejectRentalProposal = async (rentalId: string): Promise<void> => {
    const { error } = await supabase
        .from('rentals')
        .update({ status: 'cancelled' })
        .eq('id', rentalId);
    if (error) throw new Error(error.message);
};

export const confirmProposalPayment = async (rentalId: string): Promise<void> => {
    const { error } = await supabase
        .from('rentals')
        .update({ status: 'active' })
        .eq('id', rentalId);
    if (error) throw new Error(error.message);
};

export const getRenterProposals = async (renterId: string): Promise<Rental[]> => {
    const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select(`
            id,
            carId:car_id,
            renterId:renter_id,
            ownerId:owner_id,
            startDate:start_date,
            endDate:end_date,
            totalPrice:total_price,
            status,
            createdAt:created_at,
            contractUrl:contract_url,
            signedContractUrl:signed_contract_url
        `)
        .eq('renter_id', renterId)
        .in('status', ['proposal', 'proposal_submitted', 'contract_pending_signature', 'contract_signed', 'payment_pending'])
        .order('created_at', { ascending: false });

    if (rentalsError || !rentalsData) return [];
    if (rentalsData.length === 0) return [];

    const rentals = rentalsData as Rental[];

    // Fetch Cars details
    const carIds = [...new Set(rentals.map(r => r.carId))];
    const { data: cars } = await supabase
        .from('cars')
        .select('id, make, model, category, imageUrl:image_url, year, ownerId:owner_id, contractPdfUrl:contract_pdf_url')
        .in('id', carIds);
    const carsMap = new Map(cars?.map(c => [c.id, c]) || []);

    return rentals.map(r => ({
        ...r,
        car: carsMap.get(r.carId) as unknown as Car
    }));
};

export const uploadProposalContract = async (rentalId: string, contractUrl: string): Promise<void> => {
    const { error } = await supabase
        .from('rentals')
        .update({ status: 'contract_pending_signature', contract_url: contractUrl })
        .eq('id', rentalId);
    if (error) throw new Error(error.message);
};

export const signProposalContract = async (rentalId: string, signedContractUrl: string): Promise<void> => {
    const { error } = await supabase
        .from('rentals')
        .update({ status: 'contract_signed', signed_contract_url: signedContractUrl })
        .eq('id', rentalId);
    if (error) throw new Error(error.message);
};

export const requestProposalPayment = async (rentalId: string): Promise<void> => {
    const { error } = await supabase
        .from('rentals')
        .update({ status: 'payment_pending' })
        .eq('id', rentalId);
    if (error) throw new Error(error.message);
};

// ============================================
// INSTALLMENTS (WEEKLY PAYMENTS)
// ============================================

export const generateWeeklyInstallments = async (rental: Rental): Promise<void> => {
    const startDate = new Date(rental.startDate);
    const endDate = new Date(rental.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Determine number of weeks (minimum 1)
    const weeks = Math.ceil(diffDays / 7);
    const weeklyAmount = rental.totalPrice / weeks;

    // Prepare Installments
    const installments = [];
    for (let i = 0; i < weeks; i++) {
        const dueDate = new Date(startDate);
        dueDate.setDate(startDate.getDate() + (i * 7)); // Every 7 days from start

        installments.push({
            rental_id: rental.id,
            installment_number: i + 1,
            due_date: dueDate.toISOString(),
            amount: weeklyAmount,
            status: 'pending'
        });
    }

    const { error } = await supabase
        .from('rental_installments')
        .insert(installments);

    if (error) {
        console.error('Error generating installments:', error);
        throw new Error(error.message);
    }
};

export const getRentalInstallments = async (rentalId: string): Promise<any[]> => {
    const { data, error } = await supabase
        .from('rental_installments')
        .select('*')
        .eq('rental_id', rentalId)
        .order('installment_number', { ascending: true });

    if (error) {
        console.error('Error fetching installments:', error);
        return [];
    }

    return data.map((i: any) => ({
        id: i.id,
        rentalId: i.rental_id,
        installmentNumber: i.installment_number,
        dueDate: i.due_date,
        amount: i.amount,
        status: i.status,
        paidAt: i.paid_at,
        createdAt: i.created_at
    }));
};

export const payInstallment = async (installmentId: string): Promise<void> => {
    const { error } = await supabase
        .from('rental_installments')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', installmentId);

    if (error) throw new Error(error.message);
};
