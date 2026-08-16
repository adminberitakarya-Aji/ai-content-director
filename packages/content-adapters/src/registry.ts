import { ContentAdapter } from '../base-content-adapter.interface';
import { ShortFilmAdapter } from '../short-film/short-film.adapter';
import { UgcAdapter } from '../ugc/ugc.adapter';
import { SocialVideoAdapter } from '../social-video/social-video.adapter';

/**
 * Registry Content Adapter — titik akses tunggal untuk mengambil adapter
 * berdasarkan jenis konten Project.
 *
 * Prinsip (docs/knowledge/01_content_types.md — "Prinsip Umum Saat Content
 * Adapter Belum Diimplementasikan"): jenis konten yang adapternya belum aktif
 * tetap dapat diproses menggunakan aturan default, tapi ditandai ke pengguna
 * bahwa aturan spesifik jenis konten ini belum diterapkan.
 */

const adapters = new Map<string, ContentAdapter>();

// Adapter prioritas V1 (IMPLEMENTATION_PLAN.md Fase 6)
adapters.set('short-film', new ShortFilmAdapter());
adapters.set('ugc', new UgcAdapter());
adapters.set('social-video', new SocialVideoAdapter());

/**
 * Mengambil Content Adapter untuk jenis konten tertentu.
 * Mengembalikan undefined jika adapter belum diimplementasikan —
 * pemanggil harus fallback ke aturan default dan memberi tanda ke pengguna.
 */
export function getContentAdapter(contentType: string): ContentAdapter | undefined {
  return adapters.get(contentType);
}

/**
 * Daftar jenis konten yang adapternya sudah aktif.
 */
export function getActiveContentTypes(): string[] {
  return Array.from(adapters.keys());
}

/**
 * Cek apakah adapter untuk jenis konten tertentu sudah aktif.
 */
export function isContentAdapterActive(contentType: string): boolean {
  return adapters.has(contentType);
}