import React, { createContext, useState, useContext, useEffect } from 'react';

// 1. Miterere y'amakuru y'umu-user (TypeScript Interface)
interface User {
    id: number;
    name: string;
    email: string;
    role: 'buyer' | 'vendor' | 'admin';
    vendor_status?: string;
    tin_number?: string;
    rdb_certificate?: string;
    phone?: string;
    shipping_address?: string;
}

// 2. Miterere y'amakuru ari muri Context (Context shape)
interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isVendor: boolean;
    isAdmin: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // 3. Kureba niba hari user wari usanzwe winjiye (Check localStorage on startup)
    useEffect(() => {
        const storedUser = localStorage.getItem('agri_user');
        const storedToken = localStorage.getItem('agri_token');

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
        }
        setLoading(false);
    }, []);

    // 4. Kwinjiza user mushya (Login handler)
    const login = (newToken: string, userData: User) => {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('agri_token', newToken);
        localStorage.setItem('agri_user', JSON.stringify(userData));
    };

    // 5. Gusohora user (Logout handler)
    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('agri_token');
        localStorage.removeItem('agri_user');
    };

    const isAuthenticated = !!token;
    const isVendor = user?.role === 'vendor';
    const isAdmin = user?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, isVendor, isAdmin, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// 6. Custom Hook yo kworoshya guhamagara iyi Context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
