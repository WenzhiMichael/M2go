import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const UserRoleContext = createContext();

export function UserRoleProvider({ children }) {
    const [role, setRole] = useState(null); // 'manager' | 'staff' | null
    const [mode, setMode] = useState(() => localStorage.getItem('app_mode') || null); // 'manager' | 'staff' | null
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    const fetchRole = useCallback(async (userId) => {
        try {
            // First check if user_roles table exists and has data for this user
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .single();

            if (error) {
                console.warn('Error fetching role (user might be new or table missing):', error.message);
                // Default to staff if error (e.g. table doesn't exist yet or row missing)
                setRole('staff');
            } else if (data) {
                setRole(data.role);
            }
        } catch (err) {
            console.error('Unexpected error fetching role:', err);
            setRole('staff');
        } finally {
            setLoading(false);
        }
    }, []);

    // Effect to ensure mode validity when role changes
    useEffect(() => {
        if (role && role !== 'manager' && mode === 'manager') {
            setMode('staff');
            localStorage.setItem('app_mode', 'staff');
        }
    }, [role, mode]);

    useEffect(() => {
        // Fetch session on mount
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
            if (session?.user) {
                await fetchRole(session.user.id);
            } else {
                setLoading(false);
            }
        };

        getSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user || null);
            if (session?.user) {
                // If user changes (or same user re-auth), fetch role again
                setLoading(true);
                await fetchRole(session.user.id);
            } else {
                setRole(null);
                setMode(null);
                localStorage.removeItem('app_mode');
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchRole]);

    const updateMode = (newMode) => {
        setMode(newMode);
        if (newMode) {
            localStorage.setItem('app_mode', newMode);
        } else {
            localStorage.removeItem('app_mode');
        }
    };

    const refreshRole = async () => {
        if (user) await fetchRole(user.id);
    };

    return (
        <UserRoleContext.Provider value={{ role, mode, setMode: updateMode, loading, user, refreshRole }}>
            {children}
        </UserRoleContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useUserRole = () => useContext(UserRoleContext);
