import { AuthProvider } from "@/providers/auth-provider";
import "@/styles/motion.css";
import "leaflet/dist/leaflet.css";
import type { Metadata } from "next";
import "./globals.css";
import "@/styles/appearance.css";
import { ThemeProvider } from "@/providers/theme-provider";
export const metadata: Metadata = {
  title: "Trackwe | Fleet Operations",
  description: "Trackwe fleet management — frontend demonstration",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.theme=localStorage.getItem('trackwe.theme')==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}",
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
