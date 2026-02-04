import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, supabaseReady } from '../supabase';

const UserRoleContext = createContext();

export function UserRoleProvider({ children }) {
    const [role, setRole] = useState(null); // 'manager' | 'staff' | null
    const [mode, setMode] = useState(() => localStorage.getItem('app_mode') || null); // 'manager' | 'staff' | null
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    const withTimeout = (promise, ms) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), ms);
        promise.then((val) => {
            clearTimeout(timer);
            resolve(val);
        }).catch((err) => {
            clearTimeout(timer);
            reject(err);
        });
    });

    const fetchRole = useCallback(async (userId) => {
        if (!supabaseReady || !supabase) {
            setRole('staff');
            return;
        }
        try {
            // 1) Try RPC (security definer) first to avoid RLS select issues
            let rpcRole = null;
            try {
                const { data: isManager, error: rpcError } = await withTimeout(
                    supabase.rpc('is_manager'),
                    5000
                );
                if (rpcError) {
                    console.warn('RPC is_manager failed:', rpcError.message);
                } else {
                    rpcRole = isManager ? 'manager' : 'staff';
                }
            } catch (rpcErr) {
                console.warn('RPC is_manager threw:', rpcErr);
            }

            // 2) Fallback to direct select (if RPC unavailable)
            let dbRole = null;
            try {
                const { data, error } = await withTimeout(
                    supabase
                        .from('user_roles')
                        .select('role')
                        .eq('user_id', userId)
                        .single(),
                    7000
                );
                if (error) {
                    console.warn('Error fetching role (user_roles):', error.message);
                } else if (data?.role) {
                    dbRole = data.role;
                }
            } catch (dbErr) {
                console.warn('User_roles select threw:', dbErr);
            }

            setRole(rpcRole || dbRole || 'staff');
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
        if (!supabaseReady || !supabase) {
            setLoading(false);
            setUser(null);
            setRole(null);
            return;
        }
        let cancelled = false;
        const timeoutId = setTimeout(() => {
            if (cancelled) return;
            console.warn('Supabase auth init timeout. Falling back to login screen.');
            setUser(null);
            setRole(null);
            setLoading(false);
        }, 5000);

        const authOk = sessionStorage.getItem('m2go_auth_ok') === '1';

        // Fetch session on mount
        const getSession = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    console.warn('Supabase getSession error:', error.message);
                }
                const session = data?.session || null;
                if (session && !authOk) {
                    await supabase.auth.signOut();
                    if (cancelled) return;
                    setUser(null);
                    setRole(null);
                    clearTimeout(timeoutId);
                    setLoading(false);
                    return;
                }
                if (cancelled) return;
                setUser(session?.user || null);
                if (session?.user) {
                    await fetchRole(session.user.id);
                    if (!cancelled) {
                        clearTimeout(timeoutId);
                    }
                } else {
                    clearTimeout(timeoutId);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Supabase getSession failed:', err);
                if (cancelled) return;
                setUser(null);
                setRole(null);
                clearTimeout(timeoutId);
                setLoading(false);
            }
        };

        getSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            try {
                if (cancelled) return;
                const ok = sessionStorage.getItem('m2go_auth_ok') === '1';
                if (session && !ok) {
                    await supabase.auth.signOut();
                    setUser(null);
                    setRole(null);
                    setLoading(false);
                    return;
                }
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
            } catch (err) {
                console.error('Supabase auth state change failed:', err);
                if (cancelled) return;
                setUser(null);
                setRole(null);
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
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
