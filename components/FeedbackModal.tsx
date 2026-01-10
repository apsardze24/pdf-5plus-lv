import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ShareIcon } from './icons/ShareIcon';

interface FeedbackModalProps {
    onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
    const { t } = useLanguage();
    const [feedbackType, setFeedbackType] = useState('suggestion');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'copied'>('idle');
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        
        const appName = t.mainTitleEditor;
        const appUrl = window.location.origin;

        const body = `
- App: ${appName}
- URL: ${appUrl}
--------------------------------
- Feedback Type: ${feedbackType}
- User Email: ${email || 'Not provided'}
--------------------------------
- Message:
${message}
        `.trim();

        if (navigator.share) {
            try {
                await navigator.share({ text: body });
                onClose();
            } catch (error) {
                console.error("Sharing failed:", error);
            }
        } else {
            // Fallback for desktop: copy to clipboard
            navigator.clipboard.writeText(body).then(() => {
                if (isMounted.current) {
                    setSubmitStatus('copied');
                }
            }).catch(err => {
                console.error('Failed to copy feedback:', err);
            });
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onMouseDown={onClose}
        >
            <div 
                className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <header className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">{t.feedbackTitle}</h2>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">&times;</button>
                </header>
                <form onSubmit={handleSubmit} className="p-6 flex-grow space-y-4">
                    <div>
                        <label htmlFor="feedbackType" className="block text-sm font-medium text-slate-400 mb-1">{t.feedbackTypeLabel}</label>
                        <select 
                            id="feedbackType"
                            value={feedbackType}
                            onChange={(e) => setFeedbackType(e.target.value)}
                            className="w-full bg-slate-850 text-white p-3 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="suggestion">{t.feedbackTypeSuggestion}</option>
                            <option value="bug">{t.feedbackTypeBug}</option>
                            <option value="general">{t.feedbackTypeGeneral}</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-slate-400 mb-1">{t.feedbackMessageLabel}</label>
                        <textarea
                            id="message"
                            rows={5}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={t.feedbackMessagePlaceholder}
                            required
                            className="w-full bg-slate-850 text-white placeholder-slate-500 p-3 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                     <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-1">{t.feedbackEmailLabel}</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t.feedbackEmailPlaceholder}
                            className="w-full bg-slate-850 text-white placeholder-slate-500 p-3 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                         <p className="text-xs text-slate-500 mt-1">{t.feedbackEmailDescription}</p>
                    </div>
                </form>
                <footer className="p-4 bg-slate-900/50 flex justify-end items-center gap-4">
                    <button type="button" onClick={onClose} className="px-5 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white font-semibold transition-colors">{t.cropper_cancel}</button>
                    <button 
                        type="submit" 
                        onClick={handleSubmit} 
                        disabled={!message.trim() || submitStatus === 'copied'} 
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submitStatus === 'idle' ? (
                            <>
                                <ShareIcon className="w-4 h-4" />
                                {t.sendViaShare}
                            </>
                        ) : (
                            t.feedbackCopied
                        )}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default FeedbackModal;
