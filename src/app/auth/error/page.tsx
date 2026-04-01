import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-4xl mb-4">😕</p>
        <h1 className="text-xl font-bold text-navy mb-2">Sign-in failed</h1>
        <p className="text-gray-500 text-sm mb-6">Something went wrong. Please try again.</p>
        <Link href="/" className="text-sm text-green-600 font-semibold hover:underline">
          Back to Tangie
        </Link>
      </div>
    </div>
  );
}
