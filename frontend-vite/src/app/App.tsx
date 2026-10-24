import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { RouterProvider } from "@tanstack/react-router";
import { LazyMotion } from "framer-motion";

import { persistOptions, queryClient } from "@/app/query-client";
import { router } from "@/app/router";

const loadMotion = () =>
  import("@/shared/lib/motion-features").then((module) => module.default);

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      {/* strict: a full `motion.*` component anywhere would pull every animation feature into the main chunk */}
      <LazyMotion features={loadMotion} strict>
        <RouterProvider router={router} />
      </LazyMotion>
    </PersistQueryClientProvider>
  );
}
