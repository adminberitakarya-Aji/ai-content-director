"""
Video Prompt Compiler — menyusun Video Prompt konseptual di atas Image Prompt.

Struktur prompt konseptual mengikuti docs/knowledge/09_video_prompt_system.md:
- Subject (diwarisi dari Image Prompt — dirujuk sebagai starting frame, bukan dideskripsikan ulang)
- Action (wajib): dari Scene, dipersempit ke porsi Shot ini lewat visual beat
- Character Motion (wajib jika ada Character): arah, kecepatan relatif, hubungan dengan Emotion
- Camera Motion (wajib): dari Camera Movement di Storyboard Engine
- Environment Motion (opsional): elemen lingkungan bergerak yang relevan
- Physics (wajib): logika dunia nyata kecuali Style Bible eksplisit non-realistis
- Temporal Logic (wajib): urutan kejadian awal/tengah/akhir dalam durasi Shot
- Cinematography (diwarisi dari Image Prompt, ditambah dimensi waktu)
- Constraints (wajib): durasi Shot + aspect ratio Project

Aturan compile mengikuti docs/instructions/07_prompt_rules.md:
- Video Prompt dibangun di atas hasil Image Prompt — jangan mendeskripsikan ulang
  elemen visual statis; fokus pada elemen gerak.
- Prompt tidak pernah dikarang bebas — semua elemen traceable ke Shot/Bible/instruksi user.
- Prompt konseptual netral terhadap model (constraint teknis model ditangani adapter).
- Tahan compile jika ada field wajib kosong atau ContinuityFlag unresolved.
"""

from dataclasses import dataclass, field
from typing import Any, Optional


# Kata kunci pada Style Bible yang menandakan gaya non-realistis secara eksplisit.
# Jika terdeteksi, Physics tidak lagi mengharuskan logika dunia nyata
# (docs/knowledge/09_video_prompt_system.md — Physics).
_NON_REALISTIC_STYLE_KEYWORDS = [
    "animation",
    "animasi",
    "cartoon",
    "kartun",
    "anime",
    "stylized",
    "stilasi",
    "non-realistic",
    "non-realistis",
    "surreal",
]


@dataclass
class VideoPromptInput:
    """Input untuk compile Video Prompt — semua data diambil dari database oleh API."""

    # Shot data
    shot_id: str
    shot_number: int
    shot_type: str
    framing: str
    composition: str
    camera_position: str
    lens: Optional[str] = None
    camera_movement: Optional[str] = None
    character_blocking: list[dict[str, str]] = field(default_factory=list)
    visual_beat: str = ""

    # Scene data
    scene_time: str = ""
    scene_action: str = ""
    scene_emotions: list[dict[str, str]] = field(default_factory=list)

    # Bible data (untuk character motion & konteks environment)
    characters: list[dict[str, Any]] = field(default_factory=list)
    location: Optional[dict[str, Any]] = None
    style: Optional[dict[str, Any]] = None

    # Image Prompt yang menjadi dasar (WAJIB — Video Prompt dibangun di atasnya).
    # Berisi prompt konseptual image untuk Shot yang sama (hasil compile Image Prompt).
    image_prompt: Optional[dict[str, Any]] = None

    # URL gambar hasil generation (mis. output Flux) sebagai starting frame.
    # Opsional saat preview; wajib ada sebelum submit ke adapter image-to-video
    # (divalidasi di lapisan adapter, bukan di sini).
    source_image_url: Optional[str] = None

    # Durasi Shot dalam detik (jika ada batasan dari Content Adapter/keputusan produksi).
    # Constraint teknis model (mis. durasi maksimum Seedance) ditangani di adapter.
    duration_seconds: Optional[float] = None

    # Project settings
    aspect_ratio: str = "16:9"

    # Continuity status
    unresolved_flags: list[dict[str, str]] = field(default_factory=list)


@dataclass
class VideoPromptResult:
    """Hasil compile Video Prompt konseptual."""

    success: bool
    prompt: Optional[dict[str, Any]] = None
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    bible_versions: dict[str, Any] = field(default_factory=dict)


def compile_video_prompt(input_data: VideoPromptInput) -> VideoPromptResult:
    """
    Compile Video Prompt konseptual dari Image Prompt + Scene + Shot + Bible.

    Returns VideoPromptResult dengan:
    - success: True jika compile berhasil
    - prompt: dict dengan struktur prompt konseptual video (Action, Character Motion, dll)
    - errors: daftar error yang menahan compile
    - warnings: daftar peringatan (tidak menahan compile)
    - bible_versions: snapshot versi Bible yang dipakai untuk auditability
    """
    errors: list[str] = []
    warnings: list[str] = []

    # === Validasi pra-compile (docs/instructions/07_prompt_rules.md) ===
    # Tahan jika ada ContinuityFlag unresolved
    if input_data.unresolved_flags:
        for flag in input_data.unresolved_flags:
            errors.append(
                f"ContinuityFlag unresolved: {flag.get('flagType', 'unknown')} - "
                f"{flag.get('description', 'tidak ada deskripsi')}"
            )

    # Video Prompt dibangun di atas Image Prompt — wajib ada
    if not input_data.image_prompt:
        errors.append(
            "Image Prompt untuk Shot ini belum ada. Video Prompt dibangun di atas "
            "Image Prompt — compile Image Prompt terlebih dahulu."
        )

    # Action wajib (diambil dari Scene)
    if not input_data.scene_action or not input_data.scene_action.strip():
        errors.append("Action Scene wajib diisi untuk compile Video Prompt")

    if errors:
        return VideoPromptResult(success=False, errors=errors)

    # === Snapshot Bible versions (auditability) ===
    bible_versions: dict[str, Any] = {
        "character": {},
        "location": {},
        "prop": {},
        "style": None,
    }

    characters_by_id = {c.get("characterId", ""): c for c in input_data.characters}
    for char_id, char in characters_by_id.items():
        if char_id:
            bible_versions["character"][char_id] = char.get("version", 0)

    location = input_data.location or {}
    if location.get("locationId"):
        bible_versions["location"][location.get("locationId")] = location.get("version", 0)

    style = input_data.style or {}
    if style:
        bible_versions["style"] = style.get("version", 0)

    # Prop versions diwarisi dari Image Prompt (tidak diakses ulang di sini)
    image_prompt = input_data.image_prompt or {}

    # === Action: dari Scene, dipersempit ke porsi Shot ini ===
    # Satu Scene bisa punya beberapa Shot; visual beat menandai porsi Shot ini.
    action = input_data.scene_action.strip()
    shot_focus = input_data.visual_beat.strip() if input_data.visual_beat else ""
    if not shot_focus:
        warnings.append(
            "Visual beat Shot kosong — Action Scene dipakai utuh tanpa dipersempit "
            "ke porsi Shot ini. Tambahkan visual beat untuk fokus gerakan yang lebih spesifik."
        )

    # === Character Motion (wajib jika ada Character di Shot) ===
    character_motion = _build_character_motion(
        input_data.character_blocking,
        characters_by_id,
        input_data.scene_emotions,
        action,
        warnings,
    )

    # === Camera Motion (wajib) ===
    camera_movement = (input_data.camera_movement or "").strip()
    if not camera_movement:
        camera_movement = "static"
        warnings.append(
            "Camera movement Shot kosong — default 'static' dipakai. "
            "Isi camera movement di Storyboard untuk instruksi gerak kamera yang eksplisit."
        )

    camera_motion = {
        "movement": camera_movement,
        "shotType": input_data.shot_type,
        "position": input_data.camera_position,
        "lens": input_data.lens,
        "instruction": _build_camera_instruction(
            camera_movement, input_data.shot_type, input_data.camera_position
        ),
    }

    # === Environment Motion (opsional) ===
    # Hanya diisi dari data yang traceable: atmosfer lokasi + waktu Scene sebagai
    # konteks gerak lingkungan. Elemen spesifik tanpa sumber data tidak dikarang.
    environment_motion = _build_environment_motion(
        location, input_data.scene_time
    )

    # === Physics (wajib) ===
    physics = _build_physics(style)

    # === Temporal Logic (wajib) ===
    temporal_logic = _build_temporal_logic(
        action, shot_focus, character_motion, camera_movement
    )

    # === Cinematography (diwarisi dari Image Prompt + movement) ===
    image_camera = image_prompt.get("camera", {}) if isinstance(image_prompt, dict) else {}
    cinematography = {
        "shotType": image_camera.get("shotType") or input_data.shot_type,
        "position": image_camera.get("position") or input_data.camera_position,
        "lens": image_camera.get("lens") or input_data.lens,
        "framing": input_data.framing,
        "composition": input_data.composition,
        "movement": camera_movement,
    }

    # === Constraints (wajib) ===
    constraints: dict[str, Any] = {
        "aspectRatio": input_data.aspect_ratio,
    }
    if input_data.duration_seconds is not None:
        constraints["durationSeconds"] = input_data.duration_seconds
    else:
        warnings.append(
            "Durasi Shot belum ditentukan — adapter video akan memakai durasi default model. "
            "Set durasi di keputusan produksi/Content Adapter jika ada batasan."
        )

    # === Susun prompt konseptual ===
    # Subject diwarisi dari Image Prompt — dirujuk sebagai starting frame,
    # tidak dideskripsikan ulang (docs/knowledge/09_video_prompt_system.md).
    prompt = {
        "baseImagePrompt": image_prompt,
        "sourceImageUrl": input_data.source_image_url,
        "subjectReference": {
            "note": (
                "Subject diwarisi dari Image Prompt Shot ini sebagai starting frame; "
                "elemen visual statis tidak dideskripsikan ulang."
            ),
            "subjects": image_prompt.get("subject", []) if isinstance(image_prompt, dict) else [],
        },
        "action": action,
        "shotFocus": shot_focus,
        "characterMotion": character_motion,
        "cameraMotion": camera_motion,
        "environmentMotion": environment_motion,
        "physics": physics,
        "temporalLogic": temporal_logic,
        "cinematography": cinematography,
        "constraints": constraints,
        "sceneContext": {
            "time": input_data.scene_time,
        },
    }

    return VideoPromptResult(
        success=True,
        prompt=prompt,
        warnings=warnings,
        bible_versions=bible_versions,
    )


def _build_character_motion(
    character_blocking: list[dict[str, str]],
    characters_by_id: dict[str, dict[str, Any]],
    scene_emotions: list[dict[str, str]],
    action: str,
    warnings: list[str],
) -> list[dict[str, Any]]:
    """
    Susun Character Motion untuk tiap Character yang ada di Shot.

    Sumber data (traceable, tidak dikarang bebas):
    - Posisi & orientasi dari characterBlocking (Shot)
    - Emosi dari Scene (memengaruhi cara gerakan dieksekusi)
    - Action Scene sebagai gerakan induk
    """
    motions: list[dict[str, Any]] = []

    if not character_blocking:
        # Tidak ada karakter teridentifikasi di Shot ini — boleh lanjut
        # (mis. establishing shot tanpa karakter), dengan catatan.
        warnings.append(
            "Tidak ada character blocking di Shot ini — Character Motion kosong. "
            "Ini wajar untuk shot tanpa karakter (mis. establishing shot)."
        )
        return motions

    for blocking in character_blocking:
        char_id = blocking.get("characterId", "")
        if not char_id:
            continue

        char = characters_by_id.get(char_id)
        if char is None:
            warnings.append(
                f"Character {char_id} ada di blocking tapi data Bible-nya tidak ditemukan "
                "pada request compile — motion disusun hanya dari blocking."
            )

        emotion = next(
            (e.get("emotion") for e in scene_emotions if e.get("characterId") == char_id),
            (char or {}).get("defaultExpression", ""),
        )

        position = blocking.get("position", "")
        orientation = blocking.get("orientation", "")

        motion_parts: list[str] = []
        if action:
            motion_parts.append(action)
        if position:
            motion_parts.append(f"berada di {position}")
        if orientation:
            motion_parts.append(f"menghadap {orientation}")
        if emotion:
            motion_parts.append(f"dengan emosi {emotion}")

        motions.append(
            {
                "characterId": char_id,
                "name": (char or {}).get("name", ""),
                "position": position,
                "orientation": orientation,
                "emotion": emotion,
                "motion": ", ".join(motion_parts),
            }
        )

    return motions


def _build_camera_instruction(
    camera_movement: str, shot_type: str, camera_position: str
) -> str:
    """Terjemahkan Camera Movement menjadi instruksi gerak kamera selama durasi Shot."""
    movement = camera_movement.lower()

    instructions = {
        "static": "Kamera diam (locked-off), tanpa pergerakan selama durasi shot",
        "pan": "Kamera pan horizontal dari posisi awal mengikuti aksi",
        "tilt": "Kamera tilt vertikal mengikuti aksi",
        "dolly": "Kamera dolly mendekat/menjauh mengikuti aksi",
        "tracking": "Kamera tracking mengikuti pergerakan karakter",
        "handheld": "Kamera handheld dengan gerakan organik mengikuti aksi",
        "crane": "Kamera crane naik/turun mengikuti aksi",
        "zoom": "Kamera zoom in/out mengikuti beat visual",
    }

    base = instructions.get(movement, f"Kamera {camera_movement} mengikuti aksi")
    return f"{base} ({shot_type} shot, {camera_position} angle)"


def _build_environment_motion(
    location: dict[str, Any], scene_time: str
) -> dict[str, Any]:
    """
    Susun Environment Motion dari data yang traceable.

    Hanya konteks dari Location Bible (atmosphere) dan waktu Scene —
    elemen gerak spesifik tanpa sumber data tidak dikarang bebas.
    """
    atmosphere = location.get("atmosphere", "") if location else ""

    return {
        "atmosphere": atmosphere,
        "time": scene_time,
        "elements": [],  # diisi hanya jika ada instruksi eksplisit/user di masa depan
        "note": (
            "Elemen gerak lingkungan (angin, air, kerumunan latar) belum dispesifikasikan "
            "di sumber data; adapter memakai atmosfer lokasi sebagai konteks."
            if not atmosphere
            else f"Atmosfer lokasi '{atmosphere}' menjadi konteks gerak lingkungan."
        ),
    }


def _build_physics(style: dict[str, Any]) -> dict[str, Any]:
    """
    Susun Physics — logika dunia nyata kecuali Style Bible eksplisit non-realistis.
    """
    visual_style = str(style.get("visualStyle", "")).lower() if style else ""
    motion_style = style.get("motionStyle") if style else None

    # Cek indikasi gaya non-realistis dari Style Bible
    non_realistic = any(kw in visual_style for kw in _NON_REALISTIC_STYLE_KEYWORDS)

    # motionStyle (Json) bisa menandai eksplisit non-realistis
    if isinstance(motion_style, dict):
        if motion_style.get("physics") in ("stylized", "non-realistic", "cartoon"):
            non_realistic = True
        if str(motion_style.get("style", "")).lower() in _NON_REALISTIC_STYLE_KEYWORDS:
            non_realistic = True

    if non_realistic:
        return {
            "mode": "stylized",
            "instruction": (
                "Gerakan mengikuti fisika stilasi sesuai Style Bible Project "
                f"({style.get('visualStyle', 'non-realistis')}) — tidak terikat logika dunia nyata."
            ),
        }

    return {
        "mode": "realistic",
        "instruction": (
            "Semua elemen bergerak taat pada logika dunia nyata: gravitasi, momentum, "
            "inersia, dan interaksi fisik yang wajar."
        ),
    }


def _build_temporal_logic(
    action: str,
    shot_focus: str,
    character_motion: list[dict[str, Any]],
    camera_movement: str,
) -> dict[str, Any]:
    """
    Susun Temporal Logic — urutan kejadian dalam durasi Shot.

    Jika ada visual beat, struktur awal→tengah→akhir disusun dari beat tersebut;
    jika tidak, action berjalan sepanjang durasi sebagai satu beat.
    """
    if shot_focus:
        return {
            "beats": [
                {
                    "phase": "beginning",
                    "description": f"Shot dibuka dengan kondisi awal: {shot_focus} dimulai",
                },
                {
                    "phase": "middle",
                    "description": f"Aksi utama berlangsung: {action}",
                },
                {
                    "phase": "end",
                    "description": f"Beat visual tercapai: {shot_focus}",
                },
            ],
            "note": "Urutan diturunkan dari visual beat Shot dan action Scene.",
        }

    return {
        "beats": [
            {
                "phase": "continuous",
                "description": f"Aksi berlangsung sepanjang durasi shot: {action}",
            }
        ],
        "note": (
            "Satu beat tunggal — tidak ada visual beat spesifik untuk memecah "
            "urutan awal/tengah/akhir."
        ),
    }