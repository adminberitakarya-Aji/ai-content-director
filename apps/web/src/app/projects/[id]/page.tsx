'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type Tab = 'story' | 'characters' | 'locations' | 'props' | 'styles';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const projectId = id as string;
  const [tab, setTab] = useState<Tab>('story');
  const [project, setProject] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [props, setProps] = useState<any[]>([]);
  const [styles, setStyles] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, [projectId]);

  async function loadAll() {
    try {
      const [p, s, c, l, pr, st] = await Promise.all([
        api.getProject(projectId),
        api.getStoryByProject(projectId),
        api.getCharacters(projectId),
        api.getLocations(projectId),
        api.getProps(projectId),
        api.getStyles(projectId),
      ]);
      setProject(p);
      setStories(s);
      setCharacters(c);
      setLocations(l);
      setProps(pr);
      setStyles(st);
    } catch (e: any) {
      setError(e.message);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'story', label: 'Story' },
    { key: 'characters', label: `Karakter (${characters.length})` },
    { key: 'locations', label: `Lokasi (${locations.length})` },
    { key: 'props', label: `Prop (${props.length})` },
    { key: 'styles', label: `Style (${styles.length})` },
  ];

  return (
    <main className="p-8 max-w-6xl mx-auto">
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}
      {project && (
        <>
          <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
          <p className="text-gray-600 mb-6">{project.genre} • {project.contentType} • {project.aspectRatio}</p>

          <div className="flex gap-2 mb-8 border-b">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 border-b-2 ${tab === t.key ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'story' && <StoryTab projectId={projectId} stories={stories} onChanged={loadAll} />}
          {tab === 'characters' && <CharacterTab projectId={projectId} characters={characters} onChanged={loadAll} />}
          {tab === 'locations' && <LocationTab projectId={projectId} locations={locations} onChanged={loadAll} />}
          {tab === 'props' && <PropTab projectId={projectId} props={props} onChanged={loadAll} />}
          {tab === 'styles' && <StyleTab projectId={projectId} styles={styles} onChanged={loadAll} />}
        </>
      )}
    </main>
  );
}

function StoryTab({ projectId, stories, onChanged }: any) {
  const [form, setForm] = useState({ concept: '', premise: '', synopsis: '', structure: '', timeline: '', creativeDirection: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e: any) {
    e.preventDefault();
    try {
      if (stories.length > 0) {
        await api.updateStory(stories[0].id, form);
      } else {
        await api.createStory({ projectId, ...form });
      }
      onChanged();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium mb-1">Konsep *</label>
          <input name="concept" value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} required className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Premis *</label>
          <input name="premise" value={form.premise} onChange={(e) => setForm({ ...form, premise: e.target.value })} required className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Sinopsis *</label>
          <textarea name="synopsis" value={form.synopsis} onChange={(e) => setForm({ ...form, synopsis: e.target.value })} required className="w-full border rounded px-3 py-2" rows={4} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Struktur Cerita</label>
          <input name="structure" value={form.structure} onChange={(e) => setForm({ ...form, structure: e.target.value })} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Timeline</label>
          <input name="timeline" value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Arahan Kreatif</label>
          <textarea name="creativeDirection" value={form.creativeDirection} onChange={(e) => setForm({ ...form, creativeDirection: e.target.value })} className="w-full border rounded px-3 py-2" rows={3} />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Simpan Story</button>
      </form>
    </div>
  );
}

function CharacterTab({ projectId, characters, onChanged }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ characterId: '', name: '', role: '', age: '', gender: '', identityDesc: '', faceShape: '', eyeColor: '', skinColor: '', defaultExpression: '', height: '', build: '', hairColor: '', hairLength: '', hairTexture: '', hairDefaultStyle: '', wardrobes: [] });
  const [error, setError] = useState('');

  async function handleSubmit(e: any) {
    e.preventDefault();
    try {
      await api.createCharacter(projectId, { ...form, wardrobes: [{ name: 'Default', clothingType: 'Default', colors: ['#000000'], isDefault: true }] });
      setShowForm(false);
      onChanged();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">Karakter</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{showForm ? 'Tutup' : '+ Tambah Karakter'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl border rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <input name="characterId" placeholder="ID (mis. A01)" value={form.characterId} onChange={(e) => setForm({ ...form, characterId: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="name" placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="role" placeholder="Peran" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="age" placeholder="Usia" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="gender" placeholder="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="identityDesc" placeholder="Deskripsi Identitas" value={form.identityDesc} onChange={(e) => setForm({ ...form, identityDesc: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="faceShape" placeholder="Bentuk Wajah" value={form.faceShape} onChange={(e) => setForm({ ...form, faceShape: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="eyeColor" placeholder="Warna Mata" value={form.eyeColor} onChange={(e) => setForm({ ...form, eyeColor: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="skinColor" placeholder="Warna Kulit" value={form.skinColor} onChange={(e) => setForm({ ...form, skinColor: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="defaultExpression" placeholder="Ekspresi Default" value={form.defaultExpression} onChange={(e) => setForm({ ...form, defaultExpression: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="height" placeholder="Tinggi" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="build" placeholder="Bentuk Tubuh" value={form.build} onChange={(e) => setForm({ ...form, build: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="hairColor" placeholder="Warna Rambut" value={form.hairColor} onChange={(e) => setForm({ ...form, hairColor: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="hairLength" placeholder="Panjang Rambut" value={form.hairLength} onChange={(e) => setForm({ ...form, hairLength: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="hairTexture" placeholder="Tekstur Rambut" value={form.hairTexture} onChange={(e) => setForm({ ...form, hairTexture: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="hairDefaultStyle" placeholder="Model Rambut" value={form.hairDefaultStyle} onChange={(e) => setForm({ ...form, hairDefaultStyle: e.target.value })} required className="border rounded px-3 py-2" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Simpan Karakter</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {characters.map((c: any) => (
          <div key={c.id} className="border rounded-lg p-4">
            <div className="flex justify-between">
              <h3 className="font-semibold">{c.name} <span className="text-gray-500 text-sm">({c.characterId})</span></h3>
              <span className={`text-xs px-2 py-1 rounded ${c.status === 'approved' ? 'bg-green-100 text-green-700' : c.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{c.role} • v{c.version}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LocationTab({ projectId, locations, onChanged }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ locationId: '', name: '', atmosphere: '', lighting: { primarySource: 'natural', direction: '', color: 'neutral', commonTimeOfDay: '' } });
  const [error, setError] = useState('');

  async function handleSubmit(e: any) {
    e.preventDefault();
    try {
      await api.createLocation(projectId, form);
      setShowForm(false);
      onChanged();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">Lokasi</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{showForm ? 'Tutup' : '+ Tambah Lokasi'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl border rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <input name="locationId" placeholder="ID (mis. L01)" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="name" placeholder="Nama Lokasi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="atmosphere" placeholder="Atmosfer" value={form.atmosphere} onChange={(e) => setForm({ ...form, atmosphere: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="lightingDirection" placeholder="Arah Cahaya" value={form.lighting.direction} onChange={(e) => setForm({ ...form, lighting: { ...form.lighting, direction: e.target.value } })} required className="border rounded px-3 py-2" />
            <input name="lightingTime" placeholder="Waktu Hari" value={form.lighting.commonTimeOfDay} onChange={(e) => setForm({ ...form, lighting: { ...form.lighting, commonTimeOfDay: e.target.value } })} required className="border rounded px-3 py-2" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Simpan Lokasi</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map((l: any) => (
          <div key={l.id} className="border rounded-lg p-4">
            <div className="flex justify-between">
              <h3 className="font-semibold">{l.name} <span className="text-gray-500 text-sm">({l.locationId})</span></h3>
              <span className={`text-xs px-2 py-1 rounded ${l.status === 'approved' ? 'bg-green-100 text-green-700' : l.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{l.atmosphere} • v{l.version}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PropTab({ projectId, props, onChanged }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ propId: '', name: '', function: '', appearance: { shape: '', size: '', colors: [], material: '', condition: '' }, continuity: {} });
  const [error, setError] = useState('');

  async function handleSubmit(e: any) {
    e.preventDefault();
    try {
      await api.createProp(projectId, form);
      setShowForm(false);
      onChanged();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">Prop</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{showForm ? 'Tutup' : '+ Tambah Prop'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl border rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <input name="propId" placeholder="ID (mis. O01)" value={form.propId} onChange={(e) => setForm({ ...form, propId: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="name" placeholder="Nama Prop" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="function" placeholder="Fungsi" value={form.function} onChange={(e) => setForm({ ...form, function: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="shape" placeholder="Bentuk" value={form.appearance.shape} onChange={(e) => setForm({ ...form, appearance: { ...form.appearance, shape: e.target.value } })} required className="border rounded px-3 py-2" />
            <input name="size" placeholder="Ukuran" value={form.appearance.size} onChange={(e) => setForm({ ...form, appearance: { ...form.appearance, size: e.target.value } })} required className="border rounded px-3 py-2" />
            <input name="material" placeholder="Material" value={form.appearance.material} onChange={(e) => setForm({ ...form, appearance: { ...form.appearance, material: e.target.value } })} required className="border rounded px-3 py-2" />
            <input name="condition" placeholder="Kondisi" value={form.appearance.condition} onChange={(e) => setForm({ ...form, appearance: { ...form.appearance, condition: e.target.value } })} required className="border rounded px-3 py-2" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Simpan Prop</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {props.map((p: any) => (
          <div key={p.id} className="border rounded-lg p-4">
            <div className="flex justify-between">
              <h3 className="font-semibold">{p.name} <span className="text-gray-500 text-sm">({p.propId})</span></h3>
              <span className={`text-xs px-2 py-1 rounded ${p.status === 'approved' ? 'bg-green-100 text-green-700' : p.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{p.function} • v{p.version}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StyleTab({ projectId, styles, onChanged }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ visualStyle: '', colorPalette: '', colorSaturation: 'medium', colorContrast: 'medium', lightingApproach: '', lightingTendency: 'natural', framingPreference: '', cameraMovementTendency: 'static' });
  const [error, setError] = useState('');

  async function handleSubmit(e: any) {
    e.preventDefault();
    try {
      await api.createStyle(projectId, form);
      setShowForm(false);
      onChanged();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">Style Bible</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{showForm ? 'Tutup' : '+ Tambah Style'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl border rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <input name="visualStyle" placeholder="Gaya Visual" value={form.visualStyle} onChange={(e) => setForm({ ...form, visualStyle: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="colorPalette" placeholder="Palet Warna" value={form.colorPalette} onChange={(e) => setForm({ ...form, colorPalette: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="lightingApproach" placeholder="Pendekatan Lighting" value={form.lightingApproach} onChange={(e) => setForm({ ...form, lightingApproach: e.target.value })} required className="border rounded px-3 py-2" />
            <input name="framingPreference" placeholder="Preferensi Framing" value={form.framingPreference} onChange={(e) => setForm({ ...form, framingPreference: e.target.value })} required className="border rounded px-3 py-2" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Simpan Style</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {styles.map((s: any) => (
          <div key={s.id} className="border rounded-lg p-4">
            <div className="flex justify-between">
              <h3 className="font-semibold">{s.visualStyle}</h3>
              <span className={`text-xs px-2 py-1 rounded ${s.status === 'approved' ? 'bg-green-100 text-green-700' : s.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{s.colorPalette} • v{s.version}</p>
          </div>
        ))}
      </div>
    </div>
  );
}