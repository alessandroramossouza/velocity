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
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // ===============================================
        // ESTRATÉGIA ULTRA MEGA FORÇA: CAPA DEDICADA
        // ===============================================
        // Insere uma nova página em branco no início (Capa)
        const coverPage = pdfDoc.insertPage(0, [595, 842]); // A4
        const { width, height } = coverPage.getSize();
        let y = height - 50;

        // 1. Cabeçalho da Capa
        coverPage.drawText('TERMO DE ADESÃO AO CONTRATO DE LOCAÇÃO', {
            x: 50,
            y,
            size: 16,
            font: boldFont,
            color: rgb(0.1, 0.1, 0.3),
        });
        y -= 25;
        coverPage.drawText('Velocity - Aluguel de Carros Inteligente', {
            x: 50,
            y,
            size: 10,
            font,
            color: rgb(0.5, 0.5, 0.5),
        });
        y -= 40;

        // 2. Dados do Veículo (Box)
        coverPage.drawText('1. VEÍCULO LOCADO', { x: 50, y, size: 12, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
        y -= 20;
        coverPage.drawText(`Marca/Modelo: ${car.make} ${car.model}`, { x: 50, y, size: 10, font });
        y -= 15;
        coverPage.drawText(`Ano: ${car.year} | Categoria: ${car.category}`, { x: 50, y, size: 10, font });
        y -= 15;
        coverPage.drawText(`Valor da Diária: R$ ${car.pricePerDay.toFixed(2)}`, { x: 50, y, size: 10, font });
        y -= 30;

        // 3. Dados do Locatário (Box com mais detalhes)
        coverPage.drawText('2. DADOS DO LOCATÁRIO (Identificação)', { x: 50, y, size: 12, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
        y -= 20;
        coverPage.drawText(`Nome Completo: ${user.name}`, { x: 50, y, size: 10, font });
        y -= 15;
        coverPage.drawText(`E-mail: ${user.email}`, { x: 50, y, size: 10, font });
        y -= 15;
        // Tenta pegar dados estendidos se existirem no objeto user
        const cpf = (user as any).cpf || 'N/A';
        const rg = (user as any).rg || 'N/A';
        const address = (user as any).address || 'Endereço não informado';
        const city = (user as any).city || '';
        const state = (user as any).state || '';

        coverPage.drawText(`CPF: ${cpf} | RG: ${rg}`, { x: 50, y, size: 10, font });
        y -= 15;
        coverPage.drawText(`Endereço: ${address} - ${city}/${state}`, { x: 50, y, size: 10, font });
        y -= 30;

        // 4. Detalhes da Locação
        coverPage.drawText('3. DETALHES DA LOCAÇÃO', { x: 50, y, size: 12, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
        y -= 20;
        coverPage.drawText(`Data de Retirada: ${new Date(rental.startDate).toLocaleDateString('pt-BR')}`, { x: 50, y, size: 10, font });
        y -= 15;
        coverPage.drawText(`Data de Devolução: ${new Date(rental.endDate).toLocaleDateString('pt-BR')}`, { x: 50, y, size: 10, font });
        y -= 15;
        coverPage.drawText(`Total Estimado: R$ ${rental.totalPrice.toFixed(2)}`, { x: 50, y, size: 12, font: boldFont, color: rgb(0, 0.6, 0) });
        y -= 40;

        // 5. Declaração
        const declaration = 'Declaro que li e concordo com todos os termos do contrato anexo a seguir, bem como confirmo a veracidade dos dados acima prestados.';
        coverPage.drawText(declaration, {
            x: 50,
            y,
            size: 9,
            font,
            color: rgb(0.3, 0.3, 0.3),
            maxWidth: 500,
            lineHeight: 12
        });

        // Rodapé da capa
        const footerY = 50;
        coverPage.drawLine({
            start: { x: 50, y: footerY + 10 },
            end: { x: width - 50, y: footerY + 10 },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
        });
        coverPage.drawText(`Identificador da Locação: ${rental.id || 'N/A'}`, { x: 50, y: footerY, size: 8, font, color: rgb(0.6, 0.6, 0.6) });
        coverPage.drawText(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { x: width - 200, y: footerY, size: 8, font, color: rgb(0.6, 0.6, 0.6) });


        // ===============================================
        // MARCA D'ÁGUA EM TODAS AS PÁGINAS SEGUINTES
        // ===============================================
        const totalPages = pdfDoc.getPageCount();
        for (let i = 1; i < totalPages; i++) {
            const page = pdfDoc.getPage(i);
            const { width: pWidth } = page.getSize();

            // Adiciona um rodapé discreto indicando que é parte do contrato assinado pelo locatário
            page.drawText(`Anexo - Contrato Locação - ${user.name} - ${new Date().toLocaleDateString('pt-BR')}`, {
                x: 30,
                y: 20,
                size: 8,
                font,
                color: rgb(0.5, 0.5, 0.5),
            });
        }

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
 * Gera um PDF de contrato padrão usando o texto jurídico completo fornecido
 */
export async function generateDefaultContract(
    car: Car,
    user: User,
    rental: { startDate: string; endDate: string; totalPrice: number }
): Promise<{ pdfBytes: Uint8Array; pdfBlob: Blob }> {

    // 1. Buscar dados do Proprietário (Locador) para preencher o contrato
    let ownerName = "LOCADOR NOME";
    let ownerDoc = "CPF/RG";
    let ownerAddress = "Endereço do Locador";
    let ownerCity = "Cidade"; // Escopo Global para a função

    if (car.ownerId) {
        const { data: ownerData } = await supabase
            .from('users')
            .select('*')
            .eq('id', car.ownerId)
            .single();

        if (ownerData) {
            ownerName = ownerData.name;
            ownerDoc = `CPF ${ownerData.cpf || 'N/A'} - RG ${ownerData.rg || 'N/A'}`;
            ownerAddress = `${ownerData.address || ''}, ${ownerData.number || ''} - ${ownerData.city || ''}/${ownerData.state || ''}`;
            ownerCity = ownerData.city || "Cidade";
        }
    }

    // 2. Preparar Dados
    const renterName = user.name.toUpperCase();
    const renterDoc = `RG ${user.rg || 'N/A'} SSP/SP, CPF ${user.cpf || 'N/A'}`;
    const renterAddress = `${user.address || ''}, ${user.number || ''} - ${user.neighborhood || ''}, CEP: ${user.cep || ''}, ${user.city || ''}/${user.state || ''}`;

    const carDesc = `${car.make.toUpperCase()}/${car.model.toUpperCase()} ${car.year}`;
    // Como não temos placa no objeto Car, vamos usar um placeholder ou se tiver num futuro update
    const carPlaca = "ABC-1234"; // Placeholder ou futuro campo
    const carColor = "A DEFINIR";

    const startDate = new Date(rental.startDate);
    const endDate = new Date(rental.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const valorTotal = rental.totalPrice.toFixed(2);
    // Calculo semanal aproximado apenas para preencher o texto (divisão simples)

    const today = new Date();
    const formattedDate = `${today.getDate()} de ${today.toLocaleString('pt-BR', { month: 'long' })} de ${today.getFullYear()}`;


    // 3. Criar PDF
    const pdfDoc = await PDFDocument.create();
    // Função helper para adicionar páginas conforme texto enche
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    let y = height - 50;
    const margin = 50;
    const maxWid = width - (margin * 2);

    // Helper para quebrar linhas e paginação
    const writeText = (text: string, size: number, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left', color = rgb(0, 0, 0)) => {
        const textFont = isBold ? boldFont : font;
        const words = text.split(' ');
        let line = '';
        const lineHeight = size * 1.4;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const testWidth = textFont.widthOfTextAtSize(testLine, size);

            if (testWidth > maxWid && n > 0) {
                // Imprime a linha
                const lineWidth = textFont.widthOfTextAtSize(line, size);
                let xPos = margin;
                if (align === 'center') xPos = (width - lineWidth) / 2;
                if (align === 'right') xPos = width - margin - lineWidth;

                page.drawText(line, { x: xPos, y, size, font: textFont, color });
                y -= lineHeight;
                line = words[n] + ' ';

                // Nova página se necessario
                if (y < 50) {
                    page = pdfDoc.addPage([595, 842]);
                    y = height - 50;
                }
            } else {
                line = testLine;
            }
        }
        // Última linha
        const lineWidth = textFont.widthOfTextAtSize(line, size);
        let xPos = margin;
        if (align === 'center') xPos = (width - lineWidth) / 2;
        if (align === 'right') xPos = width - margin - lineWidth;

        page.drawText(line, { x: xPos, y, size, font: textFont, color });
        y -= lineHeight;
    };

    const addSpace = (amount: number) => {
        y -= amount;
        if (y < 50) {
            page = pdfDoc.addPage([595, 842]);
            y = height - 50;
        }
    };

    // ================== CONTEÚDO DO CONTRATO ==================

    // Título
    writeText('CONTRATO DE LOCAÇÃO DE VEÍCULO', 14, true, 'center');
    addSpace(20);

    // Preâmbulo
    writeText('Pelo presente instrumento particular de locação veicular por prazo determinado, celebram as partes abaixo qualificadas:', 10);
    addSpace(10);

    writeText(`LOCADOR: ${ownerName.toUpperCase()}, brasileiro(a), portador(a) do ${ownerDoc}, residente e domiciliado na ${ownerAddress}.`, 10, true);
    addSpace(5);
    writeText(`LOCATÁRIO: ${renterName}, brasileiro(a), ${renterDoc}, residente e domiciliado na ${renterAddress}.`, 10, true);
    addSpace(10);

    writeText('As partes acima identificadas têm entre si justo e acertado o presente contrato de locação de veículo, ficando desde já aceito nas cláusulas e condições abaixo descritas:', 10);
    addSpace(15);

    // Cláusula 1
    writeText('CLÁUSULA 1ª – DO OBJETO', 11, true);
    writeText(`O primeiro compromitente, neste instrumento denominado LOCADOR, como legítimo proprietário do veículo ${carDesc}, placa ${carPlaca}, cor ${carColor}, estando o mesmo devidamente livre e desembaraçado de quaisquer ônus, ALUGAM neste ato ao segundo compromitente, LOCATÁRIO, pelo período de ${diffDays} dias, iniciando em ${new Date(rental.startDate).toLocaleDateString('pt-BR')} e encerrando em ${new Date(rental.endDate).toLocaleDateString('pt-BR')}.`, 10);
    addSpace(10);

    // Cláusula 2
    writeText('CLÁUSULA 2ª – DO PRAZO E VALOR DO ALUGUEL', 11, true);
    writeText(`O valor ajustado pelo presente aluguel total é de R$ ${valorTotal} (${diffDays} dias). Pagamento via Pix ou transferência na data da posse.`, 10);
    addSpace(10);

    // Cláusula 3
    writeText('CLÁUSULA 3ª – DO VALOR DA CAUÇÃO (GARANTIA)', 11, true);
    writeText('§ 1°. O LOCATÁRIO deverá entregar ao LOCADOR a título de caução (garantia) o valor estipulado pelo Locador (caso aplicável), destinado a cobrir eventuais despesas, danos ou multas.', 10);
    writeText('§ 4°. Ao término do contrato e após a vistoria de devolução, não havendo débitos, o valor da caução será restituído.', 10);
    addSpace(10);

    // Cláusula 4
    writeText('CLÁUSULA 4ª – DO ATRASO NO PAGAMENTO E JUROS', 11, true);
    writeText('§ 1º. O não pagamento do aluguel no prazo estipulado constituirá o LOCATÁRIO em mora, incidindo multa de 10% e juros legais.', 10);
    writeText('§ 2°. Atrasos superiores a 7 dias permitem a rescisão imediata e recolhimento do veículo.', 10);
    addSpace(10);

    // Cláusula 5
    writeText('CLÁUSULA 5ª – DA UTILIZAÇÃO DO VEICULO', 11, true);
    writeText('O veículo deverá ser utilizado pelo LOCATÁRIO exclusivamente de acordo com sua natureza e respeitando as leis de trânsito.', 10);
    writeText('§ 4º. O LOCATÁRIO declara estar ciente que quaisquer danos causados, materiais ou pessoais, serão de sua integral responsabilidade a partir da data de retirada.', 10);
    addSpace(10);

    // Cláusula 6
    writeText('CLAUSULA 6ª – DAS MULTAS E INFRAÇÕES', 11, true);
    writeText(`Fica o LOCATÁRIO, a partir de ${new Date(rental.startDate).toLocaleDateString('pt-BR')}, responsável pelas multas de trânsito cometidas na vigência do contrato, incluindo pontuação e valores.`, 10);
    addSpace(10);

    // Cláusula 7
    writeText('CLÁUSULA 7ª – DA VEDAÇÃO À SUBLOCAÇÃO', 11, true);
    writeText('É vedada a sublocação, empréstimo ou cessão do veículo a terceiros sem expressa anuência do LOCADOR, sob pena de rescisão e multa.', 10);
    addSpace(10);

    // Cláusula 8, 9, 10 (Resumidas para caber na lógica, mas mantendo o teor jurídico)
    writeText('CLÁUSULA 8ª – DEVERES E PENALIDADES', 11, true);
    writeText('O LOCATÁRIO deve pagar o aluguel em dia, zelar pelo veículo e devolvê-lo no estado recebido. O descumprimento gera multa de 50% do valor do contrato.', 10);
    addSpace(10);

    writeText('CLÁUSULA 11ª – DO FORO', 11, true);
    writeText('Fica eleito o foro da comarca da cidade do LOCADOR para dirimir dúvidas deste contrato.', 10);
    addSpace(20);

    writeText(`Local e Data: ${ownerCity}, ${formattedDate}.`, 10, false, 'right');
    addSpace(40);

    // Assinaturas
    const sigLineY = y;

    // Locador
    page.drawLine({ start: { x: 50, y: sigLineY }, end: { x: 250, y: sigLineY }, thickness: 1 });
    page.drawText(ownerName.toUpperCase().substring(0, 30), { x: 50, y: sigLineY - 15, size: 8, font });
    page.drawText('LOCADOR', { x: 50, y: sigLineY - 25, size: 8, font: boldFont });

    // Locatário
    page.drawLine({ start: { x: 300, y: sigLineY }, end: { x: 500, y: sigLineY }, thickness: 1 });
    page.drawText(renterName.substring(0, 30), { x: 300, y: sigLineY - 15, size: 8, font });
    page.drawText('LOCATÁRIO (Assinatura Digital)', { x: 300, y: sigLineY - 25, size: 8, font: boldFont });


    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes.buffer.slice(0) as ArrayBuffer], { type: 'application/pdf' });

    return { pdfBytes, pdfBlob };
}
