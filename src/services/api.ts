
import { supabase } from '../lib/supabase';
import { Car, User } from '../types';

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
            description,
            imageUrl:image_url,
            features,
            isAvailable:is_available
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

// Nova função para login
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
