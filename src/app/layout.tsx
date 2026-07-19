import { Header } from "@/widgets/header";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        <div className="pt-20">{children}</div>
      </body>
    </html>
  );
}
