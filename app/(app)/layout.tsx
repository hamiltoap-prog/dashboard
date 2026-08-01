import { AppHeader } from "@/components/app-header";
import { StoreProvider } from "@/lib/store";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProvider>
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 md:px-6 md:pt-8">
          {children}
        </main>
      </div>
    </StoreProvider>
  );
}
