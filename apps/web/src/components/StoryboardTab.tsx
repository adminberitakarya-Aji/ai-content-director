'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

const SHOT_TYPES = [
  'extreme-wide',
  'wide',
  'medium',
  'close-up',
  'extreme-close-up',
  'over-the-shoulder',
  'pov',
];

const CAMERA_POSITIONS = [
  'eye-level',
  'high-angle',
  'low-angle',
  'birds-eye',
  'worms-eye',
];

const CAMERA_MOVEMENTS = [
  'static',
  'pan',
  'tilt',
  'dolly',
  'tracking',
  'handheld',
  'crane',
  'zoom',
];

export default function StoryboardTab({ projectId, scenes, onChanged }: any) {
  const [selectedSceneId, setSelectedSceneId] = useState<string>('');
  const [shots, setShots] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    shotNumber: '',
    shotType: 'medium',
    framing: '',
    composition: '',
    cameraPosition: 'eye-level',
    lens: '',
    cameraMovement: 'static',
    characterBlocking: [] as any[],
    visualBeat: '',
  });

  async function loadShots(sceneId: string) {
    setLoading(true);
    setError('');
    try {
      const data = await api.getShotsByScene(projectId, sceneId);
      setShots(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSceneSelect(sceneId: string) {
    setSelectedSceneId(sceneId);
    setShowForm(false);
    if (sceneId) {
      loadShots(sceneId);
    } else {
      setShots([]);
    }
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setError('');
    try {
      await api.createShot(projectId, selectedSceneId, {
        ...form,
        shotNumber: parseInt(form.shotNumber),
        characterBlocking: form.characterBlocking.filter((b: any) => b.characterId && b.position && b.orientation),
      });
      setShowForm(false);
      setForm({
        shotNumber: String(shots.length + 1),
        shotType: 'medium',
        framing: '',
        composition: '',
        cameraPosition: 'eye-level',
        lens: '',
        cameraMovement: 'static',
        characterBlocking: [],
        visualBeat: '',
      });
      loadShots(selectedSceneId);
      onChanged();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDelete(shotId: string) {
    if (!confirm('Hapus shot ini?')) return;
    try {
      await api.deleteShot(projectId, shotId);
      loadShots(selectedSceneId);
      onChanged();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleMove(shotId: string, direction: -1 | 1) {
    const index = shots.findIndex((s) => s.id === shotId);
    const target = index + direction;
    if (target < 0 || target >= shots.length) return;

    const newOrder = [...shots];
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    try {
      await api.reorderShots(projectId, selectedSceneId, newOrder.map((s) => s.id));
      loadShots(selectedSceneId);
      onChanged();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function addBlockingRow() {
    setForm({
      ...form,
      characterBlocking: [...form.characterBlocking, { characterId: '', position: '', orientation: '' }],
    });
  }

  function updateBlockingRow(idx: number, field: string, value: string) {
    const rows = [...form.characterBlocking];
    rows[idx] = { ...rows[idx], [field]: value };
    setForm({ ...form, characterBlocking: rows });
  }

  const selectedScene = scenes.find((s: any) => s.id === selectedSceneId);
  const sceneCharacters = selectedScene?.characterIds || [];

  return (
    <div>
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Storyboard</h2>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Pilih Scene</label>
        <select
          value={selectedSceneId}
          onChange={(e) => handleSceneSelect(e.target.value)}
          className="w-full max-w-md border rounded px-3 py-2"
        >
          <option value="">Pilih scene untuk melihat shot list...</option>
          {scenes.map((s: any) => (
            <option key={s.id} value={s.id}>
              Scene {s.sceneNumber}{s.title ? ` — ${s.title}` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedSceneId && (
        <>
          <div className="flex justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">
                Scene {selectedScene?.sceneNumber} • {selectedScene?.time} • Karakter: {(selectedScene?.characterIds || []).join(', ')}
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {showForm ? 'Tutup' : '+ Tambah Shot'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-3 max-w-3xl border rounded-lg p-6 mb-6">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Nomor Shot *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.shotNumber}
                    onChange={(e) => setForm({ ...form, shotNumber: e.target.value })}
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Shot Type *</label>
                  <select
                    value={form.shotType}
                    onChange={(e) => setForm({ ...form, shotType: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    {SHOT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Camera Position *</label>
                  <select
                    value={form.cameraPosition}
                    onChange={(e) => setForm({ ...form, cameraPosition: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    {CAMERA_POSITIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Framing *</label>
                  <input
                    placeholder="mis. rule of thirds, center framing"
                    value={form.framing}
                    onChange={(e) => setForm({ ...form, framing: e.target.value })}
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Composition *</label>
                  <input
                    placeholder="mis. foreground, midground, background"
                    value={form.composition}
                    onChange={(e) => setForm({ ...form, composition: e.target.value })}
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lens</label>
                  <input
                    placeholder="mis. 35mm, telephoto (opsional)"
                    value={form.lens}
                    onChange={(e) => setForm({ ...form, lens: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Camera Movement</label>
                  <select
                    value={form.cameraMovement}
                    onChange={(e) => setForm({ ...form, cameraMovement: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    {CAMERA_MOVEMENTS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Visual Beat *</label>
                <input
                  placeholder="Satu kalimat inti fokus visual shot ini"
                  value={form.visualBeat}
                  onChange={(e) => setForm({ ...form, visualBeat: e.target.value })}
                  required
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Character Blocking</label>
                {form.characterBlocking.map((b: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                    <select
                      value={b.characterId}
                      onChange={(e) => updateBlockingRow(idx, 'characterId', e.target.value)}
                      className="border rounded px-3 py-2"
                    >
                      <option value="">Pilih karakter...</option>
                      {sceneCharacters.map((cid: string) => (
                        <option key={cid} value={cid}>{cid}</option>
                      ))}
                    </select>
                    <input
                      placeholder="Posisi (mis. kiri frame)"
                      value={b.position}
                      onChange={(e) => updateBlockingRow(idx, 'position', e.target.value)}
                      className="border rounded px-3 py-2"
                    />
                    <input
                      placeholder="Orientasi (mis. menghadap kamera)"
                      value={b.orientation}
                      onChange={(e) => updateBlockingRow(idx, 'orientation', e.target.value)}
                      className="border rounded px-3 py-2"
                    />
                  </div>
                ))}
                <button type="button" onClick={addBlockingRow} className="text-blue-600 text-sm">
                  + Tambah blocking
                </button>
              </div>

              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                Simpan Shot
              </button>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">Memuat shot list...</div>
          ) : shots.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Belum ada shot untuk scene ini. Klik "+ Tambah Shot" untuk mulai.
            </div>
          ) : (
            <div className="space-y-3">
              {shots.map((shot: any, idx: number) => {
                const unresolvedFlags = (shot.continuityFlags || []).filter((f: any) => f.status === 'unresolved');
                return (
                  <div key={shot.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">Shot {shot.shotNumber}</h3>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{shot.shotType}</span>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{shot.cameraPosition}</span>
                          {shot.cameraMovement && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{shot.cameraMovement}</span>
                          )}
                          {unresolvedFlags.length > 0 ? (
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                              ⚠ {unresolvedFlags.length} flag
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">✓ OK</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Framing:</strong> {shot.framing} • <strong>Composition:</strong> {shot.composition}
                        </p>
                        {shot.lens && <p className="text-sm text-gray-600"><strong>Lens:</strong> {shot.lens}</p>}
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Visual Beat:</strong> {shot.visualBeat}
                        </p>
                        {shot.characterBlocking && shot.characterBlocking.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500">Character Blocking:</p>
                            {shot.characterBlocking.map((b: any, bi: number) => (
                              <p key={bi} className="text-sm text-gray-600">
                                {b.characterId}: {b.position} — {b.orientation}
                              </p>
                            ))}
                          </div>
                        )}
                        {unresolvedFlags.length > 0 && (
                          <div className="mt-2 bg-red-50 border border-red-200 rounded p-2">
                            {unresolvedFlags.map((f: any) => (
                              <p key={f.id} className="text-xs text-red-700">
                                ⚠ {f.description}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleMove(shot.id, -1)}
                          disabled={idx === 0}
                          className="px-2 py-1 border rounded text-sm disabled:opacity-30"
                          title="Naikkan urutan"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMove(shot.id, 1)}
                          disabled={idx === shots.length - 1}
                          className="px-2 py-1 border rounded text-sm disabled:opacity-30"
                          title="Turunkan urutan"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleDelete(shot.id)}
                          className="px-2 py-1 border rounded text-sm text-red-600 hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {!selectedSceneId && (
        <div className="text-center py-12 text-gray-500">
          Pilih scene untuk melihat dan mengelola shot list.
        </div>
      )}
    </div>
  );
}