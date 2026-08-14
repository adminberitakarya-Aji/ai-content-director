'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function SceneTab({ projectId, scenes, characters, locations, onChanged }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    sceneNumber: '',
    title: '',
    characterIds: [] as string[],
    locationId: '',
    propIds: [] as string[],
    time: '',
    action: '',
    emotions: [{ characterId: '', emotion: '' }],
    dialogues: [] as any[],
  });
  const [error, setError] = useState('');

  async function handleSubmit(e: any) {
    e.preventDefault();
    setError('');
    try {
      await api.createScene(projectId, {
        ...form,
        sceneNumber: parseInt(form.sceneNumber),
        emotions: form.emotions.filter((em: any) => em.characterId && em.emotion),
      });
      setShowForm(false);
      setForm({ sceneNumber: '', title: '', characterIds: [], locationId: '', propIds: [], time: '', action: '', emotions: [{ characterId: '', emotion: '' }], dialogues: [] });
      onChanged();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function toggleCharacter(id: string) {
    const exists = form.characterIds.includes(id);
    setForm({
      ...form,
      characterIds: exists ? form.characterIds.filter((c) => c !== id) : [...form.characterIds, id],
    });
  }

  return (
    <div>
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">Scene</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          {showForm ? 'Tutup' : '+ Tambah Scene'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-3xl border rounded-lg p-6 mb-6">
          <div className="grid grid-cols-3 gap-3">
            <input type="number" min="1" placeholder="Nomor Scene *" value={form.sceneNumber} onChange={(e) => setForm({ ...form, sceneNumber: e.target.value })} required className="border rounded px-3 py-2" />
            <input placeholder="Judul (opsional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border rounded px-3 py-2" />
            <input placeholder="Waktu (mis. Pagi hari)" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required className="border rounded px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Lokasi *</label>
            <select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} required className="w-full border rounded px-3 py-2">
              <option value="">Pilih lokasi...</option>
              {locations.map((l: any) => (
                <option key={l.id} value={l.locationId}>{l.name} ({l.locationId})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Karakter *</label>
            <div className="flex flex-wrap gap-2">
              {characters.map((c: any) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggleCharacter(c.characterId)}
                  className={`px-3 py-1 rounded border ${form.characterIds.includes(c.characterId) ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  {c.name} ({c.characterId})
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Aksi *</label>
            <textarea value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} required className="w-full border rounded px-3 py-2" rows={3} placeholder="Urutan kejadian konkret dalam scene" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Emosi Karakter</label>
            {form.emotions.map((em: any, idx: number) => (
              <div key={idx} className="grid grid-cols-2 gap-2 mb-2">
                <select
                  value={em.characterId}
                  onChange={(e) => {
                    const emotions = [...form.emotions];
                    emotions[idx] = { ...emotions[idx], characterId: e.target.value };
                    setForm({ ...form, emotions });
                  }}
                  className="border rounded px-3 py-2"
                >
                  <option value="">Pilih karakter...</option>
                  {characters.map((c: any) => (
                    <option key={c.id} value={c.characterId}>{c.name}</option>
                  ))}
                </select>
                <input
                  placeholder="Emosi (mis. marah)"
                  value={em.emotion}
                  onChange={(e) => {
                    const emotions = [...form.emotions];
                    emotions[idx] = { ...emotions[idx], emotion: e.target.value };
                    setForm({ ...form, emotions });
                  }}
                  className="border rounded px-3 py-2"
                />
              </div>
            ))}
            <button type="button" onClick={() => setForm({ ...form, emotions: [...form.emotions, { characterId: '', emotion: '' }] })} className="text-blue-600 text-sm">
              + Tambah emosi
            </button>
          </div>

          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Simpan Scene</button>
        </form>
      )}

      <div className="space-y-4">
        {scenes.map((scene: any) => (
          <Link href={`/projects/${projectId}/scenes/${scene.id}`} key={scene.id} className="block border rounded-lg p-4 hover:shadow-lg transition">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Scene {scene.sceneNumber}{scene.title ? ` — ${scene.title}` : ''}</h3>
                <p className="text-sm text-gray-600 mt-1">Lokasi: {scene.locationId} • Waktu: {scene.time}</p>
                <p className="text-sm text-gray-600">Karakter: {(scene.characterIds || []).join(', ')}</p>
              </div>
              <div className="flex gap-2">
                {scene.continuityFlags && scene.continuityFlags.filter((f: any) => f.status === 'unresolved').length > 0 ? (
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                    ⚠ {scene.continuityFlags.filter((f: any) => f.status === 'unresolved').length} flag
                  </span>
                ) : (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">✓ OK</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {scenes.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">Belum ada scene. Klik "+ Tambah Scene" untuk mulai.</div>
      )}
    </div>
  );
}