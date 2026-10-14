import type { ReactNode } from "react";

import { AppShell } from "@/shared/ui/app-shell";

type AppProps = {
  children: ReactNode;
};

function App({ children }: AppProps) {
  return <AppShell>{children}</AppShell>;
}

export default App;
