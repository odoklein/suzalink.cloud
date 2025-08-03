import type { Metadata } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ReactQueryProvider from '@/components/ReactQueryProvider';
import { SessionProvider } from "@/components/SessionProvider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Suzali",
  description: "Suzali Cloud Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Pacifico&display=swap" rel="stylesheet" />
      </head>
      <body className={`antialiased bg-[#FFFFFF]`}>
        <SessionProvider>
          <ReactQueryProvider>
            {children}
            <Toaster />
          </ReactQueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
