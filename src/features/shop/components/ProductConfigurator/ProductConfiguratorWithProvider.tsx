import { CartProvider } from "../../context/CartContext";
import ProductConfigurator from "./ProductConfigurator";

export default function ProductConfiguratorWithProvider(props: any) {
  return (
    <CartProvider>
      <ProductConfigurator {...props} />
    </CartProvider>
  );
}