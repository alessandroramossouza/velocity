import React, { useState, useEffect } from 'react';
import { Inspection, InspectionPhoto, getInspections, getInspectionPhotos, compareInspections } from '../services/api';
import {
    Camera, Check, X, AlertTriangle, ChevronRight, ChevronLeft,
    Car as CarIcon, Eye, CheckCircle, FileText, Download, ZoomIn
} from 'lucide-react';

interface InspectionViewerProps {
    rentalId: string;
    carName: string;
    onClose: () => void;
}

const ANGLE_LABELS: { [key: string]: { label: string; icon: string } } = {
    'front': { label: 'Frente', icon: '🚗' },
    'back': { label: 'Traseira', icon: '🔙' },
    'left': { label: 'Lateral Esquerda', icon: '⬅️' },
    'right': { label: 'Lateral Direita', icon: '➡️' },
    'front_left': { label: 'Dianteira Esquerda', icon: '↖️' },
    'front_right': { label: 'Dianteira Direita', icon: '↗️' },
    'back_left': { label: 'Traseira Esquerda', icon: '↙️' },
    'back_right': { label: 'Traseira Direita', icon: '↘️' },
    'interior': { label: 'Interior', icon: '🪑' },
    'dashboard': { label: 'Painel/Hodômetro', icon: '📊' },
};

export const InspectionViewer: React.FC<InspectionViewerProps> = ({ rentalId, carName, onClose }) => {
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
    const [photos, setPhotos] = useState<InspectionPhoto[]>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<InspectionPhoto | null>(null);
    const [loading, setLoading] = useState(true);
    const [comparison, setComparison] = useState<{
        checkIn: Inspection | null;
        checkOut: Inspection | null;
        newDamages: { angle: string; description: string }[];
    } | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'compare'>('list');

    useEffect(() => {
        loadInspections();
    }, [rentalId]);

    const loadInspections = async () => {
        setLoading(true);
        const data = await getInspections(rentalId);
        setInspections(data);

        if (data.length >= 2) {
            const comp = await compareInspections(rentalId);
            setComparison(comp);
        }

        setLoading(false);
    };

    const loadPhotos = async (inspectionId: string) => {
        const data = await getInspectionPhotos(inspectionId);
        setPhotos(data);
    };

    const selectInspection = async (inspection: Inspection) => {
        setSelectedInspection(inspection);
        await loadPhotos(inspection.id);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Photo Lightbox
    if (selectedPhoto) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setSelectedPhoto(null)}>
                <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => setSelectedPhoto(null)}
                        className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>

                    <img
                        src={selectedPhoto.photoUrl}
                        alt={selectedPhoto.angle}
                        className="w-full h-auto rounded-xl shadow-2xl"
                    />

                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white font-bold text-lg">
                                    {ANGLE_LABELS[selectedPhoto.angle]?.icon} {ANGLE_LABELS[selectedPhoto.angle]?.label || selectedPhoto.angle}
                                </p>
                                {selectedPhoto.hasDamage && (
                                    <p className="text-red-400 text-sm flex items-center gap-1">
                                        <AlertTriangle className="w-4 h-4" />
                                        {selectedPhoto.damageDescription || 'Dano registrado'}
                                    </p>
                                )}
                            </div>
                            <a
                                href={selectedPhoto.photoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Baixar
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Inspection Detail View
    if (selectedInspection) {
        const damagesCount = photos.filter(p => p.hasDamage).length;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                    {/* Header */}
                    <div className={`p-6 text-white shrink-0 ${selectedInspection.inspectionType === 'check_in'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                            : 'bg-gradient-to-r from-amber-600 to-orange-600'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    {selectedInspection.inspectionType === 'check_in' ? (
                                        <>📥 Vistoria de Entrada</>
                                    ) : (
                                        <>📤 Vistoria de Saída</>
                                    )}
                                </h2>
                                <p className="text-white/80 text-sm mt-1">
                                    {carName} • {formatDate(selectedInspection.completedAt || selectedInspection.createdAt)}
                                </p>
                            </div>
                            <button onClick={() => setSelectedInspection(null)} className="p-2 hover:bg-white/10 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                                <p className="text-3xl font-bold text-slate-800">{photos.length}</p>
                                <p className="text-xs text-slate-500">Fotos Registradas</p>
                            </div>
                            <div className={`rounded-xl p-4 text-center border ${damagesCount > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
                                }`}>
                                <p className={`text-3xl font-bold ${damagesCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {damagesCount}
                                </p>
                                <p className={`text-xs ${damagesCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    Danos Identificados
                                </p>
                            </div>
                        </div>

                        {/* Photo Grid */}
                        <div>
                            <h3 className="font-bold text-slate-800 mb-3">📸 Fotos da Vistoria</h3>
                            <div className="grid grid-cols-5 gap-2">
                                {photos.map((photo) => (
                                    <div
                                        key={photo.id}
                                        onClick={() => setSelectedPhoto(photo)}
                                        className={`aspect-square rounded-lg overflow-hidden cursor-pointer relative border-2 transition hover:scale-105 ${photo.hasDamage ? 'border-red-500' : 'border-slate-200 hover:border-indigo-400'
                                            }`}
                                    >
                                        <img src={photo.photoUrl} alt={photo.angle} className="w-full h-full object-cover" />
                                        {photo.hasDamage && (
                                            <div className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full">
                                                <AlertTriangle className="w-3 h-3" />
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] p-1 text-center">
                                            {ANGLE_LABELS[photo.angle]?.label || photo.angle}
                                        </div>
                                        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                                            <ZoomIn className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Damages List */}
                        {damagesCount > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    Danos Registrados
                                </h3>
                                <ul className="space-y-2">
                                    {photos.filter(p => p.hasDamage).map((photo) => (
                                        <li key={photo.id} className="flex items-start gap-2 text-sm text-red-700">
                                            <span className="shrink-0">{ANGLE_LABELS[photo.angle]?.icon}</span>
                                            <div>
                                                <span className="font-medium">{ANGLE_LABELS[photo.angle]?.label}:</span>{' '}
                                                <span>{photo.damageDescription || 'Dano não especificado'}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Notes */}
                        {selectedInspection.notes && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <h3 className="font-bold text-slate-800 mb-2">📝 Observações Gerais</h3>
                                <p className="text-sm text-slate-600">{selectedInspection.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Main List View
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Camera className="w-6 h-6" />
                                Vistorias do Veículo
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">{carName}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : inspections.length === 0 ? (
                        <div className="text-center py-12">
                            <Camera className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium">Nenhuma vistoria realizada</p>
                            <p className="text-slate-400 text-sm mt-1">As vistorias aparecerão aqui após serem feitas</p>
                        </div>
                    ) : (
                        <>
                            {/* Comparison Alert */}
                            {comparison && comparison.newDamages.length > 0 && (
                                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 animate-pulse">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-red-500 rounded-full">
                                            <AlertTriangle className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-red-800">⚠️ Novos Danos Detectados!</h3>
                                            <p className="text-sm text-red-700 mt-1">
                                                Foram encontrados <strong>{comparison.newDamages.length} novo(s) dano(s)</strong> na vistoria de saída que não existiam na entrada.
                                            </p>
                                            <ul className="mt-2 space-y-1">
                                                {comparison.newDamages.map((d, i) => (
                                                    <li key={i} className="text-xs text-red-600 flex items-center gap-1">
                                                        • {ANGLE_LABELS[d.angle]?.label || d.angle}: {d.description}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Inspection Cards */}
                            {inspections.map((inspection) => (
                                <div
                                    key={inspection.id}
                                    onClick={() => selectInspection(inspection)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition hover:shadow-md ${inspection.inspectionType === 'check_in'
                                            ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
                                            : 'bg-amber-50 border-amber-200 hover:border-amber-400'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-xl ${inspection.inspectionType === 'check_in'
                                                    ? 'bg-emerald-500'
                                                    : 'bg-amber-500'
                                                }`}>
                                                {inspection.inspectionType === 'check_in' ? (
                                                    <span className="text-2xl">📥</span>
                                                ) : (
                                                    <span className="text-2xl">📤</span>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className={`font-bold ${inspection.inspectionType === 'check_in'
                                                        ? 'text-emerald-800'
                                                        : 'text-amber-800'
                                                    }`}>
                                                    {inspection.inspectionType === 'check_in'
                                                        ? 'Vistoria de Entrada'
                                                        : 'Vistoria de Saída'
                                                    }
                                                </h3>
                                                <p className="text-slate-500 text-xs">
                                                    {formatDate(inspection.completedAt || inspection.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {inspection.damageReport.length > 0 && (
                                                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                                    {inspection.damageReport.length} dano(s)
                                                </span>
                                            )}
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InspectionViewer;
