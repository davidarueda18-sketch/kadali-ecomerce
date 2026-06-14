import type { Metadata } from "next";
import { nunitoSans, fredoka } from "./ui/fonts";
import { CartProvider } from "./lib/cart";
import Nav from "./ui/nav";
import "./ui/globals.css";

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
          <main>{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
