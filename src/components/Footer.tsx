import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <p className="text-sm text-gray-400">tangie© {new Date().getFullYear()}</p>
        <div className="flex items-center gap-6">
          <Link href="/design-system" className="text-sm text-gray-400 hover:text-navy transition-colors">Design system</Link>
          <a href="#" className="text-sm text-gray-400 hover:text-navy transition-colors">Privacy</a>
          <a href="#" className="text-sm text-gray-400 hover:text-navy transition-colors">Terms</a>
          <a href="#" className="text-sm text-gray-400 hover:text-navy transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
