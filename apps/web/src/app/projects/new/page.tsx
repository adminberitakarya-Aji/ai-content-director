'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const CONTENT_TYPES = ['film', 'short-film', 'documentary', 'vlog', 'ugc', 'advertisement', 'music-video', 'live-action', 'animation', 'cartoon', 'anime', 'social-video'];
const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '21:9'];

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', description: '', contentType: 'short-film', genre: '', tone: '', audience: '', platform: '', duration: '', aspectRatio: '16:9' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const project = await api.createProject({ ...form, duration: form.duration ? parseInt(form.duration) : undefined });
      router.push(`/projects/${project.id}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Buat Project Baru</h1>
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nama Project *</label>
          <input name="name" value={form.name} onChange={handleChange} required className="w-full border rounded px-3 py-2" placeholder="Contoh: Film Pendek - Perjalanan" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Deskripsi</label>
          <textarea name="description" value={form.description} onChange={handleChange} className="w-full border rounded px-3 py-2" rows={3} placeholder="Deskripsi singkat project" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Jenis Konten *</label>
            <select name="contentType" value={form.contentType} onChange={handleChange} className="w-full border rounded px-3 py-2">
              {CONTENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Genre *</label>
            <input name="genre" value={form.genre} onChange={handleChange} required className="w-full border rounded px-3 py-2" placeholder="Contoh: Drama" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tone *</label>
            <input name="tone" value={form.tone} onChange={handleChange} required className="w-full border rounded px-3 py-2" placeholder="Contoh: Hangat" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target Audiens *</label>
            <input name="audience" value={form.audience} onChange={handleChange} required className="w-full border rounded px-3 py-2" placeholder="Contoh: Remaja" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Platform *</label>
            <input name="platform" value={form.platform} onChange={handleChange} required className="w-full border rounded px-3 py-2" placeholder="Contoh: YouTube" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Durasi (detik)</label>
            <input name="duration" type="number" value={form.duration} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="Contoh: 300" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Aspect Ratio *</label>
          <select name="aspectRatio" value={form.aspectRatio} onChange={handleChange} className="w-full border rounded px-3 py-2">
            {ASPECT_RATIOS.map((ratio) => <option key={ratio} value={ratio}>{ratio}</option>)}
          </select>
        </div>
        <div className="flex gap-4 pt-4">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Menyimpan...' : 'Buat Project'}
          </button>
          <button type="button" onClick={() => router.push('/projects')} className="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300">Batal</button>
        </div>
      </form>
    </main>
  );
}