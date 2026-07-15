import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <Toaster
      richColors
      position="top-right"
      closeButton
      duration={3000}
    />
  );
}