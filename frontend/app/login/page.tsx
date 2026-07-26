import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted">
          Chargement…
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
