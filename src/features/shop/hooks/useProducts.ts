import { products } from "../data/products";

export function useProducts() {
  return {
    products,
    loading: false,
    error: null,
  };
}