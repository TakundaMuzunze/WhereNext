import { SavedDestinationsProvider } from "@/features/saved-destinations";
import { Footer } from "@/widgets/footer";
import { Header } from "@/widgets/header";
import "./globals.css";
import { Toaster } from "sonner";

const initialiseTheme = `
  (() => {
    try {
      const savedTheme = localStorage.getItem("theme");
      const useDarkTheme = savedTheme !== "light";

      document.documentElement.classList.toggle("dark", useDarkTheme);
    } catch {
      document.documentElement.classList.add("dark");
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initialiseTheme }} />
      </head>
      <body>
        <SavedDestinationsProvider>
          <Header />
          <div>{children}</div>
          <Footer />
        </SavedDestinationsProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
