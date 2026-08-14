export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-6 text-center">
          AI Content Production Director
        </h1>
        <p className="text-center text-lg mb-8">
          Sistem yang mengubah ide menjadi paket produksi konten visual terstruktur
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Project</h2>
            <p>Kelola project produksi konten Anda</p>
          </div>
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Bible</h2>
            <p>Character, Location, Prop, dan Style Bible</p>
          </div>
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Production</h2>
            <p>Scene, Storyboard, Prompt, dan Generation</p>
          </div>
        </div>
      </div>
    </main>
  );
}