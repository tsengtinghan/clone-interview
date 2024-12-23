export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <main className="flex flex-col items-center text-center space-y-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-800">
            Train Your Digital Interview Clone
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl">
            Create an AI version of yourself that can answer questions
            in your style. Complete the training process, then chat with your
            digital clone.
          </p>

          <div className="grid gap-6 w-full max-w-2xl">
            <div className="p-6 border rounded-lg bg-white shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                1. Training Mode
              </h2>
              <p className="text-gray-600 mb-4">
                Answer a series of questions to help build your digital clone's
                knowledge base.
              </p>
              <a
                href="/training"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md transition-colors"
              >
                Start Training
              </a>
            </div>

            <div className="p-6 border rounded-lg bg-white shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                2. Chat Mode
              </h2>
              <p className="text-gray-600 mb-4">
                Interview your digital clone and see how it responds using your
                trained data.
              </p>
              <a
                href="/chat"
                className="inline-block border border-orange-500 text-orange-500 hover:bg-orange-50 px-6 py-2 rounded-md transition-colors"
              >
                Open Chat
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
