export const generateContractHtml = (data: {
    renterName: string;
    renterDoc: string; // CPF/CNH
    ownerName: string;
    carModel: string;
    carPlate: string;
    startDate: string;
    endDate: string;
    totalValue: string;
    dailyRate: string;
}) => {
    const today = new Date().toLocaleDateString('pt-BR');

    return `
    <div style="font-family: 'Times New Roman', serif; line-height: 1.6; color: #000;">
        <h1 style="text-align: center; text-transform: uppercase; font-size: 18px; margin-bottom: 24px;">Contrato de Locação de Veículo Automotor</h1>

        <p><strong>Pelo presente instrumento particular, as partes abaixo qualificadas:</strong></p>

        <p>
            <strong>LOCADOR(A):</strong> ${data.ownerName}, proprietário(a) do veículo objeto deste contrato.<br>
            <strong>LOCATÁRIO(A):</strong> ${data.renterName}, portador(a) do documento nº ${data.renterDoc}.
        </p>

        <p>Têm entre si justo e contratado o seguinte:</p>

        <h3 style="font-size: 14px; margin-top: 20px; text-transform: uppercase;">1. Do Objeto</h3>
        <p>
            1.1. O presente contrato tem como objeto a locação do veículo <strong>${data.carModel}</strong>, 
            placa <strong>${data.carPlate || 'A DEFINIR'}</strong>, de propriedade do LOCADOR, em perfeitas condições de uso e conservação.
        </p>

        <h3 style="font-size: 14px; margin-top: 20px; text-transform: uppercase;">2. Do Prazo e Valores</h3>
        <p>
            2.1. A locação terá início em <strong>${data.startDate}</strong> e término previsto para <strong>${data.endDate}</strong>.<br>
            2.2. O valor total acordado para o período é de <strong>R$ ${data.totalValue}</strong>, sendo a diária de R$ ${data.dailyRate}.<br>
            2.3. O excedente de horas ou dias não previstos acarretará a cobrança de diárias adicionais e multa de 20% sobre o valor excedente.
        </p>

        <h3 style="font-size: 14px; margin-top: 20px; text-transform: uppercase;">3. Das Obrigações do Locatário</h3>
        <p>
            3.1. O LOCATÁRIO compromete-se a:<br>
            a) Utilizar o veículo exclusivamente para fins lícitos e transporte pessoal;<br>
            b) Não sublocar ou emprestar o veículo a terceiros sem autorização expressa;<br>
            c) Devolver o veículo nas mesmas condições de higiene e conservação que o recebeu;<br>
            d) Arcar com todas as multas de trânsito ocorridas no período da locação.<br>
            e) Em caso de sinistro, arcar com a franquia do seguro ou, na inexistência deste, com o valor total dos danos.
        </p>

        <h3 style="font-size: 14px; margin-top: 20px; text-transform: uppercase;">4. Das Disposições Gerais</h3>
        <p>
            4.1. O não cumprimento de qualquer cláusula deste contrato ensejará sua rescisão imediata e aplicação de multa contratual de 30% sobre o valor total.<br>
            4.2. As partes elegem o foro da comarca local para dirimir quaisquer dúvidas oriundas deste contrato.
        </p>

        <div style="margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px;">
            <p>Local e Data: ______________________, ${today}</p>
        </div>
    </div>
    `;
};
