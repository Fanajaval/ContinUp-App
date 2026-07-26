import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider, THEME_SCRIPT } from "@/components/theme/ThemeProvider";
import { UiToastProvider } from "@/components/ui/ToastProvider";
import { ToastProvider } from "@/components/signal/ToastProvider";

/**
 * Plus Jakarta Sans : UI moderne, lisible, plus chaleureuse qu'Inter.
 * Fraunces : titres / marque (déjà la signature du produit).
 */
const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const fontDisplay = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ContinUp — reprends là où tu t'étais arrêté",
  description:
    "ContinUp redonne l'élan de continuer un projet oublié. Ton repo Git devient une progression visible.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontDisplay.variable}`}
    >
      <head>
        {/* Anti-flash : pose la classe de thème avant la première peinture */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <UiToastProvider>
            <ToastProvider>{children}</ToastProvider>
          </UiToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
