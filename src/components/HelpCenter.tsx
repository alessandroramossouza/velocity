import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Search, MessageCircle, Mail, Phone, FileText, Shield, DollarSign, Car, Clock } from 'lucide-react';

interface FAQItem {
    question: string;
    answer: string;
    category: string;
}

const faqData: FAQItem[] = [
    // Aluguéis
    {
        category: 'Aluguéis',
        question: 'Como faço para alugar um carro?',
        answer: 'É simples! Navegue pelo Marketplace, escolha o veículo desejado, selecione as datas de início e fim, e clique em "Alugar Agora". Você será guiado pelo processo de confirmação.'
    },
    {
        category: 'Aluguéis',
        question: 'Preciso ter CNH para alugar?',
        answer: 'Sim, é obrigatório ter uma CNH válida. Você precisará fazer a verificação de identidade (KYC) antes do primeiro aluguel, enviando foto da sua CNH e uma selfie.'
    },
    {
        category: 'Aluguéis',
        question: 'Posso cancelar uma reserva?',
        answer: 'Sim. Cancelamentos feitos até 48h antes do início não geram taxas. Entre 24-48h, há taxa de 30%. Com menos de 24h, a taxa é de 50% do valor total.'
    },
    {
        category: 'Aluguéis',
        question: 'O que está incluído no aluguel?',
        answer: 'O aluguel inclui o uso do veículo, seguro básico e assistência 24h. Combustível, pedágios e multas são de responsabilidade do locatário.'
    },
    // Pagamentos
    {
        category: 'Pagamentos',
        question: 'Quais formas de pagamento são aceitas?',
        answer: 'Aceitamos cartões de crédito (Visa, Mastercard, Elo), cartões de débito, PIX e boleto bancário (com antecedência mínima de 3 dias).'
    },
    {
        category: 'Pagamentos',
        question: 'Quando sou cobrado pelo aluguel?',
        answer: 'A cobrança é feita no momento da confirmação da reserva. Para cartões, pode aparecer como pré-autorização inicialmente.'
    },
    {
        category: 'Pagamentos',
        question: 'Como funciona o reembolso?',
        answer: 'Reembolsos são processados em até 7 dias úteis para cartões de crédito e até 3 dias úteis para PIX, na mesma conta de origem.'
    },
    // Proprietários
    {
        category: 'Proprietários',
        question: 'Como cadastro meu veículo?',
        answer: 'Acesse o Dashboard do Proprietário, clique em "Adicionar Veículo" e preencha as informações solicitadas. Nossa IA ajudará a definir preço e descrição otimizados.'
    },
    {
        category: 'Proprietários',
        question: 'Qual a comissão da plataforma?',
        answer: 'A VeloCity cobra uma taxa de serviço de 15% sobre cada aluguel concluído. Não há custos para listar seu veículo.'
    },
    {
        category: 'Proprietários',
        question: 'E se houver danos ao meu veículo?',
        answer: 'Todos os aluguéis incluem seguro básico. Em caso de danos, você deve reportar em até 24h com fotos. A seguradora parceira avaliará e você receberá a indenização.'
    },
    // Segurança
    {
        category: 'Segurança',
        question: 'Como funciona a verificação de identidade?',
        answer: 'Utilizamos verificação KYC (Know Your Customer) com validação de CNH e reconhecimento facial. Isso garante a segurança de locadores e locatários.'
    },
    {
        category: 'Segurança',
        question: 'Meus dados estão seguros?',
        answer: 'Sim! Utilizamos criptografia de ponta a ponta e seguimos as normas da LGPD. Seus dados nunca são compartilhados com terceiros sem consentimento.'
    },
    {
        category: 'Segurança',
        question: 'O que fazer em caso de acidente?',
        answer: 'Ligue para nossa central 24h (0800-123-4567). Registre um boletim de ocorrência se necessário. Não mova o veículo sem orientação, exceto por segurança.'
    }
];

const categories = ['Todos', 'Aluguéis', 'Pagamentos', 'Proprietários', 'Segurança'];

export const HelpCenter: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const filteredFAQ = faqData.filter(item => {
        const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'Aluguéis':
                return <Car className="w-5 h-5" />;
            case 'Pagamentos':
                return <DollarSign className="w-5 h-5" />;
            case 'Proprietários':
                return <FileText className="w-5 h-5" />;
            case 'Segurança':
                return <Shield className="w-5 h-5" />;
            default:
                return <HelpCircle className="w-5 h-5" />;
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HelpCircle className="w-10 h-10 text-indigo-600" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Central de Ajuda</h1>
                <p className="text-slate-500 max-w-md mx-auto">
                    Encontre respostas para suas dúvidas ou entre em contato com nosso suporte.
                </p>
            </div>

            {/* Search */}
            <div className="max-w-2xl mx-auto">
                <div className="relative">
                    <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar nas perguntas frequentes..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
                    />
                </div>
            </div>

            {/* Category Pills */}
            <div className="flex justify-center gap-2 flex-wrap">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${selectedCategory === cat
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {cat !== 'Todos' && getCategoryIcon(cat)}
                        {cat}
                    </button>
                ))}
            </div>

            {/* FAQ List */}
            <div className="max-w-3xl mx-auto space-y-3">
                {filteredFAQ.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">Nenhuma pergunta encontrada. Tente outra busca.</p>
                    </div>
                ) : (
                    filteredFAQ.map((item, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
                        >
                            <button
                                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 transition"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${selectedCategory === 'Todos' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                                        {getCategoryIcon(item.category)}
                                    </div>
                                    <span className="font-medium text-slate-800">{item.question}</span>
                                </div>
                                {expandedIndex === index ? (
                                    <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                                )}
                            </button>
                            {expandedIndex === index && (
                                <div className="px-5 pb-5 pt-0 text-slate-600 animate-fade-in">
                                    <div className="pl-12 border-l-2 border-indigo-200 ml-4">
                                        <p className="leading-relaxed">{item.answer}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Contact Section */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white text-center">
                <h2 className="text-2xl font-bold mb-2">Ainda tem dúvidas?</h2>
                <p className="text-indigo-100 mb-6">Nossa equipe está pronta para ajudar você.</p>

                <div className="flex flex-wrap justify-center gap-4">
                    <a
                        href="mailto:suporte@velocity.com"
                        className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-medium hover:bg-indigo-50 transition"
                    >
                        <Mail className="w-5 h-5" />
                        suporte@velocity.com
                    </a>
                    <a
                        href="tel:08001234567"
                        className="flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition border border-white/30"
                    >
                        <Phone className="w-5 h-5" />
                        0800-123-4567
                    </a>
                    <button className="flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition border border-white/30">
                        <MessageCircle className="w-5 h-5" />
                        Chat ao Vivo
                    </button>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2 text-indigo-200 text-sm">
                    <Clock className="w-4 h-4" />
                    Atendimento 24 horas, 7 dias por semana
                </div>
            </div>
        </div>
    );
};
