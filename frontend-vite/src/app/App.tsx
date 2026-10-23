import { HeroUIProvider } from "@heroui/react"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { RouterProvider } from "@tanstack/react-router"

import { persistOptions, queryClient } from "@/app/query-client"
import { router } from "@/app/router"

export default function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <HeroUIProvider>
        <RouterProvider router={router} />
      </HeroUIProvider>
    </PersistQueryClientProvider>
  )
}
