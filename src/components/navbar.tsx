import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2.5">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-xl font-bold text-gray-800">
            Clone Interview
          </Link>
          <div className="flex space-x-4">
            <Link
              href="/training"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md"
            >
              Training
            </Link>
            <Link
              href="/chat"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md"
            >
              Chat
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
