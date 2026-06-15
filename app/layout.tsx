import type { Metadata } from "next";
import { nunitoSans, fredoka } from "@/ui/layout/fonts";
import { CartProvider } from "@/lib/cart";
import Nav from "@/ui/layout/nav";
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
      className={`${nunitoSans.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <CartProvider>
          <Nav />
          <main className="flex-1">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
