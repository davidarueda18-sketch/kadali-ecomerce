import localFont from "next/font/local";

// Keep the brand fonts local so builds do not depend on Google Fonts requests.
export const nunitoSans = localFont({
  src: "./font-files/nunito-sans.ttf",
  variable: "--font-nunito-sans",
  weight: "200 900",
  display: "swap",
});
export const fredoka = localFont({
  src: "./font-files/fredoka.woff2",
  variable: "--font-fredoka",
  weight: "300 700",
  display: "swap",
});
export const caveat = localFont({
  src: "./font-files/caveat.woff2",
  variable: "--font-caveat",
  weight: "400 700",
  display: "swap",
});
