import { supabase } from '../lib/supabase';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Car, User, Rental, SignedContract } from '../types';

// ========================================
// CONTRACT SERVICE - Gerenciamento de Contratos PDF
// ========================================

/**
 * Upload do template de contrato PDF pelo locador
 */
export async function uploadContractTemplate(carId: string, file: File): Promise<string | null> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `contract_${carId}_${Date.now()}.${fileExt}`;
        const filePath = `templates/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('contracts')
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            console.error('Error uploading contract template:', uploadError);
            return null;
        }

        const { data } = supabase.storage.from('contracts').getPublicUrl(filePath);

        // Atualiza o carro com a URL do contrato
        const { error: updateError } = await supabase
            .from('cars')
            .update({ contract_pdf_url: data.publicUrl })
            .eq('id', carId);

        if (updateError) {
            console.error('Error updating car with contract URL:', updateError);
        }

        return data.publicUrl;
    } catch (error) {
        console.error('Error in uploadContractTemplate:', error);
        return null;
    }
}

/**
 * Busca o PDF original e preenche com dados do locatário
 */
export async function generateFilledContract(
    car: Car,
    user: User,
    rental: { startDate: string; endDate: string; totalPrice: number }
): Promise<{ pdfBytes: Uint8Array; pdfBlob: Blob } | null> {
    try {
        if (!car.contractPdfUrl) {
            console.warn('Car does not have a contract PDF');
            return null;
        }

        // Baixa o PDF original
        const response = await fetch(car.contractPdfUrl);
        const pdfBytes = await response.arrayBuffer();

        // Carrega o PDF com pdf-lib
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Dados para substituição
        const replacements: Record<string, string> = {
            '{{NOME_LOCATARIO}}': user.name,
            '{{EMAIL_LOCATARIO}}': user.email,
            '{{CPF_LOCATARIO}}': (user as any).cpf || 'Não informado',
            '{{VEICULO}}': `${car.make} ${car.model} ${car.year}`,
            '{{MARCA}}': car.make,
            '{{MODELO}}': car.model,
            '{{ANO}}': String(car.year),
            '{{CATEGORIA}}': car.category,
            '{{DATA_INICIO}}': new Date(rental.startDate).toLocaleDateString('pt-BR'),
            '{{DATA_FIM}}': new Date(rental.endDate).toLocaleDateString('pt-BR'),
            '{{VALOR_TOTAL}}': `R$ ${rental.totalPrice.toFixed(2)}`,
            '{{VALOR_DIARIA}}': `R$ ${car.pricePerDay.toFixed(2)}`,
            '{{DATA_ASSINATURA}}': new Date().toLocaleDateString('pt-BR'),
            '{{HORA_ASSINATURA}}': new Date().toLocaleTimeString('pt-BR'),
        };

        // Para cada página, adiciona uma camada de texto com os dados preenchidos
        // (Como pdf-lib não substitui texto inline facilmente, vamos adicionar um footer/header com dados)
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();

        // Adiciona bloco de dados do locatário no rodapé da primeira página
        const dataBlock = `
DADOS DO LOCATÁRIO:
Nome: ${user.name}
E-mail: ${user.email}
Veículo: ${car.make} ${car.model} ${car.year}
Período: ${new Date(rental.startDate).toLocaleDateString('pt-BR')} a ${new Date(rental.endDate).toLocaleDateString('pt-BR')}
Valor Total: R$ ${rental.totalPrice.toFixed(2)}
Data/Hora da Assinatura: ${new Date().toLocaleString('pt-BR')}
    `.trim();

        // Desenha um retângulo de fundo
        firstPage.drawRectangle({
            x: 30,
            y: 30,
            width: width - 60,
            height: 120,
            color: rgb(0.95, 0.95, 0.95),
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 1,
        });

        // Adiciona o texto dos dados
        const lines = dataBlock.split('\n');
        lines.forEach((line, index) => {
            firstPage.drawText(line, {
                x: 40,
                y: 130 - (index * 14),
                size: 10,
                font: index === 0 ? boldFont : font,
                color: rgb(0.1, 0.1, 0.1),
            });
        });

        // Salva o PDF modificado
        const modifiedPdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([modifiedPdfBytes.buffer.slice(0) as ArrayBuffer], { type: 'application/pdf' });

        return { pdfBytes: modifiedPdfBytes, pdfBlob };
    } catch (error) {
        console.error('Error generating filled contract:', error);
        return null;
    }
}

/**
 * Adiciona a assinatura ao PDF e salva
 */
export async function addSignatureToPdf(
    pdfBytes: Uint8Array,
    signatureDataUrl: string
): Promise<Uint8Array | null> {
    try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        const { width, height } = lastPage.getSize();

        // Converte a assinatura de data URL para bytes
        const signatureImageBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());

        // Tenta embedar como PNG (assinaturas do canvas são PNG)
        let signatureImage;
        try {
            signatureImage = await pdfDoc.embedPng(signatureImageBytes);
        } catch {
            // Se falhar, tenta como JPEG
            signatureImage = await pdfDoc.embedJpg(signatureImageBytes);
        }

        // Dimensões da assinatura
        const signatureDims = signatureImage.scale(0.3);

        // Adiciona label "Assinatura Digital:"
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        lastPage.drawText('Assinatura Digital do Locatário:', {
            x: width / 2 - 100,
            y: 200,
            size: 12,
            font,
            color: rgb(0.2, 0.2, 0.2),
        });

        // Adiciona a assinatura
        lastPage.drawImage(signatureImage, {
            x: width / 2 - signatureDims.width / 2,
            y: 160 - signatureDims.height,
            width: signatureDims.width,
            height: signatureDims.height,
        });

        // Adiciona linha de assinatura
        lastPage.drawLine({
            start: { x: width / 2 - 100, y: 155 },
            end: { x: width / 2 + 100, y: 155 },
            thickness: 1,
            color: rgb(0.3, 0.3, 0.3),
        });

        return await pdfDoc.save();
    } catch (error) {
        console.error('Error adding signature to PDF:', error);
        return null;
    }
}

/**
 * Salva o contrato assinado no Storage e registra no banco
 */
export async function saveSignedContract(
    rental: Rental,
    car: Car,
    user: User,
    signedPdfBytes: Uint8Array,
    signatureDataUrl: string
): Promise<SignedContract | null> {
    try {
        // 1. Upload do PDF assinado
        const fileName = `signed_${rental.id}_${Date.now()}.pdf`;
        const filePath = `signed/${fileName}`;
        const pdfBlob = new Blob([signedPdfBytes.buffer.slice(0) as ArrayBuffer], { type: 'application/pdf' });

        const { error: uploadError } = await supabase.storage
            .from('contracts')
            .upload(filePath, pdfBlob);

        if (uploadError) {
            console.error('Error uploading signed contract:', uploadError);
            return null;
        }

        const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(filePath);

        // 2. Registra no banco de dados
        const contractData = {
            rental_id: rental.id,
            car_id: car.id,
            renter_id: user.id,
            owner_id: car.ownerId,
            original_pdf_url: car.contractPdfUrl,
            signed_pdf_url: urlData.publicUrl,
            signature_data: signatureDataUrl,
            renter_name: user.name,
            renter_email: user.email,
            car_info: `${car.make} ${car.model} ${car.year}`,
            rental_start_date: rental.startDate,
            rental_end_date: rental.endDate,
            total_price: rental.totalPrice,
            ip_address: await getClientIP(),
            user_agent: navigator.userAgent,
        };

        const { data, error } = await supabase
            .from('signed_contracts')
            .insert(contractData)
            .select()
            .single();

        if (error) {
            console.error('Error saving signed contract record:', error);
            return null;
        }

        return {
            id: data.id,
            rentalId: data.rental_id,
            carId: data.car_id,
            renterId: data.renter_id,
            ownerId: data.owner_id,
            originalPdfUrl: data.original_pdf_url,
            signedPdfUrl: data.signed_pdf_url,
            signatureData: data.signature_data,
            renterName: data.renter_name,
            renterEmail: data.renter_email,
            carInfo: data.car_info,
            rentalStartDate: data.rental_start_date,
            rentalEndDate: data.rental_end_date,
            totalPrice: data.total_price,
            signedAt: data.signed_at,
            ipAddress: data.ip_address,
            userAgent: data.user_agent,
        };
    } catch (error) {
        console.error('Error in saveSignedContract:', error);
        return null;
    }
}

/**
 * Busca contratos assinados por rental ID
 */
export async function getSignedContract(rentalId: string): Promise<SignedContract | null> {
    const { data, error } = await supabase
        .from('signed_contracts')
        .select('*')
        .eq('rental_id', rentalId)
        .single();

    if (error || !data) return null;

    return {
        id: data.id,
        rentalId: data.rental_id,
        carId: data.car_id,
        renterId: data.renter_id,
        ownerId: data.owner_id,
        originalPdfUrl: data.original_pdf_url,
        signedPdfUrl: data.signed_pdf_url,
        signatureData: data.signature_data,
        renterName: data.renter_name,
        renterEmail: data.renter_email,
        carInfo: data.car_info,
        rentalStartDate: data.rental_start_date,
        rentalEndDate: data.rental_end_date,
        totalPrice: data.total_price,
        signedAt: data.signed_at,
        ipAddress: data.ip_address,
        userAgent: data.user_agent,
    };
}

/**
 * Utilitário: Obtém IP do cliente (para validade jurídica)
 */
async function getClientIP(): Promise<string> {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'unknown';
    }
}

/**
 * Gera um PDF de contrato padrão caso o locador não tenha enviado um customizado
 */
export async function generateDefaultContract(
    car: Car,
    user: User,
    rental: { startDate: string; endDate: string; totalPrice: number }
): Promise<{ pdfBytes: Uint8Array; pdfBlob: Blob }> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    let y = height - 50;

    // Header
    page.drawText('CONTRATO DE LOCAÇÃO DE VEÍCULO', {
        x: width / 2 - 140,
        y,
        size: 18,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.3),
    });
    y -= 40;

    // Linha divisória
    page.drawLine({
        start: { x: 50, y },
        end: { x: width - 50, y },
        thickness: 2,
        color: rgb(0.3, 0.3, 0.6),
    });
    y -= 30;

    // Dados do veículo
    page.drawText('DADOS DO VEÍCULO', { x: 50, y, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    y -= 25;
    page.drawText(`Veículo: ${car.make} ${car.model}`, { x: 50, y, size: 11, font });
    y -= 18;
    page.drawText(`Ano: ${car.year}`, { x: 50, y, size: 11, font });
    y -= 18;
    page.drawText(`Categoria: ${car.category}`, { x: 50, y, size: 11, font });
    y -= 18;
    page.drawText(`Diária: R$ ${car.pricePerDay.toFixed(2)}`, { x: 50, y, size: 11, font });
    y -= 35;

    // Dados do locatário
    page.drawText('DADOS DO LOCATÁRIO', { x: 50, y, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    y -= 25;
    page.drawText(`Nome: ${user.name}`, { x: 50, y, size: 11, font });
    y -= 18;
    page.drawText(`E-mail: ${user.email}`, { x: 50, y, size: 11, font });
    y -= 35;

    // Dados da locação
    page.drawText('DADOS DA LOCAÇÃO', { x: 50, y, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    y -= 25;
    page.drawText(`Início: ${new Date(rental.startDate).toLocaleDateString('pt-BR')}`, { x: 50, y, size: 11, font });
    y -= 18;
    page.drawText(`Término: ${new Date(rental.endDate).toLocaleDateString('pt-BR')}`, { x: 50, y, size: 11, font });
    y -= 18;
    page.drawText(`Valor Total: R$ ${rental.totalPrice.toFixed(2)}`, { x: 50, y, size: 12, font: boldFont, color: rgb(0, 0.5, 0) });
    y -= 40;

    // Termos
    page.drawText('TERMOS E CONDIÇÕES', { x: 50, y, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    y -= 25;
    const terms = [
        '1. O locatário se compromete a devolver o veículo na data acordada.',
        '2. Qualquer dano ao veículo durante a locação será de responsabilidade do locatário.',
        '3. É proibido o uso do veículo para fins ilícitos.',
        '4. O locatário deve possuir CNH válida e compatível com o veículo.',
        '5. O combustível deve ser reposto ao nível encontrado na retirada.',
        '6. Multas e infrações durante a locação são de responsabilidade do locatário.',
    ];
    terms.forEach(term => {
        page.drawText(term, { x: 50, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
        y -= 16;
    });
    y -= 30;

    // Área de assinatura
    page.drawText('ASSINATURA DO LOCATÁRIO', { x: 50, y, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    y -= 20;
    page.drawText(`Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, { x: 50, y, size: 10, font });
    y -= 80;

    // Linha para assinatura
    page.drawLine({
        start: { x: 50, y },
        end: { x: 300, y },
        thickness: 1,
        color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText('Assinatura Digital', { x: 130, y: y - 15, size: 10, font, color: rgb(0.5, 0.5, 0.5) });

    // Footer
    page.drawText('Documento gerado eletronicamente pela Velocity', {
        x: width / 2 - 110,
        y: 30,
        size: 8,
        font,
        color: rgb(0.6, 0.6, 0.6),
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes.buffer.slice(0) as ArrayBuffer], { type: 'application/pdf' });

    return { pdfBytes, pdfBlob };
}
