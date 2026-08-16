'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

/**
 * VideoPromptTab — UI untuk Video Prompt Engine + Budget Guard (Fase 5).
 *
 * Alur:
 * 1. Pilih Scene → pilih Shot
 * 2. Preview video prompt konseptual (compile) — dibangun di atas Image Prompt Shot
 * 3. Buat Generation Job → muncul estimasi biaya
 * 4. Approve/Reject estimasi (Budget Guard — approval eksplisit)
 * 5. Submit ke adapter (Seedance) → hasil video
 *
 * Catatan: Video Prompt memerlukan Image Prompt yang sudah ada untuk Shot yang sama.
 */
export default function VideoPromptTab({ projectId, scenes }: any) {
  const [selectedSceneId, setSelectedSceneId] = useState('');
  const [shots, setShots] = useState<any[]>([]);
  const [selectedShotId, setSelectedShotId] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<any>(null);

  useEffect(() => {
    loadCapabilities();
  }, [projectId]);

  async function loadCapabilities() {
    try {
      const caps = await api.getCapabilities(projectId);
      setCapabilities(caps);
    } catch (e: any) {
      // capability endpoint mungkin belum tersedia
      setCapabilities({ videoGenerationEnabled: true });
    }
  }

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

  async function loadJobs(shotId: string) {
    try {
      const data = await api.getVideoJobsByShot(projectId, shotId);
      setJobs(data);
    } catch (e: any) {
      // ignore
    }
  }

  function handleSceneSelect(sceneId: string) {
    setSelectedSceneId(sceneId);
    setSelectedShotId('');
    setPreview(null);
    setJobs([]);
    if (sceneId) loadShots(sceneId);
    else setShots([]);
  }

  function handleShotSelect(shotId: string) {
    setSelectedShotId(shotId);
    setPreview(null);
    if (shotId) loadJobs(shotId);
    else setJobs([]);
  }

  async function handleCompile() {
    if (!selectedShotId) return;
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      const result = await api.compileVideoPrompt(projectId, selectedShotId);
      setPreview(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateJob() {
    if (!selectedShotId) return;
    setLoading(true);
    setError('');
    try {
      await api.createVideoJob(projectId, selectedShotId);
      await loadJobs(selectedShotId);
      setPreview(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(jobId: string) {
    setLoading(true);
    setError('');
    try {
      await api.approveVideoJob(projectId, jobId);
      await loadJobs(selectedShotId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReject(jobId: string) {
    setLoading(true);
    setError('');
    try {
      await api.rejectVideoJob(projectId, jobId);
      await loadJobs(selectedShotId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(jobId: string) {
    setLoading(true);
    setError('');
    try {
      await api.submitVideoJob(projectId, jobId);
      await loadJobs(selectedShotId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const videoGenEnabled = capabilities?.videoGenerationEnabled !== false;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Video Prompt Engine</h2>
      <p className="text-sm text-gray-600">
        Video Prompt dibangun di atas Image Prompt Shot yang sama — pastikan
        Image Prompt sudah dibuat (idealnya sudah digenerate) sebagai starting
        frame untuk Seedance.
      </p>

      {!videoGenEnabled && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
          Video generation tidak aktif untuk project ini. Aktifkan di pengaturan
          capability untuk menggunakan fitur ini.
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Pilih Scene */}
      <div>
        <label className="block text-sm font-medium mb-1">Scene</label>
        <select
          className="w-full border rounded px-3 py-2 text-sm"
          value={selectedSceneId}
          onChange={(e) => handleSceneSelect(e.target.value)}
        >
          <option value="">-- Pilih Scene --</option>
          {(scenes || []).map((s: any) => (
            <option key={s.id} value={s.id}>
              Scene {s.sceneNumber}
              {s.title ? `: ${s.title}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Pilih Shot */}
      {selectedSceneId && (
        <div>
          <label className="block text-sm font-medium mb-1">Shot</label>
          {loading && shots.length === 0 ? (
            <p className="text-sm text-gray-500">Memuat shots...</p>
          ) : shots.length === 0 ? (
            <p className="text-sm text-gray-500">
              Belum ada shot di scene ini. Buat shot di tab Storyboard terlebih
              dahulu.
            </p>
          ) : (
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={selectedShotId}
              onChange={(e) => handleShotSelect(e.target.value)}
            >
              <option value="">-- Pilih Shot --</option>
              {shots.map((shot: any) => (
                <option key={shot.id} value={shot.id}>
                  Shot {shot.shotNumber} — {shot.shotType} ({shot.framing})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Aksi untuk Shot terpilih */}
      {selectedShotId && videoGenEnabled && (
        <div className="flex gap-2">
          <button
            onClick={handleCompile}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Preview Video Prompt'}
          </button>
          <button
            onClick={handleCreateJob}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Buat Generation Job'}
          </button>
        </div>
      )}

      {/* Preview Video Prompt Konseptual */}
      {preview && (
        <div className="border rounded p-4 bg-gray-50">
          <h3 className="font-medium mb-2">Preview Video Prompt Konseptual</h3>

          {preview.hasSourceImage === false && (
            <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded text-orange-800 text-xs">
              Starting frame (gambar hasil Flux) belum tersedia untuk Shot ini.
              Video prompt bisa di-preview, tetapi submit ke Seedance memerlukan
              gambar yang sudah digenerate di Image Prompt Engine.
            </div>
          )}

          {preview.warnings?.length > 0 && (
            <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs">
              {preview.warnings.map((w: string, i: number) => (
                <div key={i}>⚠ {w}</div>
              ))}
            </div>
          )}
          <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap">
            {JSON.stringify(preview.conceptualPrompt, null, 2)}
          </pre>
          <div className="mt-2 text-xs text-gray-500">
            Bible versions: {JSON.stringify(preview.bibleVersions)}
          </div>
        </div>
      )}

      {/* Daftar Generation Jobs Video */}
      {selectedShotId && jobs.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">Video Generation Jobs</h3>
          <div className="space-y-2">
            {jobs.map((job: any) => (
              <div key={job.id} className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm">
                    <span className="font-medium">Job v{job.promptVersion}</span>
                    <span className="ml-2 text-gray-500">
                      {new Date(job.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <StatusBadge status={job.status} />
                </div>

                <div className="text-sm mb-2">
                  Estimasi biaya:{' '}
                  <span className="font-medium">
                    {job.currency} {job.costEstimate?.toFixed(4)}
                  </span>
                  {job.costActual != null && (
                    <span className="ml-2 text-gray-500">
                      (aktual: {job.currency} {job.costActual.toFixed(4)})
                    </span>
                  )}
                </div>

                {job.errorMessage && (
                  <div className="text-xs text-red-600 mb-2">
                    Error: {job.errorMessage}
                  </div>
                )}

                {job.outputAssetUrl && (
                  <div className="mb-2">
                    <video
                      src={job.outputAssetUrl}
                      controls
                      className="max-w-md rounded border"
                    />
                  </div>
                )}

                {/* Aksi berdasarkan status — Budget Guard: approve eksplisit wajib */}
                <div className="flex gap-2">
                  {job.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(job.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve Biaya
                      </button>
                      <button
                        onClick={() => handleReject(job.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {job.status === 'approved' && (
                    <button
                      onClick={() => handleSubmit(job.id)}
                      disabled={loading}
                      className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:opacity-50"
                    >
                      Submit ke Seedance
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    submitted: 'bg-indigo-100 text-indigo-800',
    processing: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    rejected: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        colors[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {status}
    </span>
  );
}