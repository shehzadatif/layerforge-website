import { useEffect, useState } from "react";
import { getCart } from "../../features/cart/cartStorage";

export default function CartBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function refresh() {
      const cart = getCart();

      const total = cart.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      setCount(total);
    }

    refresh();

    window.addEventListener("storage", refresh);
    window.addEventListener("cartUpdated", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("cartUpdated", refresh);
    };
  }, []);

  return (
    <a
      href="/cart"
      className="relative hover:text-yellow-400 transition"
    >
      🛒 Cart

      {count > 0 && (
        <span className="absolute -right-5 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-black">
          {count}
        </span>
      )}
    </a>
  );
}