from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Optional

from .prompt_compiler import compile_image_prompt, ImagePromptInput

app = FastAPI(
    title="AI Content Production Director - AI Service",
    description="Prompt compilation dan continuity scoring",
    version="0.1.0",
)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "ai-service",
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }


# ===== Image Prompt Compiler Endpoint =====

class CharacterBlockingModel(BaseModel):
    characterId: str
    position: str
    orientation: str


class CompileImagePromptRequest(BaseModel):
    """Request body untuk compile Image Prompt — dikirim oleh apps/api."""

    # Shot data
    shotId: str
    shotNumber: int
    shotType: str
    framing: str
    composition: str
    cameraPosition: str
    lens: Optional[str] = None
    cameraMovement: Optional[str] = None
    characterBlocking: list[CharacterBlockingModel] = Field(default_factory=list)
    visualBeat: str = ""

    # Scene data
    sceneTime: str = ""
    sceneAction: str = ""
    sceneEmotions: list[dict[str, str]] = Field(default_factory=list)

    # Bible data
    characters: list[dict[str, Any]] = Field(default_factory=list)
    location: Optional[dict[str, Any]] = None
    props: list[dict[str, Any]] = Field(default_factory=list)
    style: Optional[dict[str, Any]] = None

    # Project settings
    aspectRatio: str = "16:9"

    # Continuity status
    unresolvedFlags: list[dict[str, str]] = Field(default_factory=list)


class CompileImagePromptResponse(BaseModel):
    success: bool
    prompt: Optional[dict[str, Any]] = None
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    bibleVersions: dict[str, Any] = Field(default_factory=dict)


@app.post("/compile-image-prompt", response_model=CompileImagePromptResponse)
async def compile_image_prompt_endpoint(request: CompileImagePromptRequest):
    """
    Compile Image Prompt konseptual dari Shot + Bible + Style.

    Endpoint ini dipanggil oleh apps/api (modules/image-prompt) saat user
    meminta preview atau submit image prompt untuk sebuah Shot.

    Prompt konseptual bersifat netral terhadap model — penerjemahan ke format
    adapter spesifik (Flux, dll) dilakukan di packages/generation-adapters.
    """
    input_data = ImagePromptInput(
        shot_id=request.shotId,
        shot_number=request.shotNumber,
        shot_type=request.shotType,
        framing=request.framing,
        composition=request.composition,
        camera_position=request.cameraPosition,
        lens=request.lens,
        camera_movement=request.cameraMovement,
        character_blocking=[b.model_dump() for b in request.characterBlocking],
        visual_beat=request.visualBeat,
        scene_time=request.sceneTime,
        scene_action=request.sceneAction,
        scene_emotions=request.sceneEmotions,
        characters=request.characters,
        location=request.location,
        props=request.props,
        style=request.style,
        aspect_ratio=request.aspectRatio,
        unresolved_flags=request.unresolvedFlags,
    )

    result = compile_image_prompt(input_data)

    return CompileImagePromptResponse(
        success=result.success,
        prompt=result.prompt,
        errors=result.errors,
        warnings=result.warnings,
        bibleVersions=result.bible_versions,
    )