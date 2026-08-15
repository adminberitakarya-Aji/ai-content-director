"""
Tests untuk Image Prompt Compiler (Fase 4).

Menguji:
- Validasi pra-compile (field wajib, ContinuityFlag unresolved)
- Struktur prompt konseptual (Subject, Environment, Composition, Lighting, Camera, Style)
- Snapshot bible_versions untuk auditability
- Reference instructions
"""

import sys
from pathlib import Path

# Tambahkan src ke path agar bisa import prompt_compiler
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from prompt_compiler.image_prompt_compiler import (
    compile_image_prompt,
    ImagePromptInput,
)


def make_valid_input(**overrides) -> ImagePromptInput:
    """Buat input valid minimal untuk testing."""
    defaults = dict(
        shot_id="shot-1",
        shot_number=1,
        shot_type="medium",
        framing="centered",
        composition="rule of thirds",
        camera_position="eye-level",
        lens="50mm",
        camera_movement="static",
        character_blocking=[
            {"characterId": "A01", "position": "center", "orientation": "camera"}
        ],
        visual_beat="protagonis menyadari sesuatu",
        scene_time="day",
        scene_action="Karakter berjalan masuk",
        scene_emotions=[{"characterId": "A01", "emotion": "curious"}],
        characters=[
            {
                "characterId": "A01",
                "version": 2,
                "name": "Rina",
                "identityDesc": "Detektif muda",
                "faceShape": "oval",
                "eyeColor": "brown",
                "skinColor": "tan",
                "distinctiveFeatures": "scar di pipi kiri",
                "defaultExpression": "serious",
                "height": "165cm",
                "build": "slim",
                "posture": "upright",
                "hairColor": "black",
                "hairLength": "shoulder",
                "hairTexture": "straight",
                "hairDefaultStyle": "ponytail",
                "wardrobes": [
                    {
                        "name": "Kantor",
                        "clothingType": "blazer",
                        "colors": ["navy"],
                        "accessories": ["watch"],
                        "isDefault": True,
                    }
                ],
                "referenceImages": [
                    {"url": "https://example.com/rina.png", "isPrimary": True}
                ],
            }
        ],
        location={
            "locationId": "L01",
            "version": 1,
            "name": "Kantor Polisi",
            "exterior": {"surroundings": "gedung kota"},
            "interior": {"layout": "open space dengan meja-meja"},
            "architecture": {"style": "modern"},
            "lighting": {
                "primarySource": "fluorescent",
                "direction": "overhead",
                "color": "cool white",
            },
            "atmosphere": "busy",
            "referenceImages": [],
        },
        props=[
            {
                "propId": "O01",
                "version": 1,
                "name": "Lencana Detektif",
                "appearance": {
                    "shape": "round",
                    "size": "small",
                    "colors": ["gold"],
                    "material": "metal",
                    "condition": "shiny",
                },
                "referenceImages": [],
            }
        ],
        style={
            "version": 3,
            "visualStyle": "cinematic realism",
            "colorPalette": "teal and orange",
            "colorSaturation": "medium",
            "colorContrast": "high",
            "lightingApproach": "motivated lighting",
            "lightingTendency": "natural",
            "texture": "film grain",
        },
        aspect_ratio="16:9",
        unresolved_flags=[],
    )
    defaults.update(overrides)
    return ImagePromptInput(**defaults)


def test_compile_success_structure():
    """Compile berhasil menghasilkan struktur prompt konseptual lengkap."""
    result = compile_image_prompt(make_valid_input())

    assert result.success is True
    assert result.errors == []
    assert result.prompt is not None

    prompt = result.prompt
    # Semua section wajib ada (docs/knowledge/08_image_prompt_system.md)
    assert "subject" in prompt
    assert "environment" in prompt
    assert "composition" in prompt
    assert "lighting" in prompt
    assert "camera" in prompt
    assert "style" in prompt
    assert "referenceInstructions" in prompt
    assert "constraints" in prompt

    # Constraints berisi aspect ratio dari Project
    assert prompt["constraints"]["aspectRatio"] == "16:9"

    # Camera dari Shot
    assert prompt["camera"]["shotType"] == "medium"
    assert prompt["camera"]["position"] == "eye-level"


def test_compile_records_bible_versions():
    """Setiap compile mencatat versi Bible yang dipakai (auditability)."""
    result = compile_image_prompt(make_valid_input())

    assert result.success is True
    bv = result.bible_versions
    assert bv["character"] == {"A01": 2}
    assert bv["location"] == {"L01": 1}
    assert bv["prop"] == {"O01": 1}
    assert bv["style"] == 3


def test_compile_blocked_by_unresolved_flags():
    """ContinuityFlag unresolved menahan compile (wajib ditahan)."""
    result = compile_image_prompt(
        make_valid_input(
            unresolved_flags=[
                {
                    "flagType": "wardrobe",
                    "description": "Wardrobe A01 tidak konsisten dengan scene sebelumnya",
                }
            ]
        )
    )

    assert result.success is False
    assert result.prompt is None
    assert any("ContinuityFlag unresolved" in e for e in result.errors)


def test_compile_blocked_by_missing_required_shot_fields():
    """Field wajib Shot yang kosong menahan compile."""
    result = compile_image_prompt(
        make_valid_input(shot_type="", framing="", composition="", camera_position="")
    )

    assert result.success is False
    assert len(result.errors) >= 4


def test_compile_blocked_by_missing_location_bible():
    """Location Bible tidak ada menahan compile."""
    result = compile_image_prompt(make_valid_input(location=None))

    assert result.success is False
    assert any("Location Bible" in e for e in result.errors)


def test_compile_blocked_by_missing_style_bible():
    """Style Bible tidak ada menahan compile."""
    result = compile_image_prompt(make_valid_input(style=None))

    assert result.success is False
    assert any("Style Bible" in e for e in result.errors)


def test_compile_warning_no_subjects():
    """Tidak ada karakter/prop menghasilkan warning, bukan error."""
    result = compile_image_prompt(make_valid_input(characters=[], props=[]))

    assert result.success is True
    assert any("Tidak ada karakter" in w for w in result.warnings)


def test_reference_instructions_from_primary_reference():
    """Reference instructions dibuat dari primary reference image."""
    result = compile_image_prompt(make_valid_input())

    assert result.success is True
    refs = result.prompt["referenceInstructions"]
    assert len(refs) == 1
    assert refs[0]["type"] == "character_reference"
    assert refs[0]["targetId"] == "A01"
    assert refs[0]["imageUrl"] == "https://example.com/rina.png"


def test_character_emotion_from_scene():
    """Ekspresi karakter diambil dari emosi Scene, bukan default."""
    result = compile_image_prompt(make_valid_input())

    assert result.success is True
    character = result.prompt["subject"][0]
    assert character["face"]["expression"] == "curious"


def test_character_ordering_by_blocking():
    """Karakter diurutkan sesuai prioritas visual di characterBlocking."""
    input_data = make_valid_input(
        characters=[
            {"characterId": "A02", "version": 1, "name": "Budi", "wardrobes": []},
            {"characterId": "A01", "version": 2, "name": "Rina", "wardrobes": []},
        ],
        character_blocking=[
            {"characterId": "A01", "position": "center", "orientation": "camera"},
            {"characterId": "A02", "position": "left", "orientation": "right"},
        ],
    )
    result = compile_image_prompt(input_data)

    assert result.success is True
    chars = [s for s in result.prompt["subject"] if s["type"] == "character"]
    assert chars[0]["id"] == "A01"
    assert chars[1]["id"] == "A02"