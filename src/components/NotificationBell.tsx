import React, { useState, useEffect, useRef } from 'react';
import { Notification } from '../types';
import { Bell, Check, CheckCheck, X, Clock, Car, Star, Wrench, MessageSquare } from 'lucide-react';

interface NotificationBellProps {
    userId: string;
    notifications: Notification[];
    onMarkAsRead: (notificationId: string) => void;
    onMarkAllAsRead: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
    userId,
    notifications,
    onMarkAsRead,
    onMarkAllAsRead
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'rental_request':
            case 'rental_approved':
            case 'rental_rejected':
                return <Car className="w-5 h-5" />;
            case 'new_review':
                return <Star className="w-5 h-5" />;
            case 'service_request':
                return <Wrench className="w-5 h-5" />;
            case 'return_reminder':
                return <Clock className="w-5 h-5" />;
            default:
                return <MessageSquare className="w-5 h-5" />;
        }
    };

    const getIconColor = (type: Notification['type']) => {
        switch (type) {
            case 'rental_approved':
                return 'text-green-600 bg-green-100';
            case 'rental_rejected':
                return 'text-red-600 bg-red-100';
            case 'new_review':
                return 'text-yellow-600 bg-yellow-100';
            case 'return_reminder':
                return 'text-orange-600 bg-orange-100';
            case 'service_request':
                return 'text-purple-600 bg-purple-100';
            default:
                return 'text-indigo-600 bg-indigo-100';
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}min atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        if (diffDays < 7) return `${diffDays}d atrás`;
        return date.toLocaleDateString();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                    {/* Header */}
                    <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Notificações</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={onMarkAllAsRead}
                                className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1"
                            >
                                <CheckCheck className="w-4 h-4" />
                                Marcar tudo como lido
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Bell className="w-8 h-8 text-slate-300" />
                                </div>
                                <p className="text-slate-500 text-sm">Nenhuma notificação</p>
                            </div>
                        ) : (
                            notifications.slice(0, 10).map(notification => (
                                <div
                                    key={notification.id}
                                    className={`flex gap-3 p-4 border-b border-slate-100 cursor-pointer transition hover:bg-slate-50 ${!notification.isRead ? 'bg-indigo-50/50' : ''}`}
                                    onClick={() => onMarkAsRead(notification.id)}
                                >
                                    <div className={`p-2 rounded-full shrink-0 ${getIconColor(notification.type)}`}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!notification.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {formatTimeAgo(notification.createdAt)}
                                        </p>
                                    </div>
                                    {!notification.isRead && (
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full shrink-0 mt-2"></div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="border-t border-slate-200 p-3 bg-slate-50">
                            <button className="w-full text-center text-sm text-indigo-600 font-medium hover:underline">
                                Ver todas as notificações
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
