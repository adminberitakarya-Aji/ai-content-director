"""
Tests untuk Video Prompt Compiler (Fase 5).

Menguji:
- Validasi pra-compile (Image Prompt wajib, Action wajib, ContinuityFlag unresolved)
- Struktur prompt konseptual video (Action, Character Motion, Camera Motion,
  Environment Motion, Physics, Temporal Logic, Cinematography, Constraints)
- Subject diwarisi dari Image Prompt (tidak dideskripsikan ulang)
- Physics: logika dunia nyata kecuali Style Bible eksplisit non-realistis
- Snapshot bible_versions untuk auditability
"""

import sys
from pathlib import Path

# Tambahkan src ke path agar bisa import prompt_compiler
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from prompt_compiler.video_prompt_compiler import (
    compile_video_prompt,
    VideoPromptInput,
)


def make_image_prompt() -> dict:
    """Image Prompt konseptual minimal sebagai dasar Video Prompt."""
    return {
        "subject": [
            {
                "type": "character",
                "id": "A01",
                "name": "Rina",
                "identity": "Detektif muda",
            }
        ],
        "environment": {"name": "Kantor Polisi", "atmosphere": "busy"},
        "composition": {"framing": "centered", "composition": "rule of thirds"},
        "lighting": {"location": {"primarySource": "fluorescent"}},
        "camera": {
            "shotType": "medium",
            "position": "eye-level",
            "lens": "50mm",
            "movement": "static",
        },
        "style": {"visualStyle": "cinematic realism"},
        "constraints": {"aspectRatio": "16:9"},
    }


def make_valid_input(**overrides) -> VideoPromptInput:
    """Buat input valid minimal untuk testing."""
    defaults = dict(
        shot_id="shot-1",
        shot_number=1,
        shot_type="medium",
        framing="centered",
        composition="rule of thirds",
        camera_position="eye-level",
        lens="50mm",
        camera_movement="tracking",
        character_blocking=[
            {"characterId": "A01", "position": "center", "orientation": "camera"}
        ],
        visual_beat="Rina menyadari sesuatu dan menoleh",
        scene_time="day",
        scene_action="Rina berjalan masuk ke kantor polisi",
        scene_emotions=[{"characterId": "A01", "emotion": "curious"}],
        characters=[
            {
                "characterId": "A01",
                "version": 2,
                "name": "Rina",
                "defaultExpression": "serious",
            }
        ],
        location={
            "locationId": "L01",
            "version": 1,
            "name": "Kantor Polisi",
            "atmosphere": "busy",
        },
        style={
            "version": 3,
            "visualStyle": "cinematic realism",
        },
        image_prompt=make_image_prompt(),
        source_image_url="https://example.com/flux-output.png",
        duration_seconds=5.0,
        aspect_ratio="16:9",
        unresolved_flags=[],
    )
    defaults.update(overrides)
    return VideoPromptInput(**defaults)


def test_compile_success_structure():
    """Compile berhasil menghasilkan struktur prompt konseptual video lengkap."""
    result = compile_video_prompt(make_valid_input())

    assert result.success is True
    assert result.errors == []
    assert result.prompt is not None

    prompt = result.prompt
    # Semua section wajib ada (docs/knowledge/09_video_prompt_system.md)
    assert "subjectReference" in prompt
    assert "action" in prompt
    assert "characterMotion" in prompt
    assert "cameraMotion" in prompt
    assert "environmentMotion" in prompt
    assert "physics" in prompt
    assert "temporalLogic" in prompt
    assert "cinematography" in prompt
    assert "constraints" in prompt

    # Constraints berisi aspect ratio + durasi
    assert prompt["constraints"]["aspectRatio"] == "16:9"
    assert prompt["constraints"]["durationSeconds"] == 5.0


def test_subject_inherited_from_image_prompt():
    """Subject diwarisi dari Image Prompt — tidak dideskripsikan ulang."""
    result = compile_video_prompt(make_valid_input())

    assert result.success is True
    prompt = result.prompt

    # baseImagePrompt tersimpan utuh sebagai dasar
    assert prompt["baseImagePrompt"] == make_image_prompt()

    # subjectReference merujuk ke subject Image Prompt
    assert prompt["subjectReference"]["subjects"] == make_image_prompt()["subject"]
    assert "starting frame" in prompt["subjectReference"]["note"]

    # sourceImageUrl (output Flux) diteruskan sebagai starting frame
    assert prompt["sourceImageUrl"] == "https://example.com/flux-output.png"


def test_action_from_scene_with_shot_focus():
    """Action diambil dari Scene, dipersempit ke porsi Shot lewat visual beat."""
    result = compile_video_prompt(make_valid_input())

    assert result.success is True
    prompt = result.prompt
    assert prompt["action"] == "Rina berjalan masuk ke kantor polisi"
    assert prompt["shotFocus"] == "Rina menyadari sesuatu dan menoleh"

    # Temporal logic memakai beat karena visual beat ada
    phases = [b["phase"] for b in prompt["temporalLogic"]["beats"]]
    assert phases == ["beginning", "middle", "end"]


def test_character_motion_from_blocking_and_emotion():
    """Character Motion disusun dari blocking + emosi Scene (traceable)."""
    result = compile_video_prompt(make_valid_input())

    assert result.success is True
    motions = result.prompt["characterMotion"]
    assert len(motions) == 1
    assert motions[0]["characterId"] == "A01"
    assert motions[0]["position"] == "center"
    assert motions[0]["emotion"] == "curious"  # dari Scene, bukan default
    assert "Rina berjalan masuk ke kantor polisi" in motions[0]["motion"]


def test_camera_motion_from_storyboard():
    """Camera Motion diambil dari Camera Movement di Storyboard."""
    result = compile_video_prompt(make_valid_input(camera_movement="tracking"))

    assert result.success is True
    cam = result.prompt["cameraMotion"]
    assert cam["movement"] == "tracking"
    assert "tracking" in cam["instruction"].lower()


def test_camera_motion_defaults_to_static_with_warning():
    """Camera movement kosong → default static + warning (tidak menahan compile)."""
    result = compile_video_prompt(make_valid_input(camera_movement=None))

    assert result.success is True
    assert result.prompt["cameraMotion"]["movement"] == "static"
    assert any("Camera movement" in w for w in result.warnings)


def test_physics_realistic_by_default():
    """Physics default: logika dunia nyata."""
    result = compile_video_prompt(make_valid_input())

    assert result.success is True
    assert result.prompt["physics"]["mode"] == "realistic"
    assert "dunia nyata" in result.prompt["physics"]["instruction"]


def test_physics_stylized_when_style_bible_non_realistic():
    """Physics stylized jika Style Bible eksplisit non-realistis."""
    result = compile_video_prompt(
        make_valid_input(
            style={"version": 1, "visualStyle": "2D animation, cel-shaded"}
        )
    )

    assert result.success is True
    assert result.prompt["physics"]["mode"] == "stylized"


def test_blocked_without_image_prompt():
    """Video Prompt tanpa Image Prompt ditahan (wajib dibangun di atasnya)."""
    result = compile_video_prompt(make_valid_input(image_prompt=None))

    assert result.success is False
    assert result.prompt is None
    assert any("Image Prompt" in e for e in result.errors)


def test_blocked_without_scene_action():
    """Action Scene kosong menahan compile (Action wajib)."""
    result = compile_video_prompt(make_valid_input(scene_action=""))

    assert result.success is False
    assert any("Action Scene wajib" in e for e in result.errors)


def test_blocked_by_unresolved_flags():
    """ContinuityFlag unresolved menahan compile."""
    result = compile_video_prompt(
        make_valid_input(
            unresolved_flags=[
                {"flagType": "position", "description": "Posisi A01 tidak konsisten"}
            ]
        )
    )

    assert result.success is False
    assert result.prompt is None
    assert any("ContinuityFlag unresolved" in e for e in result.errors)


def test_warning_no_duration():
    """Durasi belum ditentukan → warning, bukan error."""
    result = compile_video_prompt(make_valid_input(duration_seconds=None))

    assert result.success is True
    assert "durationSeconds" not in result.prompt["constraints"]
    assert any("Durasi Shot" in w for w in result.warnings)


def test_warning_no_characters():
    """Shot tanpa karakter (establishing shot) → warning, bukan error."""
    result = compile_video_prompt(
        make_valid_input(character_blocking=[], characters=[])
    )

    assert result.success is True
    assert result.prompt["characterMotion"] == []
    assert any("character blocking" in w for w in result.warnings)


def test_bible_versions_recorded():
    """Setiap compile mencatat versi Bible yang dipakai (auditability)."""
    result = compile_video_prompt(make_valid_input())

    assert result.success is True
    bv = result.bible_versions
    assert bv["character"] == {"A01": 2}
    assert bv["location"] == {"L01": 1}
    assert bv["style"] == 3


def test_temporal_logic_single_beat_without_visual_beat():
    """Tanpa visual beat → temporal logic satu beat kontinu + warning."""
    result = compile_video_prompt(make_valid_input(visual_beat=""))

    assert result.success is True
    beats = result.prompt["temporalLogic"]["beats"]
    assert len(beats) == 1
    assert beats[0]["phase"] == "continuous"
    assert any("Visual beat" in w for w in result.warnings)