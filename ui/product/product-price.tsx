import { formatPrice } from "@/lib/format";
export default function ProductPrice({
  price,
  basePrice,
}: {
  price: string | number;
  basePrice?: string | number;
}) {
  return (
    <span>
      {basePrice !== undefined && Number(basePrice) > Number(price) && (
        <>
          <del className="mr-2 text-xs font-normal text-fg-muted">
            {formatPrice(basePrice)}
          </del>
          <span className="sr-only">Precio en promoción: </span>
        </>
      )}
      {formatPrice(price)}
    </span>
  );
}
