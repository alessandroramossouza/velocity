import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check, PenTool } from 'lucide-react';

interface DigitalSignatureProps {
    onSign: (signatureDataUrl: string) => void;
    onClear: () => void;
}

export const DigitalSignature: React.FC<DigitalSignatureProps> = ({ onSign, onClear }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set dimensions based on parent width (responsive)
        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = 200;
        }

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            const canvas = canvasRef.current;
            if (canvas && hasSignature) {
                onSign(canvas.toDataURL());
            }
        }
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const rect = canvas.getBoundingClientRect();
        return {
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        onClear();
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-indigo-600" />
                    Sua Assinatura
                </label>
                <button
                    onClick={clearCanvas}
                    type="button" // Prevent form submit
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                    <Eraser className="w-3 h-3" />
                    Limpar
                </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden touch-none relative">
                {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-slate-400 text-sm">Assine aqui</p>
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[200px] cursor-crosshair active:cursor-crosshair"
                />
            </div>
            <p className="text-xs text-slate-500 mt-1">
                Use o mouse ou o dedo para assinar no quadro acima.
            </p>
        </div>
    );
};
