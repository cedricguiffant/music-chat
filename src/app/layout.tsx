import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Music Chat - Ecouter ensemble",
  description: "Ecoutez de la musique ensemble en discutant en temps reel. Spotify, Deezer, YouTube.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
