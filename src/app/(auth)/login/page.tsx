import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <LoginForm authentikEnabled={!!process.env.AUTHENTIK_ISSUER} />
      </Suspense>
    </main>
  );
}
