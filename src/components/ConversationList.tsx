import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Car, Rental } from '../types';
import { getConversations, getMessages, getUnreadMessagesCount, Conversation, Message } from '../services/api';
import { MessageCircle, ChevronRight, Clock, Check, CheckCheck, Loader2, X, Search } from 'lucide-react';
import { Chat } from './Chat';

interface ConversationListProps {
    currentUser: User;
    onClose: () => void;
}

interface ConversationWithDetails extends Conversation {
    otherUser?: { id: string; name: string };
    lastMessage?: Message;
    car?: Car;
    rental?: Rental;
    unreadCount: number;
}

export const ConversationList: React.FC<ConversationListProps> = ({ currentUser, onClose }) => {
    const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);

    useEffect(() => {
        loadConversations();

        // Subscribe to realtime updates
        const channel = supabase
            .channel('conversation-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages'
                },
                () => {
                    loadConversations();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser.id]);

    const loadConversations = async () => {
        setLoading(true);
        try {
            const convs = await getConversations(currentUser.id);

            // Enrich with additional data
            const enrichedConvs: ConversationWithDetails[] = await Promise.all(
                convs.map(async (conv) => {
                    // Get other user info
                    const otherUserId = currentUser.id === conv.ownerId ? conv.renterId : conv.ownerId;
                    const { data: userData } = await supabase
                        .from('users')
                        .select('id, name')
                        .eq('id', otherUserId)
                        .single();

                    // Get last message
                    const messages = await getMessages(conv.id);
                    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;

                    // Count unread
                    const unreadCount = messages.filter(
                        m => !m.isRead && m.senderId !== currentUser.id
                    ).length;

                    // Get rental info
                    const { data: rentalData } = await supabase
                        .from('rentals')
                        .select('*, cars:car_id(*)')
                        .eq('id', conv.rentalId)
                        .single();

                    return {
                        ...conv,
                        otherUser: userData ? { id: userData.id, name: userData.name } : undefined,
                        lastMessage,
                        car: rentalData?.cars || undefined,
                        unreadCount
                    };
                })
            );

            setConversations(enrichedConvs);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Ontem';
        } else if (days < 7) {
            return date.toLocaleDateString('pt-BR', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        }
    };

    const filteredConversations = conversations.filter(conv =>
        conv.otherUser?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.car?.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.car?.model?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedConversation && selectedConversation.otherUser) {
        return (
            <Chat
                currentUser={currentUser}
                otherUser={selectedConversation.otherUser}
                rentalId={selectedConversation.rentalId}
                onClose={() => {
                    setSelectedConversation(null);
                    loadConversations(); // Refresh unread counts
                }}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <MessageCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Mensagens</h2>
                                <p className="text-indigo-200 text-xs">
                                    {conversations.length} conversas
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-indigo-300" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar conversas..."
                            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-300 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                        />
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                            <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-center font-medium">
                                {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
                            </p>
                            <p className="text-xs text-center mt-2">
                                {searchTerm
                                    ? 'Tente outro termo de busca'
                                    : 'Inicie uma conversa a partir de um aluguel'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredConversations.map((conv) => (
                                <div
                                    key={conv.id}
                                    onClick={() => setSelectedConversation(conv)}
                                    className={`p-4 cursor-pointer hover:bg-slate-50 transition flex gap-3 ${conv.unreadCount > 0 ? 'bg-indigo-50/50' : ''
                                        }`}
                                >
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                            {conv.otherUser?.name.charAt(0) || '?'}
                                        </div>
                                        {conv.unreadCount > 0 && (
                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                                {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h3 className={`font-semibold truncate ${conv.unreadCount > 0 ? 'text-slate-900' : 'text-slate-700'
                                                }`}>
                                                {conv.otherUser?.name || 'Usuário'}
                                            </h3>
                                            <span className="text-xs text-slate-400 shrink-0">
                                                {conv.lastMessage && formatTime(conv.lastMessage.createdAt)}
                                            </span>
                                        </div>

                                        {conv.car && (
                                            <p className="text-xs text-indigo-600 mb-1 truncate">
                                                🚗 {conv.car.make} {conv.car.model}
                                            </p>
                                        )}

                                        {conv.lastMessage && (
                                            <div className="flex items-center gap-1">
                                                {conv.lastMessage.senderId === currentUser.id && (
                                                    conv.lastMessage.isRead
                                                        ? <CheckCheck className="w-3 h-3 text-blue-500 shrink-0" />
                                                        : <Check className="w-3 h-3 text-slate-400 shrink-0" />
                                                )}
                                                <p className={`text-sm truncate ${conv.unreadCount > 0
                                                        ? 'text-slate-800 font-medium'
                                                        : 'text-slate-500'
                                                    }`}>
                                                    {conv.lastMessage.messageType === 'system'
                                                        ? '📢 ' + conv.lastMessage.content
                                                        : conv.lastMessage.content
                                                    }
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 self-center" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConversationList;
