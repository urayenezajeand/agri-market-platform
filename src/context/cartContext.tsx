import React, { createContext, useState, useContext, useEffect } from 'react';

// 1. Miterere y'igicuruzwa kiri mu kagare (Cart Item shape)
export interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    image_url: string;
    vendor_id: number;
    stock: number;
}

// 2. Miterere y'amakuru ari muri Cart Context
interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Omit<CartItem, 'quantity'>, quantity: number) => void;
    removeFromCart: (productId: number) => void;
    updateQuantity: (productId: number, quantity: number) => void;
    clearCart: () => void;
    cartCount: number;
    cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>([]);

    // 3. Kureba niba hari ibintu byari bisanzwe mu kagare (Load cart from localStorage)
    useEffect(() => {
        const storedCart = localStorage.getItem('agri_cart');
        if (storedCart) {
            setCart(JSON.parse(storedCart));
        }
    }, []);

    // 4. Kubika ibicuruzwa byahindutse (Save cart to localStorage whenever it changes)
    const saveCart = (newCart: CartItem[]) => {
        setCart(newCart);
        localStorage.setItem('agri_cart', JSON.stringify(newCart));
    };

    // 5. Kwinjiza igicuruzwa mu kagare (Add product to cart)
    const addToCart = (product: Omit<CartItem, 'quantity'>, quantity: number) => {
        const existingItem = cart.find(item => item.id === product.id);

        if (existingItem) {
            // Niba gihari, twongeyeho umubare ariko isuzume niba bidashyira stock mu bibazo
            const newQuantity = Math.min(existingItem.quantity + quantity, product.stock);
            const updatedCart = cart.map(item =>
                item.id === product.id ? { ...item, quantity: newQuantity } : item
            );
            saveCart(updatedCart);
        } else {
            // Niba kidahari, kishyiremo bwa mbere
            const newQuantity = Math.min(quantity, product.stock);
            saveCart([...cart, { ...product, quantity: newQuantity }]);
        }
    };

    // 6. Gukuramo igicuruzwa mu kagare (Remove item)
    const removeFromCart = (productId: number) => {
        const updatedCart = cart.filter(item => item.id !== productId);
        saveCart(updatedCart);
    };

    // 7. Guhindura umubare w'igicuruzwa (Update quantity)
    const updateQuantity = (productId: number, quantity: number) => {
        const updatedCart = cart.map(item => {
            if (item.id === productId) {
                // Kureba ko umubare utarenga stock kandi utari munsi ya 1
                const newQuantity = Math.max(1, Math.min(quantity, item.stock));
                return { ...item, quantity: newQuantity };
            }
            return item;
        });
        saveCart(updatedCart);
    };

    // 8. Gusiba akagare kose (Clear cart)
    const clearCart = () => {
        saveCart([]);
    };

    // 9. Kubara umubare w'ibintu n'igiciro cyabyo byose (Computed properties)
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal }}>
            {children}
        </CartContext.Provider>
    );
};

// 10. Custom Hook yo guhamagara iyi Cart Context
export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
