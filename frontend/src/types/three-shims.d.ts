declare namespace THREE {
  type Vector3 = any;
  type Vector2 = any;
  type Points<TGeometry = any, TMaterial = any> = any;
  type LineSegments<TGeometry = any, TMaterial = any> = any;
  type BufferGeometry = any;
  type ShaderMaterial = any;
}

declare module "three" {
  const THREE: any;
  export = THREE;
}

declare module "three/examples/jsm/controls/OrbitControls.js" {
  export const OrbitControls: any;
}

declare module "three/examples/jsm/postprocessing/EffectComposer.js" {
  export const EffectComposer: any;
}

declare module "three/examples/jsm/postprocessing/RenderPass.js" {
  export const RenderPass: any;
}

declare module "three/examples/jsm/postprocessing/UnrealBloomPass.js" {
  export const UnrealBloomPass: any;
}

declare module "three/examples/jsm/postprocessing/OutputPass.js" {
  export const OutputPass: any;
}
