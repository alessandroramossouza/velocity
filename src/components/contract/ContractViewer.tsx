import React, { useState } from 'react';
import { generateContractHtml } from './ContractTemplate';
import { DigitalSignature } from './DigitalSignature';
import { User, Car } from '../../types';
import { CheckSquare, FileText, Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ContractViewerProps {
    renter: User;
    car: Car;
    rentalData: {
        startDate: string;
        endDate: string;
        totalPrice: number;
        days: number;
    };
    onSigned: (signatureUrl: string, contractSnapshot: string) => void;
    onCancel: () => void;
}

export const ContractViewer: React.FC<ContractViewerProps> = ({ renter, car, rentalData, onSigned, onCancel }) => {
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [agreed, setAgreed] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Generate contract content
    const contractHtml = generateContractHtml({
        renterName: renter.name,
        renterDoc: renter.cnhUrl ? 'CNH Verificada' : 'Documento Pendente',
        ownerName: 'VeloCity Parceiro', // Idealmente viria do ownerId
        carModel: `${car.make} ${car.model} ${car.year}`,
        carPlate: 'ABC-1234', // Placeholder se não tiver no objeto car
        startDate: new Date(rentalData.startDate).toLocaleDateString('pt-BR'),
        endDate: new Date(rentalData.endDate).toLocaleDateString('pt-BR'),
        totalValue: rentalData.totalPrice.toFixed(2),
        dailyRate: car.pricePerDay.toFixed(2)
    });

    const handleConfirm = async () => {
        if (!agreed || !signatureData) return;
        setUploading(true);

        try {
            // 1. Upload Signature Image
            const fileName = `sig_${renter.id}_${Date.now()}.png`;
            // Convert Base64 to Blob
            const res = await fetch(signatureData);
            const blob = await res.blob();

            const { error: uploadError } = await supabase.storage
                .from('signatures')
                .upload(fileName, blob);

            if (uploadError) throw uploadError;

            const { data: publicURL } = supabase.storage
                .from('signatures')
                .getPublicUrl(fileName);

            // 2. Callback with URLs
            onSigned(publicURL.publicUrl, contractHtml);

        } catch (error) {
            console.error('Error signing:', error);
            alert('Erro ao salvar assinatura. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[80vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-lg">Contrato de Locação</h3>
                </div>
                <div className="flex items-center gap-2 text-xs bg-slate-800 px-2 py-1 rounded">
                    <Lock className="w-3 h-3 text-green-400" />
                    Ambiente Seguro
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                <div
                    className="bg-white p-8 shadow-sm border border-slate-200 min-h-[500px] text-justify text-slate-800"
                    dangerouslySetInnerHTML={{ __html: contractHtml }}
                />
            </div>

            {/* Footer / Actions */}
            <div className="bg-white p-6 border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
                <div className="max-w-3xl mx-auto space-y-6">

                    {/* Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200">
                        <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition ${agreed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                            {agreed && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <input
                            type="checkbox"
                            className="hidden"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                        />
                        <span className="text-sm text-slate-600">
                            Li e concordo com todos os termos e condições do contrato acima, responsabilizando-me civil e criminalmente pelas informações prestadas.
                        </span>
                    </label>

                    {/* Signature Pad */}
                    {agreed && (
                        <div className="animate-fade-in">
                            <DigitalSignature
                                onSign={setSignatureData}
                                onClear={() => setSignatureData(null)}
                            />
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-4 pt-2">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 text-slate-500 font-medium hover:bg-slate-50 rounded-lg transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!agreed || !signatureData || uploading}
                            className={`flex-1 py-3 rounded-lg font-bold text-white shadow-lg flex items-center justify-center gap-2 transition transform active:scale-95
                                ${!agreed || !signatureData
                                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30'}`}
                        >
                            {uploading ? (
                                'Processando...'
                            ) : (
                                <>
                                    <ShieldCheck className="w-5 h-5" />
                                    Assinar e Confirmar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
