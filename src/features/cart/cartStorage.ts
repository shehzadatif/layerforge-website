export type CartItem = {
  id: string;
  name: string;
  variantId?: string;
  variantName?: string;
  materialId: string;
  materialName: string;
  price: number;
  image: string;
  quantity: number;
  productionDays?: number;
};

const STORAGE_KEY = "lf-cart";

function notifyCartUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cartUpdated"));
  }
}

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);

  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  notifyCartUpdated();
}

export function addToCart(item: CartItem) {
  const cart = getCart();

  const existing = cart.find(
    (i) =>
      i.id === item.id &&
      i.materialId === item.materialId &&
      (i.variantId ?? "") === (item.variantId ?? ""),
  );

  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push(item);
  }

  saveCart(cart);
}

export function removeFromCart(
  id: string,
  materialId: string,
  variantId?: string,
) {
  saveCart(
    getCart().filter(
      (i) =>
        !(
          i.id === id &&
          i.materialId === materialId &&
          (i.variantId ?? "") === (variantId ?? "")
        ),
    ),
  );
}

export function updateQuantity(
  id: string,
  materialId: string,
  quantity: number,
  variantId?: string,
) {
  const cart = getCart();

  const item = cart.find(
    (i) =>
      i.id === id &&
      i.materialId === materialId &&
      (i.variantId ?? "") === (variantId ?? ""),
  );

  if (item) {
    item.quantity = quantity;
  }

  saveCart(cart);
}

export function clearCart() {
  localStorage.removeItem(STORAGE_KEY);
  notifyCartUpdated();
}
