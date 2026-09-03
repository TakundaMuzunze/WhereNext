import { Footer } from "@/widgets/footer";
import { Header } from "@/widgets/header";
import "./globals.css";

const initiliaseTheme = `
  (() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    const useDarkTheme =
      savedTheme === "dark" ||
      (!savedTheme && prefersDark);

    document.documentElement.classList.toggle("dark", useDarkTheme);
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initiliaseTheme }} />
      </head>
      <body>
        <Header />
        <div>{children}</div>
        <Footer />
      </body>
    </html>
  );
}
