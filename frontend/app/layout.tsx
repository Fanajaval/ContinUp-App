import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider, THEME_SCRIPT } from "@/components/theme/ThemeProvider";
import { UiToastProvider } from "@/components/ui/ToastProvider";
import { ToastProvider } from "@/components/signal/ToastProvider";

export const metadata: Metadata = {
  title: "Le Quatrième Jour — ton repo construit ta vie rêvée",
  description:
    "Ton activité Git fait construire ton rêve. Et quand tu te tais, c'est l'app qui parle.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Anti-flash : pose la classe de thème avant la première peinture */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <UiToastProvider>
            {/* Les Signaux sont la pile la plus proche du contenu :
                ils ne doivent jamais être masqués par un toast système. */}
            <ToastProvider>{children}</ToastProvider>
          </UiToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
