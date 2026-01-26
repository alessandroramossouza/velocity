
import { supabase } from '../lib/supabase';
import { Car, User, Rental, Review, Favorite } from '../types';

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
        .select('id, name, email')
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
        role: data.role as 'owner' | 'renter'
    };
};

export const registerUser = async (email: string, name: string, role: 'owner' | 'renter'): Promise<User> => {
    // Generate a simple ID or let DB generate if using uuid.
    // Our DB uses text ID. Let's use timestamp or random string.
    const id = Math.random().toString(36).substr(2, 9);

    // Check if user exists first to avoid duplicates
    const existing = await getUserByEmail(email);
    if (existing) {
        return existing;
    }

    const { error } = await supabase
        .from('users')
        .insert({ id, email, name, role });

    if (error) {
        console.error('Error creating user:', error);
        throw new Error(error.message);
    }

    return { id, email, name, role };
};

// Legacy function (kept for compatibility)
export const rentCar = async (carId: string): Promise<void> => {
    await setCarAvailability(carId, false);
};
