import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LanguageContext = createContext({
    mode: 'bilingual',
    setMode: () => {},
    t: (zh, en) => `${zh} / ${en}`
});

export function LanguageProvider({ children }) {
    const [mode, setMode] = useState(() => {
        if (typeof window === 'undefined') return 'bilingual';
        return localStorage.getItem('m2go:langMode') || 'bilingual';
    });

    useEffect(() => {
        try {
            localStorage.setItem('m2go:langMode', mode);
        } catch (err) {
            console.error(err);
        }
        document.documentElement.dataset.lang = mode;
    }, [mode]);

    const t = (zh, en) => (mode === 'en' ? en : `${zh} / ${en}`);

    const value = useMemo(() => ({ mode, setMode, t }), [mode]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLang() {
    return useContext(LanguageContext);
}
