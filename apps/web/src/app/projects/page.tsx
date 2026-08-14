'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin ingin menghapus project ini?')) return;
    try {
      await api.deleteProject(id);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Link
          href="/projects/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Buat Project
        </Link>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          Belum ada project. Buat project pertama Anda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="border rounded-lg p-6 hover:shadow-lg transition">
              <Link href={`/projects/${project.id}`}>
                <h2 className="text-xl font-semibold mb-2">{project.name}</h2>
              </Link>
              <p className="text-sm text-gray-600 mb-2">{project.genre} • {project.contentType}</p>
              <p className="text-sm text-gray-500 mb-4">{project.description || 'Tidak ada deskripsi'}</p>
              <div className="flex justify-between items-center">
                <span className={`text-xs px-2 py-1 rounded ${
                  project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {project.status}
                </span>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="text-red-600 text-sm hover:underline"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}