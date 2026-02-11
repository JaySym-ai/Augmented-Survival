/**
 * Mesh reference component — links an entity to a renderable mesh.
 */
export interface MeshRefComponent {
  meshId: string;
  visible: boolean;
}

export const MESH_REF = 'MeshRef' as const;

export function createMeshRef(meshId: string, visible = true): MeshRefComponent {
  return { meshId, visible };
}

