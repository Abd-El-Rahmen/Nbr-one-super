import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart') || '[]');
    } catch {
      return [];
    }
  });

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product, variant, quantity = 1, customPrice = null, packSize = null) => {
    setItems(prev => {
      const keySuffix = customPrice !== null ? `-vo${packSize || quantity}` : '';
      const key = variant ? `${product.id}-${variant.id}${keySuffix}` : `${product.id}-null${keySuffix}`;
      let stockQty = variant?.stock_quantity ?? product.stock_quantity ?? Infinity;
      if (product.is_bundle && product.bundle_items?.length > 0) {
        stockQty = Math.floor(
          Math.min(
            ...product.bundle_items.map(bi => {
              const varStock = bi.stock_quantity ?? Infinity;
              const biQty = bi.quantity || 1;
              return Math.floor(varStock / biQty);
            })
          )
        );
      }
      const existing = prev.find(i => i.key === key);

      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, stockQty);
        return prev.map(i =>
          i.key === key ? { ...i, quantity: newQty } : i
        );
      }

      // Limit max unique item types in cart
      if (prev.length >= 50) {
        alert('لا يمكن إضافة أكثر من 50 نوع منتج مختلف في السلة في طلب واحد.');
        return prev;
      }

      const cappedQty = Math.min(quantity, stockQty);
      const price = customPrice ?? variant?.price_override ?? product.base_price;
      const originalPrice = variant?.price_override ?? product.base_price;
      const compareAt = variant?.compare_at_price_override ?? product.compare_at_price ?? null;
      return [
        ...prev,
        {
          key,
          product_id: product.id,
          variant_id: variant?.id ?? null,
          name: product.name,
          variant_name: variant?.name ?? null,
          image_url: product.image_url,
          price: parseFloat(price),
          original_price: parseFloat(originalPrice),
          compare_at_price: compareAt ? parseFloat(compareAt) : null,
          quantity: cappedQty,
          stock_quantity: stockQty,
          is_volume_offer: customPrice !== null,
          vo_pack_size: customPrice !== null ? (packSize || 1) : null,
          is_bundle: !!product.is_bundle,
          bundle_items: product.is_bundle ? (product.bundle_items || []) : [],
          description: product.description || null,
        },
      ];
    });
  };

  const updateQuantity = (key, quantity) => {
    if (quantity < 1) return removeItem(key);
    setItems(prev => prev.map(i => {
      if (i.key !== key) return i;
      const stockQty = i.stock_quantity ?? Infinity;
      const cappedQty = Math.min(quantity, stockQty);
      return { ...i, quantity: cappedQty };
    }));
  };

  const removeItem = (key) => {
    setItems(prev => prev.filter(i => i.key !== key));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
