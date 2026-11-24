import { requireAdmin } from "@/lib/admin";
import ProductForm from "@/ui/admin/product-form";
export default async function NewProductPage() {
  await requireAdmin();
  return (
    <>
      <h1 className="font-heading text-3xl">Crear producto</h1>
      <ProductForm />
    </>
  );
}
