import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { Send, Image, Paperclip, X, MessageCircle, Check, CheckCheck, Loader2 } from 'lucide-react';

interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    messageType: 'text' | 'image' | 'document' | 'system';
    attachmentUrl?: string;
    isRead: boolean;
    createdAt: string;
}

interface Conversation {
    id: string;
    rentalId: string;
    ownerId: string;
    renterId: string;
    lastMessageAt?: string;
}

interface ChatProps {
    currentUser: User;
    otherUser: { id: string; name: string; };
    rentalId: string;
    onClose: () => void;
}

export const Chat: React.FC<ChatProps> = ({ currentUser, otherUser, rentalId, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom when messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load or create conversation
    useEffect(() => {
        const initConversation = async () => {
            setLoading(true);

            // Try to find existing conversation
            const { data: existingConv } = await supabase
                .from('conversations')
                .select('*')
                .eq('rental_id', rentalId)
                .single();

            if (existingConv) {
                setConversation({
                    id: existingConv.id,
                    rentalId: existingConv.rental_id,
                    ownerId: existingConv.owner_id,
                    renterId: existingConv.renter_id,
                    lastMessageAt: existingConv.last_message_at
                });
                await loadMessages(existingConv.id);
            } else {
                // Create new conversation
                const { data: newConv, error } = await supabase
                    .from('conversations')
                    .insert({
                        rental_id: rentalId,
                        owner_id: currentUser.role === 'owner' ? currentUser.id : otherUser.id,
                        renter_id: currentUser.role === 'renter' ? currentUser.id : otherUser.id
                    })
                    .select()
                    .single();

                if (newConv) {
                    setConversation({
                        id: newConv.id,
                        rentalId: newConv.rental_id,
                        ownerId: newConv.owner_id,
                        renterId: newConv.renter_id,
                        lastMessageAt: newConv.last_message_at
                    });

                    // Add system message
                    await supabase.from('messages').insert({
                        conversation_id: newConv.id,
                        sender_id: 'system',
                        content: 'Conversa iniciada. Mantenha a comunicação dentro da plataforma para sua segurança.',
                        message_type: 'system'
                    });

                    await loadMessages(newConv.id);
                }
            }

            setLoading(false);
        };

        initConversation();
    }, [rentalId, currentUser.id]);

    // Subscribe to realtime messages
    useEffect(() => {
        if (!conversation) return;

        const channel = supabase
            .channel(`chat-${conversation.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversation.id}`
                },
                (payload) => {
                    const newMsg: Message = {
                        id: payload.new.id,
                        conversationId: payload.new.conversation_id,
                        senderId: payload.new.sender_id,
                        content: payload.new.content,
                        messageType: payload.new.message_type,
                        attachmentUrl: payload.new.attachment_url,
                        isRead: payload.new.is_read,
                        createdAt: payload.new.created_at
                    };

                    // Only add if not already in list (avoid duplicates)
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });

                    // Mark as read if from other user
                    if (newMsg.senderId !== currentUser.id) {
                        markAsRead(newMsg.id);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversation, currentUser.id]);

    const loadMessages = async (conversationId: string) => {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data.map((m: any) => ({
                id: m.id,
                conversationId: m.conversation_id,
                senderId: m.sender_id,
                content: m.content,
                messageType: m.message_type,
                attachmentUrl: m.attachment_url,
                isRead: m.is_read,
                createdAt: m.created_at
            })));

            // Mark unread messages as read
            const unreadIds = data
                .filter((m: any) => !m.is_read && m.sender_id !== currentUser.id)
                .map((m: any) => m.id);

            if (unreadIds.length > 0) {
                await supabase
                    .from('messages')
                    .update({ is_read: true })
                    .in('id', unreadIds);
            }
        }
    };

    const markAsRead = async (messageId: string) => {
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', messageId);
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !conversation || sending) return;

        setSending(true);
        const content = newMessage.trim();
        setNewMessage('');

        try {
            await supabase.from('messages').insert({
                conversation_id: conversation.id,
                sender_id: currentUser.id,
                content: content,
                message_type: 'text'
            });
        } catch (error) {
            console.error('Error sending message:', error);
            setNewMessage(content); // Restore message on error
        }

        setSending(false);
        inputRef.current?.focus();
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Hoje';
        if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    // Group messages by date
    const groupedMessages = messages.reduce((groups: { [key: string]: Message[] }, msg) => {
        const date = new Date(msg.createdAt).toDateString();
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
        return groups;
    }, {});

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[600px] flex flex-col overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex items-center gap-3 shrink-0">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">
                        {otherUser.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-white">{otherUser.name}</h3>
                        <p className="text-indigo-200 text-xs">Chat do Aluguel</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <MessageCircle className="w-12 h-12 mb-2" />
                            <p className="text-sm">Nenhuma mensagem ainda.</p>
                            <p className="text-xs">Envie uma mensagem para começar!</p>
                        </div>
                    ) : (
                        Object.entries(groupedMessages).map(([date, msgs]) => (
                            <div key={date}>
                                {/* Date Divider */}
                                <div className="flex items-center justify-center my-4">
                                    <span className="bg-slate-200 text-slate-600 text-xs px-3 py-1 rounded-full">
                                        {formatDate(msgs[0].createdAt)}
                                    </span>
                                </div>

                                {/* Messages */}
                                {msgs.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex mb-2 ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'
                                            } ${msg.messageType === 'system' ? 'justify-center' : ''}`}
                                    >
                                        {msg.messageType === 'system' ? (
                                            <div className="bg-slate-200 text-slate-600 text-xs px-4 py-2 rounded-full max-w-[80%] text-center">
                                                {msg.content}
                                            </div>
                                        ) : (
                                            <div
                                                className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${msg.senderId === currentUser.id
                                                    ? 'bg-indigo-600 text-white rounded-br-md'
                                                    : 'bg-white text-slate-800 rounded-bl-md border border-slate-100'
                                                    }`}
                                            >
                                                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                                <div className={`flex items-center justify-end gap-1 mt-1 ${msg.senderId === currentUser.id ? 'text-indigo-200' : 'text-slate-400'
                                                    }`}>
                                                    <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                                                    {msg.senderId === currentUser.id && (
                                                        msg.isRead
                                                            ? <CheckCheck className="w-3 h-3" />
                                                            : <Check className="w-3 h-3" />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 px-4 py-2.5 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={loading || sending}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || loading || sending}
                        className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
