import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="hero-band">
      <SignUp fallbackRedirectUrl="/dashboard" routing="path" path="/sign-up" signInUrl="/sign-in" />
    </main>
  );
}
