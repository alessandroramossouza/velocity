
import { supabase } from '../lib/supabase';
import { Car } from '../types';

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

    // Ensure features is typed correctly if DB returns it loosely
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
