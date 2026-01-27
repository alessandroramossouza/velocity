import { supabase } from '../lib/supabase';

// =====================================================
// TYPES
// =====================================================

export interface Payment {
    id: string;
    userId: string;
    receiverId?: string;
    rentalId?: string;
    serviceRequestId?: string;
    amount: number;
    currency: string;
    method: 'pix' | 'credit_card' | 'boleto';
    status: 'pending' | 'processing' | 'approved' | 'rejected' | 'refunded' | 'expired' | 'cancelled';
    externalId?: string;
    gateway?: string;
    // PIX
    pixCode?: string;
    pixQrcode?: string;
    pixKey?: string;
    // Boleto
    boletoCode?: string;
    boletoUrl?: string;
    boletoBarcode?: string;
    boletoDueDate?: string;
    // Card
    cardLastDigits?: string;
    cardBrand?: string;
    cardHolder?: string;
    installments?: number;
    installmentValue?: number;
    // Meta
    description?: string;
    referenceType?: string;
    referenceId?: string;
    paidAt?: string;
    expiresAt?: string;
    refundedAt?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface SavedCard {
    id: string;
    userId: string;
    token: string;
    gateway: string;
    brand: string;
    lastDigits: string;
    holderName: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
    isActive: boolean;
    nickname?: string;
    lastUsedAt?: string;
    createdAt: string;
}

export interface CreatePaymentParams {
    userId: string;
    receiverId?: string;
    rentalId?: string;
    serviceRequestId?: string;
    amount: number;
    method: 'pix' | 'credit_card' | 'boleto';
    description?: string;
    installments?: number;
    cardToken?: string;
}

export interface CardData {
    number: string;
    holderName: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
    saveCard?: boolean;
}

// =====================================================
// PIX PAYMENT
// =====================================================

export const createPixPayment = async (params: CreatePaymentParams): Promise<Payment | null> => {
    const pixCode = generatePixCode(params.amount);
    const qrCode = await generateQRCode(pixCode);

    const { data, error } = await supabase
        .from('payments')
        .insert({
            user_id: params.userId,
            receiver_id: params.receiverId || null,
            rental_id: params.rentalId || null,
            service_request_id: params.serviceRequestId || null,
            amount: params.amount,
            method: 'pix',
            status: 'pending',
            description: params.description || 'Pagamento VeloCity',
            pix_code: pixCode,
            pix_qrcode: qrCode,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating PIX payment:', error);
        return null;
    }

    return mapPaymentFromDb(data);
};

// =====================================================
// BOLETO PAYMENT
// =====================================================

export const createBoletoPayment = async (params: CreatePaymentParams): Promise<Payment | null> => {
    const boletoCode = generateBoletoCode(params.amount);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3); // 3 days from now

    const { data, error } = await supabase
        .from('payments')
        .insert({
            user_id: params.userId,
            receiver_id: params.receiverId || null,
            rental_id: params.rentalId || null,
            service_request_id: params.serviceRequestId || null,
            amount: params.amount,
            method: 'boleto',
            status: 'pending',
            description: params.description || 'Pagamento VeloCity',
            boleto_code: boletoCode,
            boleto_barcode: boletoCode.replace(/[\s\.]/g, ''),
            boleto_due_date: dueDate.toISOString().split('T')[0],
            expires_at: dueDate.toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating Boleto payment:', error);
        return null;
    }

    return mapPaymentFromDb(data);
};

// =====================================================
// CREDIT CARD PAYMENT
// =====================================================

export const createCardPayment = async (
    params: CreatePaymentParams,
    cardData: CardData
): Promise<Payment | null> => {
    // Simulate card processing
    const isValid = validateCard(cardData);
    if (!isValid) {
        console.error('Invalid card data');
        return null;
    }

    // In production, this would call a real payment gateway
    const externalId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const installmentValue = params.installments ? params.amount / params.installments : params.amount;

    const { data, error } = await supabase
        .from('payments')
        .insert({
            user_id: params.userId,
            receiver_id: params.receiverId || null,
            rental_id: params.rentalId || null,
            service_request_id: params.serviceRequestId || null,
            amount: params.amount,
            method: 'credit_card',
            status: 'approved', // Simulated instant approval
            description: params.description || 'Pagamento VeloCity',
            external_id: externalId,
            card_last_digits: cardData.number.slice(-4),
            card_brand: detectCardBrand(cardData.number),
            card_holder: cardData.holderName,
            installments: params.installments || 1,
            installment_value: installmentValue,
            paid_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating Card payment:', error);
        return null;
    }

    // Save card if requested
    if (cardData.saveCard) {
        await saveCard(params.userId, cardData);
    }

    return mapPaymentFromDb(data);
};

// =====================================================
// SAVED CARDS
// =====================================================

export const getSavedCards = async (userId: string): Promise<SavedCard[]> => {
    const { data, error } = await supabase
        .from('saved_cards')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching saved cards:', error);
        return [];
    }

    return data.map(mapSavedCardFromDb);
};

export const saveCard = async (userId: string, cardData: CardData): Promise<SavedCard | null> => {
    // Generate a token (in production, this comes from the payment gateway)
    const token = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data, error } = await supabase
        .from('saved_cards')
        .insert({
            user_id: userId,
            token: token,
            gateway: 'velocity_sim',
            brand: detectCardBrand(cardData.number),
            last_digits: cardData.number.slice(-4),
            holder_name: cardData.holderName,
            expiry_month: cardData.expiryMonth,
            expiry_year: cardData.expiryYear,
            is_default: false
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving card:', error);
        return null;
    }

    return mapSavedCardFromDb(data);
};

export const deleteCard = async (cardId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('saved_cards')
        .update({ is_active: false })
        .eq('id', cardId);

    return !error;
};

export const setDefaultCard = async (cardId: string, userId: string): Promise<boolean> => {
    // Remove default from all cards
    await supabase
        .from('saved_cards')
        .update({ is_default: false })
        .eq('user_id', userId);

    // Set new default
    const { error } = await supabase
        .from('saved_cards')
        .update({ is_default: true })
        .eq('id', cardId);

    return !error;
};

// =====================================================
// PAYMENT HISTORY
// =====================================================

export const getPaymentsByUser = async (userId: string): Promise<Payment[]> => {
    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .or(`user_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching payments:', error);
        return [];
    }

    return data.map(mapPaymentFromDb);
};

export const getPaymentById = async (paymentId: string): Promise<Payment | null> => {
    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

    if (error) {
        console.error('Error fetching payment:', error);
        return null;
    }

    return mapPaymentFromDb(data);
};

export const updatePaymentStatus = async (
    paymentId: string,
    status: Payment['status']
): Promise<Payment | null> => {
    const updates: any = {
        status,
        updated_at: new Date().toISOString()
    };

    if (status === 'approved') {
        updates.paid_at = new Date().toISOString();
    } else if (status === 'refunded') {
        updates.refunded_at = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', paymentId)
        .select()
        .single();

    if (error) {
        console.error('Error updating payment status:', error);
        return null;
    }

    return mapPaymentFromDb(data);
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const generatePixCode = (amount: number): string => {
    const randomPart = Math.random().toString(36).substring(2, 18).toUpperCase();
    const amountStr = (amount * 100).toFixed(0).padStart(10, '0');
    return `00020126580014BR.GOV.BCB.PIX0136${randomPart}5204000053039865802BR5913VELOCITY6008SAOPAULO62070503***${amountStr}6304`;
};

const generateBoletoCode = (amount: number): string => {
    const bank = '237'; // Bradesco
    const amountStr = (amount * 100).toFixed(0).padStart(10, '0');
    const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `${bank}93.38128 60000.${random.slice(0, 6)} 00000.000${random.slice(6)} ${Math.floor(Math.random() * 9) + 1} ${amountStr}`;
};

const generateQRCode = async (data: string): Promise<string> => {
    // In production, use a QR code library
    // For now, return a placeholder
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
};

const validateCard = (card: CardData): boolean => {
    // Basic Luhn validation
    const number = card.number.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(number)) return false;

    let sum = 0;
    let isEven = false;

    for (let i = number.length - 1; i >= 0; i--) {
        let digit = parseInt(number[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
};

const detectCardBrand = (number: string): string => {
    const cleaned = number.replace(/\s/g, '');

    if (/^4/.test(cleaned)) return 'Visa';
    if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
    if (/^3[47]/.test(cleaned)) return 'Amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'Discover';
    if (/^(?:2131|1800|35)/.test(cleaned)) return 'JCB';
    if (/^3(?:0[0-5]|[68])/.test(cleaned)) return 'Diners';
    if (/^636368|636369|5067|4576|4011/.test(cleaned)) return 'Elo';
    if (/^606282|384100|384140|384160/.test(cleaned)) return 'Hipercard';

    return 'Unknown';
};

// =====================================================
// MAPPERS
// =====================================================

const mapPaymentFromDb = (data: any): Payment => ({
    id: data.id,
    userId: data.user_id,
    receiverId: data.receiver_id,
    rentalId: data.rental_id,
    serviceRequestId: data.service_request_id,
    amount: parseFloat(data.amount),
    currency: data.currency || 'BRL',
    method: data.method,
    status: data.status,
    externalId: data.external_id,
    gateway: data.gateway,
    pixCode: data.pix_code,
    pixQrcode: data.pix_qrcode,
    pixKey: data.pix_key,
    boletoCode: data.boleto_code,
    boletoUrl: data.boleto_url,
    boletoBarcode: data.boleto_barcode,
    boletoDueDate: data.boleto_due_date,
    cardLastDigits: data.card_last_digits,
    cardBrand: data.card_brand,
    cardHolder: data.card_holder,
    installments: data.installments,
    installmentValue: data.installment_value ? parseFloat(data.installment_value) : undefined,
    description: data.description,
    referenceType: data.reference_type,
    referenceId: data.reference_id,
    paidAt: data.paid_at,
    expiresAt: data.expires_at,
    refundedAt: data.refunded_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at
});

const mapSavedCardFromDb = (data: any): SavedCard => ({
    id: data.id,
    userId: data.user_id,
    token: data.token,
    gateway: data.gateway,
    brand: data.brand,
    lastDigits: data.last_digits,
    holderName: data.holder_name,
    expiryMonth: data.expiry_month,
    expiryYear: data.expiry_year,
    isDefault: data.is_default,
    isActive: data.is_active,
    nickname: data.nickname,
    lastUsedAt: data.last_used_at,
    createdAt: data.created_at
});

// =====================================================
// INSTALLMENT CALCULATOR
// =====================================================

export interface InstallmentOption {
    installments: number;
    installmentValue: number;
    totalValue: number;
    interestRate: number;
    label: string;
}

export const calculateInstallments = (amount: number, maxInstallments: number = 12): InstallmentOption[] => {
    const options: InstallmentOption[] = [];

    for (let i = 1; i <= maxInstallments; i++) {
        // Interest rates (simulated)
        let interestRate = 0;
        if (i > 6) interestRate = 0.0199; // 1.99% per month for > 6x
        else if (i > 3) interestRate = 0.0149; // 1.49% per month for > 3x
        // 1-3x is interest-free

        const totalWithInterest = amount * (1 + interestRate * (i - 1));
        const installmentValue = totalWithInterest / i;

        options.push({
            installments: i,
            installmentValue: Math.ceil(installmentValue * 100) / 100,
            totalValue: Math.ceil(totalWithInterest * 100) / 100,
            interestRate: interestRate * 100,
            label: i === 1
                ? `À vista - R$ ${amount.toFixed(2)}`
                : interestRate === 0
                    ? `${i}x de R$ ${installmentValue.toFixed(2)} sem juros`
                    : `${i}x de R$ ${installmentValue.toFixed(2)} (${(interestRate * 100).toFixed(2)}% a.m.)`
        });
    }

    return options;
};
