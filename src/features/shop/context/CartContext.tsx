import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type CartItem = {
  id: string;
  name: string;

  materialId: string;
  materialName: string;

  price: number;

  image: string;

  quantity: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
 removeFromCart: (
  id: string,
  materialId: string
) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("lf-cart");

    if (saved) {
      setCart(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "lf-cart",
      JSON.stringify(cart)
    );
  }, [cart]);

  function addToCart(item: CartItem) {

    setCart((current) => {

   const existing = current.find(
  (p) =>
    p.id === item.id &&
    p.materialId === item.materialId
);

      if (existing) {

        return current.map((p) =>
        p.id === item.id &&
p.materialId === item.materialId
            ? {
                ...p,
                quantity: p.quantity + item.quantity,
              }
            : p
        );

      }

      return [...current, item];

    });

  }

function removeFromCart(
  id: string,
  materialId: string
) {
  setCart((c) =>
    c.filter(
      (i) =>
        !(
          i.id === id &&
          i.materialId === materialId
        )
    )
  );
}

  function clearCart() {
    setCart([]);
  }

  return (

    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >

      {children}

    </CartContext.Provider>

  );

}

export function useCart() {

  const ctx = useContext(CartContext);

  if (!ctx)
    throw new Error("CartProvider missing");

  return ctx;

}