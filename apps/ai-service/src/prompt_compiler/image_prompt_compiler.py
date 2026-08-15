"""
Image Prompt Compiler — menyusun Image Prompt konseptual dari Shot + Bible + Style.

Struktur prompt konseptual mengikuti docs/knowledge/08_image_prompt_system.md:
- Subject (wajib): Character(s) + Prop dari Bible
- Environment (wajib): Location dari Bible
- Composition (wajib): dari Shot
- Lighting (wajib): Location Bible + Style Bible
- Camera (wajib): dari Shot
- Style (wajib): dari Style Bible
- Reference Instructions (wajib jika ada reference image)
- Constraints (wajib): aspect ratio dari Project

Aturan compile mengikuti docs/instructions/07_prompt_rules.md:
- Prompt tidak pernah dikarang bebas — semua elemen harus traceable ke Shot/Bible/instruksi user
- Prompt konseptual bersifat netral terhadap model (tidak ada constraint teknis model)
- Tahan compile jika ada field wajib kosong atau ContinuityFlag unresolved
"""

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class ImagePromptInput:
    """Input untuk compile Image Prompt — semua data diambil dari database oleh API."""

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

    # Bible data
    characters: list[dict[str, Any]] = field(default_factory=list)
    location: Optional[dict[str, Any]] = None
    props: list[dict[str, Any]] = field(default_factory=list)
    style: Optional[dict[str, Any]] = None

    # Project settings
    aspect_ratio: str = "16:9"

    # Continuity status
    unresolved_flags: list[dict[str, str]] = field(default_factory=list)


@dataclass
class ImagePromptResult:
    """Hasil compile Image Prompt konseptual."""

    success: bool
    prompt: Optional[dict[str, Any]] = None
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    bible_versions: dict[str, Any] = field(default_factory=dict)


def compile_image_prompt(input_data: ImagePromptInput) -> ImagePromptResult:
    """
    Compile Image Prompt konseptual dari Shot + Bible + Style.

    Returns ImagePromptResult dengan:
    - success: True jika compile berhasil
    - prompt: dict dengan struktur prompt konseptual (Subject, Environment, dll)
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

    # Tahan jika field wajib Shot kosong
    if not input_data.shot_type:
        errors.append("Shot type wajib diisi")
    if not input_data.framing:
        errors.append("Framing wajib diisi")
    if not input_data.composition:
        errors.append("Composition wajib diisi")
    if not input_data.camera_position:
        errors.append("Camera position wajib diisi")

    # Tahan jika Bible tidak ada
    if not input_data.location:
        errors.append("Location Bible tidak ditemukan untuk Scene ini")
    if not input_data.style:
        errors.append("Style Bible tidak ditemukan untuk Project ini")

    if errors:
        return ImagePromptResult(success=False, errors=errors)

    # === Susun prompt konseptual (docs/knowledge/08_image_prompt_system.md) ===
    bible_versions: dict[str, Any] = {
        "character": {},
        "location": {},
        "prop": {},
        "style": None,
    }

    # --- Subject: Character(s) + Prop ---
    subject_parts: list[dict[str, Any]] = []

    # Urutkan character sesuai prioritas visual di characterBlocking
    blocking_order = {
        b.get("characterId"): idx
        for idx, b in enumerate(input_data.character_blocking)
    }

    sorted_characters = sorted(
        input_data.characters,
        key=lambda c: blocking_order.get(c.get("characterId", ""), 999),
    )

    for char in sorted_characters:
        char_id = char.get("characterId", "")
        char_version = char.get("version", 0)
        bible_versions["character"][char_id] = char_version

        # Ambil wardrobe yang relevan — default wardrobe jika tidak ada instruksi spesifik
        wardrobes = char.get("wardrobes", [])
        default_wardrobe = next(
            (w for w in wardrobes if w.get("isDefault")), 
            wardrobes[0] if wardrobes else None
        )

        # Cek apakah ada emosi untuk karakter ini di Scene
        emotion = next(
            (e.get("emotion") for e in input_data.scene_emotions 
             if e.get("characterId") == char_id),
            char.get("defaultExpression", "")
        )

        subject_parts.append({
            "type": "character",
            "id": char_id,
            "name": char.get("name", ""),
            "identity": char.get("identityDesc", ""),
            "face": {
                "shape": char.get("faceShape", ""),
                "eyeColor": char.get("eyeColor", ""),
                "skinColor": char.get("skinColor", ""),
                "distinctiveFeatures": char.get("distinctiveFeatures"),
                "expression": emotion,
            },
            "body": {
                "height": char.get("height", ""),
                "build": char.get("build", ""),
                "posture": char.get("posture"),
            },
            "hair": {
                "color": char.get("hairColor", ""),
                "length": char.get("hairLength", ""),
                "texture": char.get("hairTexture", ""),
                "style": char.get("hairDefaultStyle", ""),
            },
            "wardrobe": _format_wardrobe(default_wardrobe) if default_wardrobe else None,
            "blocking": next(
                (b for b in input_data.character_blocking 
                 if b.get("characterId") == char_id),
                None
            ),
            "referenceImages": char.get("referenceImages", []),
        })

    # Prop yang relevan
    for prop in input_data.props:
        prop_id = prop.get("propId", "")
        prop_version = prop.get("version", 0)
        bible_versions["prop"][prop_id] = prop_version

        appearance = prop.get("appearance", {})
        subject_parts.append({
            "type": "prop",
            "id": prop_id,
            "name": prop.get("name", ""),
            "appearance": {
                "shape": appearance.get("shape", ""),
                "size": appearance.get("size", ""),
                "colors": appearance.get("colors", []),
                "material": appearance.get("material", ""),
                "condition": appearance.get("condition", ""),
                "distinctiveDetails": appearance.get("distinctiveDetails"),
            },
            "referenceImages": prop.get("referenceImages", []),
        })

    if not subject_parts:
        warnings.append("Tidak ada karakter atau prop teridentifikasi di Shot ini")

    # --- Environment: Location ---
    location = input_data.location or {}
    location_id = location.get("locationId", "")
    location_version = location.get("version", 0)
    bible_versions["location"][location_id] = location_version

    # Tentukan exterior/interior berdasarkan waktu Scene
    is_night = "night" in input_data.scene_time.lower() or "malam" in input_data.scene_time.lower()
    location_context = location.get("interior") if is_night else location.get("exterior")
    if not location_context:
        location_context = location.get("exterior") or location.get("interior")

    environment = {
        "id": location_id,
        "name": location.get("name", ""),
        "atmosphere": location.get("atmosphere", ""),
        "context": location_context,
        "architecture": location.get("architecture"),
        "referenceImages": location.get("referenceImages", []),
    }

    # --- Lighting: Location Bible + Style Bible ---
    location_lighting = location.get("lighting", {})
    style = input_data.style or {}
    style_version = style.get("version", 0)
    bible_versions["style"] = style_version

    lighting = {
        "location": {
            "primarySource": location_lighting.get("primarySource", ""),
            "direction": location_lighting.get("direction", ""),
            "color": location_lighting.get("color", ""),
        },
        "style": {
            "approach": style.get("lightingApproach", ""),
            "tendency": style.get("lightingTendency", ""),
        },
    }

    # --- Camera: dari Shot ---
    camera = {
        "shotType": input_data.shot_type,
        "position": input_data.camera_position,
        "lens": input_data.lens,
        "movement": input_data.camera_movement,
    }

    # --- Composition: dari Shot ---
    composition = {
        "framing": input_data.framing,
        "composition": input_data.composition,
        "visualBeat": input_data.visual_beat,
    }

    # --- Style: dari Style Bible ---
    style_section = {
        "visualStyle": style.get("visualStyle", ""),
        "color": {
            "palette": style.get("colorPalette", ""),
            "saturation": style.get("colorSaturation", ""),
            "contrast": style.get("colorContrast", ""),
        },
        "texture": style.get("texture"),
    }

    # --- Reference Instructions ---
    reference_instructions = _build_reference_instructions(
        subject_parts, environment
    )

    # --- Constraints: aspect ratio dari Project ---
    constraints = {
        "aspectRatio": input_data.aspect_ratio,
    }

    prompt = {
        "subject": subject_parts,
        "environment": environment,
        "composition": composition,
        "lighting": lighting,
        "camera": camera,
        "style": style_section,
        "referenceInstructions": reference_instructions,
        "constraints": constraints,
        "sceneContext": {
            "time": input_data.scene_time,
            "action": input_data.scene_action,
        },
    }

    return ImagePromptResult(
        success=True,
        prompt=prompt,
        warnings=warnings,
        bible_versions=bible_versions,
    )


def _format_wardrobe(wardrobe: dict[str, Any]) -> dict[str, Any]:
    """Format wardrobe untuk prompt."""
    return {
        "name": wardrobe.get("name", ""),
        "clothingType": wardrobe.get("clothingType", ""),
        "colors": wardrobe.get("colors", []),
        "accessories": wardrobe.get("accessories", []),
    }


def _build_reference_instructions(
    subjects: list[dict[str, Any]],
    environment: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Susun Reference Instructions untuk conditioning terhadap reference image.
    Hanya dibuat jika Bible terkait punya reference image.
    Urutan sesuai prioritas visual (karakter dominan dulu).
    """
    instructions: list[dict[str, Any]] = []

    for subject in subjects:
        if subject.get("type") != "character":
            continue
        refs = subject.get("referenceImages") or []
        if not refs:
            continue

        # Ambil primary reference atau yang pertama
        primary_ref = next((r for r in refs if r.get("isPrimary")), refs[0] if refs else None)
        if primary_ref:
            instructions.append({
                "type": "character_reference",
                "targetId": subject.get("id"),
                "imageUrl": primary_ref.get("url", ""),
                "instruction": (
                    f"Gunakan reference image utama Character {subject.get('id')} "
                    f"untuk wajah dan wardrobe"
                ),
            })

    # Location reference
    loc_refs = environment.get("referenceImages") or []
    if loc_refs:
        primary_ref = next((r for r in loc_refs if r.get("isPrimary")), loc_refs[0] if loc_refs else None)
        if primary_ref:
            instructions.append({
                "type": "location_reference",
                "targetId": environment.get("id"),
                "imageUrl": primary_ref.get("url", ""),
                "instruction": (
                    f"Gunakan reference image Location {environment.get('id')} "
                    f"untuk tampilan visual lingkungan"
                ),
            })

    return instructions