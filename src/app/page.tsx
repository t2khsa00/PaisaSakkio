import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight } from "lucide-react";

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="intro">
      <div className="intro-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="intro-logo" src="/logo.png" alt="pasia sakkio" />

        <div className="intro-words">
          <h1 className="intro-title">
            Split smarter,
            <br />
            settle simpler.
          </h1>
          <p className="intro-sub">Group costs, made calm.</p>
        </div>
      </div>

      <div className="intro-actions">
          {userId ? (
            <Link className="button teal intro-cta" href="/dashboard">
              Open dashboard <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link className="button teal intro-cta" href="/sign-up">
                Get started <ArrowRight size={18} />
              </Link>
              <p className="intro-signin">
                Already have an account? <Link href="/sign-in">Sign in</Link>
              </p>
            </>
          )}
        </div>
    </main>
  );
}
