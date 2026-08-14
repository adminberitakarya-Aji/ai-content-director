const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Project
  getProjects: () => request<any[]>('/projects'),
  getProject: (id: string) => request<any>(`/projects/${id}`),
  createProject: (data: any) => request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: any) => request<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProject: (id: string) => request<any>(`/projects/${id}`, { method: 'DELETE' }),

  // Story
  getStories: () => request<any[]>('/stories'),
  getStoryByProject: (projectId: string) => request<any[]>(`/stories/project/${projectId}`),
  createStory: (data: any) => request<any>('/stories', { method: 'POST', body: JSON.stringify(data) }),
  updateStory: (id: string, data: any) => request<any>(`/stories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Character Bible
  getCharacters: (projectId: string) => request<any[]>(`/projects/${projectId}/characters`),
  createCharacter: (projectId: string, data: any) => request<any>(`/projects/${projectId}/characters`, { method: 'POST', body: JSON.stringify(data) }),
  getCharacterVersions: (projectId: string, characterId: string) => request<any[]>(`/projects/${projectId}/characters/versions/${characterId}`),
  createCharacterVersion: (projectId: string, characterId: string, data: any) =>
    request<any>(`/projects/${projectId}/characters/${characterId}/versions`, { method: 'POST', body: JSON.stringify(data) }),

  // Location Bible
  getLocations: (projectId: string) => request<any[]>(`/projects/${projectId}/locations`),
  createLocation: (projectId: string, data: any) => request<any>(`/projects/${projectId}/locations`, { method: 'POST', body: JSON.stringify(data) }),

  // Prop Bible
  getProps: (projectId: string) => request<any[]>(`/projects/${projectId}/props`),
  createProp: (projectId: string, data: any) => request<any>(`/projects/${projectId}/props`, { method: 'POST', body: JSON.stringify(data) }),

  // Style Bible
  getStyles: (projectId: string) => request<any[]>(`/projects/${projectId}/styles`),
  createStyle: (projectId: string, data: any) => request<any>(`/projects/${projectId}/styles`, { method: 'POST', body: JSON.stringify(data) }),

  // Scene
  getScenes: (projectId: string) => request<any[]>(`/projects/${projectId}/scenes`),
  createScene: (projectId: string, data: any) => request<any>(`/projects/${projectId}/scenes`, { method: 'POST', body: JSON.stringify(data) }),

  // Storyboard
  getShotsByScene: (projectId: string, sceneId: string) => request<any[]>(`/projects/${projectId}/storyboard/scenes/${sceneId}/shots`),
  getShotsByProject: (projectId: string) => request<any[]>(`/projects/${projectId}/storyboard/shots`),
  getShot: (projectId: string, shotId: string) => request<any>(`/projects/${projectId}/storyboard/shots/${shotId}`),
  createShot: (projectId: string, sceneId: string, data: any) =>
    request<any>(`/projects/${projectId}/storyboard/scenes/${sceneId}/shots`, { method: 'POST', body: JSON.stringify(data) }),
  updateShot: (projectId: string, shotId: string, data: any) =>
    request<any>(`/projects/${projectId}/storyboard/shots/${shotId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteShot: (projectId: string, shotId: string) =>
    request<any>(`/projects/${projectId}/storyboard/shots/${shotId}`, { method: 'DELETE' }),
  reorderShots: (projectId: string, sceneId: string, orderedIds: string[]) =>
    request<any>(`/projects/${projectId}/storyboard/scenes/${sceneId}/shots/reorder`, { method: 'PUT', body: JSON.stringify({ orderedIds }) }),

  // Continuity
  runContinuityCheck: (projectId: string, sceneId: string) => request<any>(`/projects/${projectId}/continuity/scenes/${sceneId}/check`, { method: 'POST' }),
  getSceneFlags: (projectId: string, sceneId: string) => request<any[]>(`/projects/${projectId}/continuity/scenes/${sceneId}/flags`),
  getShotFlags: (projectId: string, shotId: string) => request<any[]>(`/projects/${projectId}/continuity/shots/${shotId}/flags`),
  getUnresolvedFlags: (projectId: string) => request<any[]>(`/projects/${projectId}/continuity/flags/unresolved`),
  resolveFlag: (projectId: string, flagId: string, status: string, note?: string) =>
    request<any>(`/projects/${projectId}/continuity/flags/${flagId}/resolve`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),

  // Review
  getPendingReviews: (projectId: string) => request<any[]>(`/projects/${projectId}/reviews`),
  updateReviewStatus: (projectId: string, type: string, id: string, status: string) =>
    request<any>(`/projects/${projectId}/reviews/${type}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};