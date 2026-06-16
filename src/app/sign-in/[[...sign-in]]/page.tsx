import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="hero-band">
      <SignIn fallbackRedirectUrl="/dashboard" routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </main>
  );
}
