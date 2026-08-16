'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

/**
 * ReviewTab — Halaman Review terpusat (Fase 6.2).
 *
 * Menampilkan antrean review untuk semua entitas produksi:
 * - Bible (character/location/prop/style)
 * - Shot (Storyboard)
 * - GenerationJob (hasil image/video)
 *
 * Prinsip (docs/instructions/02_decision_rules.md):
 * Wewenang approval selalu di tangan manusia. UI ini hanya menyajikan
 * informasi dan tombol approve/reject — keputusan tetap di pengguna.
 */

const ENTITY_TYPE_LABELS: Record<string, string> = {
  character: 'Character Bible',
  location: 'Location Bible',
  prop: 'Prop Bible',
  style: 'Style Bible',
  shot: 'Shot (Storyboard)',
  'generation-job': 'Hasil Generation',
};

const ENTITY_TYPE_COLORS: Record<string, string> = {
  character: 'bg-blue-100 text-blue-700',
  location: 'bg-green-100 text-green-700',
  prop: 'bg-yellow-100 text-yellow-700',
  style: 'bg-purple-100 text-purple-700',
  shot: 'bg-indigo-100 text-indigo-700',
  'generation-job': 'bg-pink-100 text-pink-700',
};

export default function ReviewTab({ projectId, onChanged }: any) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadReviews() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getPendingReviews(projectId, typeFilter || undefined);
      setReviews(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, [projectId, typeFilter]);

  async function handleApprove(item: any) {
    setProcessingId(item.id);
    setError('');
    try {
      // Tentukan status approved berdasarkan jenis entitas
      const approvedStatus = item.entityType === 'generation-job' ? 'final' : 'approved';
      await api.updateReviewStatus(projectId, item.entityType, item.id, approvedStatus);
      await loadReviews();
      onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(item: any) {
    if (!confirm(`Reject ${item.reviewLabel}? Entitas terkait akan kembali ke status draft/revisi.`)) {
      return;
    }
    setProcessingId(item.id);
    setError('');
    try {
      // Tentukan status rejected berdasarkan jenis entitas
      const rejectedStatus = item.entityType === 'generation-job' ? 'review_rejected' : 'rejected';
      await api.updateReviewStatus(projectId, item.entityType, item.id, rejectedStatus);
      await loadReviews();
      onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessingId(null);
    }
  }

  const filterOptions = [
    { value: '', label: 'Semua Jenis' },
    { value: 'character', label: 'Character Bible' },
    { value: 'location', label: 'Location Bible' },
    { value: 'prop', label: 'Prop Bible' },
    { value: 'style', label: 'Style Bible' },
    { value: 'shot', label: 'Shot (Storyboard)' },
    { value: 'generation-job', label: 'Hasil Generation' },
  ];

  return (
    <div>
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Review Terpusat</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Filter:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            {filterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={loadReviews}
            className="px-3 py-2 border rounded text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Semua entitas yang menunggu review manusia. Approve untuk melanjutkan ke tahap berikutnya,
        reject untuk mengembalikan ke draft/revisi.
      </p>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Memuat antrean review...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Tidak ada entitas yang menunggu review saat ini.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((item: any) => {
            const isProcessing = processingId === item.id;
            const colorClass = ENTITY_TYPE_COLORS[item.entityType] || 'bg-gray-100 text-gray-700';
            const typeLabel = ENTITY_TYPE_LABELS[item.entityType] || item.entityType;

            return (
              <div key={`${item.entityType}-${item.id}`} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded ${colorClass}`}>{typeLabel}</span>
                      <h3 className="font-semibold">{item.reviewLabel}</h3>
                      {item.unresolvedFlagCount > 0 && (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                          ⚠ {item.unresolvedFlagCount} continuity flag
                        </span>
                      )}
                    </div>

                    {/* Detail tambahan berdasarkan jenis entitas */}
                    {item.entityType === 'shot' && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p>
                          <strong>Shot Type:</strong> {item.shotType} •{' '}
                          <strong>Camera:</strong> {item.cameraPosition}
                          {item.cameraMovement ? ` (${item.cameraMovement})` : ''}
                        </p>
                        <p className="mt-1">
                          <strong>Visual Beat:</strong> {item.visualBeat}
                        </p>
                      </div>
                    )}

                    {item.entityType === 'generation-job' && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p>
                          <strong>Tipe:</strong> {item.type} •{' '}
                          <strong>Adapter:</strong> {item.adapterName}
                        </p>
                        {item.outputAssetUrl && (
                          <p className="mt-1">
                            <strong>Output:</strong>{' '}
                            <a
                              href={item.outputAssetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Lihat Hasil
                            </a>
                          </p>
                        )}
                        {item.costActual != null && (
                          <p className="mt-1">
                            <strong>Biaya:</strong> {item.currency} {item.costActual.toFixed(4)}
                          </p>
                        )}
                      </div>
                    )}

                    {(item.entityType === 'character' || item.entityType === 'location' || item.entityType === 'prop') && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p>
                          <strong>Versi:</strong> v{item.version} •{' '}
                          <strong>Status:</strong> {item.status}
                        </p>
                      </div>
                    )}

                    {item.entityType === 'style' && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p>
                          <strong>Visual Style:</strong> {item.visualStyle}
                        </p>
                        <p className="mt-1">
                          <strong>Color Palette:</strong> {item.colorPalette}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {isProcessing ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(item)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {isProcessing ? '...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}