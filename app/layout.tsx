import type { Metadata } from "next";
import { caveat, fredoka, nunitoSans } from "@/ui/layout/fonts";
import { CartProvider } from "@/lib/cart";
import { FavoritesProvider } from "@/lib/favorites";
import SiteChrome from "@/ui/layout/site-chrome";
import "@/ui/layout/globals.css";

export const metadata: Metadata = {
  title: "Kadali E-commerce",
  description: "La tienda de las velas deliciosas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${nunitoSans.variable} ${fredoka.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <FavoritesProvider>
          <CartProvider>
            <SiteChrome>{children}</SiteChrome>
          </CartProvider>
        </FavoritesProvider>
      </body>
    </html>
  );
}
