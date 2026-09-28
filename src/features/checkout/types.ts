export interface CheckoutForm {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  unit: string;
  city: string;
  postalCode: string;
  province: string;
  deliveryMethod: "shipping" | "pickup";
}
