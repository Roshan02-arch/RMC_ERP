import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { useCenteredDialog } from "../../hooks/useCenteredDialog";
import GlobalFooter from "../../components/GlobalFooter";

interface RegisterFormData {
  name: string;
  email: string;
  number: string;
  password: string;
  role: string;
}

type NodeType = {
  position: THREE.Vector3;
  connections: { node: NodeType; strength: number }[];
  level: number;
  type: number;
  size: number;
  distanceFromRoot: number;
  helixIndex?: number;
  helixT?: number;
  addConnection: (node: NodeType, strength?: number) => void;
  isConnectedTo: (node: NodeType) => boolean;
};

class NeuralNode implements NodeType {
  position: THREE.Vector3;
  connections: { node: NodeType; strength: number }[] = [];
  level: number;
  type: number;
  size: number;
  distanceFromRoot = 0;
  helixIndex?: number;
  helixT?: number;

  constructor(position: THREE.Vector3, level = 0, type = 0) {
    this.position = position;
    this.level = level;
    this.type = type;
    this.size =
      type === 0
        ? THREE.MathUtils.randFloat(0.8, 1.4)
        : THREE.MathUtils.randFloat(0.5, 1.0);
  }

  addConnection(node: NodeType, strength = 1.0) {
    if (!this.isConnectedTo(node)) {
      this.connections.push({ node, strength });
      node.connections.push({ node: this, strength });
    }
  }

  isConnectedTo(node: NodeType) {
    return this.connections.some((conn) => conn.node === node);
  }
}

const noiseFunctions = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const nodeShader = {
  vertexShader: `${noiseFunctions}
  attribute float nodeSize;
  attribute float nodeType;
  attribute vec3 nodeColor;
  attribute float distanceFromRoot;

  uniform float uTime;
  uniform vec3 uPulsePositions[3];
  uniform float uPulseTimes[3];
  uniform float uPulseSpeed;
  uniform float uBaseNodeSize;

  varying vec3 vColor;
  varying float vNodeType;
  varying vec3 vPosition;
  varying float vPulseIntensity;
  varying float vDistanceFromRoot;
  varying float vGlow;

  float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
      if (pulseTime < 0.0) return 0.0;
      float timeSinceClick = uTime - pulseTime;
      if (timeSinceClick < 0.0 || timeSinceClick > 4.0) return 0.0;
      float pulseRadius = timeSinceClick * uPulseSpeed;
      float distToClick = distance(worldPos, pulsePos);
      float pulseThickness = 3.0;
      float waveProximity = abs(distToClick - pulseRadius);
      return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(4.0, 0.0, timeSinceClick);
  }

  void main() {
      vNodeType = nodeType;
      vColor = nodeColor;
      vDistanceFromRoot = distanceFromRoot;
      vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vPosition = worldPos;

      float totalPulseIntensity = 0.0;
      for (int i = 0; i < 3; i++) {
          totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
      }

      vPulseIntensity = min(totalPulseIntensity, 1.0);
      float breathe = sin(uTime * 0.7 + distanceFromRoot * 0.15) * 0.15 + 0.85;
      float baseSize = nodeSize * breathe;
      float pulseSize = baseSize * (1.0 + vPulseIntensity * 2.5);
      vGlow = 0.5 + 0.5 * sin(uTime * 0.5 + distanceFromRoot * 0.2);

      vec3 modifiedPosition = position;
      if (nodeType > 0.5) {
          float noise = snoise(position * 0.08 + uTime * 0.08);
          modifiedPosition += normal * noise * 0.15;
      }

      vec4 mvPosition = modelViewMatrix * vec4(modifiedPosition, 1.0);
      gl_PointSize = pulseSize * uBaseNodeSize * (1000.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
  }`,
  fragmentShader: `
  uniform float uTime;
  uniform vec3 uPulseColors[3];

  varying vec3 vColor;
  varying float vNodeType;
  varying vec3 vPosition;
  varying float vPulseIntensity;
  varying float vDistanceFromRoot;
  varying float vGlow;

  void main() {
      vec2 center = 2.0 * gl_PointCoord - 1.0;
      float dist = length(center);
      if (dist > 1.0) discard;

      float glow1 = 1.0 - smoothstep(0.0, 0.5, dist);
      float glow2 = 1.0 - smoothstep(0.0, 1.0, dist);
      float glowStrength = pow(glow1, 1.2) + glow2 * 0.3;

      float breatheColor = 0.9 + 0.1 * sin(uTime * 0.6 + vDistanceFromRoot * 0.25);
      vec3 baseColor = vColor * breatheColor;
      vec3 finalColor = baseColor;

      if (vPulseIntensity > 0.0) {
          vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.4);
          finalColor = mix(baseColor, pulseColor, vPulseIntensity * 0.8);
          finalColor *= (1.0 + vPulseIntensity * 1.2);
          glowStrength *= (1.0 + vPulseIntensity);
      }

      float coreBrightness = smoothstep(0.4, 0.0, dist);
      finalColor += vec3(1.0) * coreBrightness * 0.3;

      float alpha = glowStrength * (0.95 - 0.3 * dist);
      float camDistance = length(vPosition - cameraPosition);
      float distanceFade = smoothstep(100.0, 15.0, camDistance);

      if (vNodeType > 0.5) {
          finalColor *= 1.1;
          alpha *= 0.9;
      }

      finalColor *= (1.0 + vGlow * 0.1);
      gl_FragColor = vec4(finalColor, alpha * distanceFade);
  }`,
};

const connectionShader = {
  vertexShader: `${noiseFunctions}
  attribute vec3 startPoint;
  attribute vec3 endPoint;
  attribute float connectionStrength;
  attribute float pathIndex;
  attribute vec3 connectionColor;

  uniform float uTime;
  uniform vec3 uPulsePositions[3];
  uniform float uPulseTimes[3];
  uniform float uPulseSpeed;

  varying vec3 vColor;
  varying float vConnectionStrength;
  varying float vPulseIntensity;
  varying float vPathPosition;
  varying float vDistanceFromCamera;

  float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
      if (pulseTime < 0.0) return 0.0;
      float timeSinceClick = uTime - pulseTime;
      if (timeSinceClick < 0.0 || timeSinceClick > 4.0) return 0.0;
      float pulseRadius = timeSinceClick * uPulseSpeed;
      float distToClick = distance(worldPos, pulsePos);
      float pulseThickness = 3.0;
      float waveProximity = abs(distToClick - pulseRadius);
      return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(4.0, 0.0, timeSinceClick);
  }

  void main() {
      float t = position.x;
      vPathPosition = t;

      vec3 midPoint = mix(startPoint, endPoint, 0.5);
      float pathOffset = sin(t * 3.14159) * 0.15;
      vec3 perpendicular = normalize(cross(normalize(endPoint - startPoint), vec3(0.0, 1.0, 0.0)));
      if (length(perpendicular) < 0.1) perpendicular = vec3(1.0, 0.0, 0.0);
      midPoint += perpendicular * pathOffset;

      vec3 p0 = mix(startPoint, midPoint, t);
      vec3 p1 = mix(midPoint, endPoint, t);
      vec3 finalPos = mix(p0, p1, t);

      float noiseTime = uTime * 0.15;
      float noise = snoise(vec3(pathIndex * 0.08, t * 0.6, noiseTime));
      finalPos += perpendicular * noise * 0.12;

      vec3 worldPos = (modelMatrix * vec4(finalPos, 1.0)).xyz;
      float totalPulseIntensity = 0.0;
      for (int i = 0; i < 3; i++) {
          totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
      }

      vPulseIntensity = min(totalPulseIntensity, 1.0);
      vColor = connectionColor;
      vConnectionStrength = connectionStrength;
      vDistanceFromCamera = length(worldPos - cameraPosition);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
  }`,
  fragmentShader: `
  uniform float uTime;
  uniform vec3 uPulseColors[3];

  varying vec3 vColor;
  varying float vConnectionStrength;
  varying float vPulseIntensity;
  varying float vPathPosition;
  varying float vDistanceFromCamera;

  void main() {
      float flowPattern1 = sin(vPathPosition * 25.0 - uTime * 4.0) * 0.5 + 0.5;
      float flowPattern2 = sin(vPathPosition * 15.0 - uTime * 2.5 + 1.57) * 0.5 + 0.5;
      float combinedFlow = (flowPattern1 + flowPattern2 * 0.5) / 1.5;

      vec3 baseColor = vColor * (0.8 + 0.2 * sin(uTime * 0.6 + vPathPosition * 12.0));
      float flowIntensity = 0.4 * combinedFlow * vConnectionStrength;
      vec3 finalColor = baseColor;

      if (vPulseIntensity > 0.0) {
          vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.3);
          finalColor = mix(baseColor, pulseColor * 1.2, vPulseIntensity * 0.7);
          flowIntensity += vPulseIntensity * 0.8;
      }

      finalColor *= (0.7 + flowIntensity + vConnectionStrength * 0.5);
      float baseAlpha = 0.7 * vConnectionStrength;
      float flowAlpha = combinedFlow * 0.3;
      float alpha = baseAlpha + flowAlpha;
      alpha = mix(alpha, min(1.0, alpha * 2.5), vPulseIntensity);

      float distanceFade = smoothstep(100.0, 15.0, vDistanceFromCamera);
      gl_FragColor = vec4(finalColor, alpha * distanceFade);
  }`,
};

function QuantumBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const colorPalettes = [
      [
        new THREE.Color(0x667eea),
        new THREE.Color(0x764ba2),
        new THREE.Color(0xf093fb),
        new THREE.Color(0x9d50bb),
        new THREE.Color(0x6e48aa),
      ],
    ];

    const activePaletteIndex = 0;
    const currentFormation = 0;
    const densityFactor = 1;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.002);

    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 8, 28);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.6;
    controls.minDistance = 8;
    controls.maxDistance = 80;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;
    controls.enablePan = false;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.8,
      0.6,
      0.7
    );

    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    const pulseUniforms = {
      uTime: { value: 0.0 },
      uPulsePositions: {
        value: [
          new THREE.Vector3(1e3, 1e3, 1e3),
          new THREE.Vector3(1e3, 1e3, 1e3),
          new THREE.Vector3(1e3, 1e3, 1e3),
        ],
      },
      uPulseTimes: { value: [-1e3, -1e3, -1e3] },
      uPulseColors: {
        value: [
          new THREE.Color(1, 1, 1),
          new THREE.Color(1, 1, 1),
          new THREE.Color(1, 1, 1),
        ],
      },
      uPulseSpeed: { value: 18.0 },
      uBaseNodeSize: { value: 0.6 },
    };

    let neuralNetwork:
      | {
          nodes: NodeType[];
          rootNode: NodeType;
        }
      | null = null;

    let nodesMesh: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null =
      null;
    let connectionsMesh:
      | THREE.LineSegments<THREE.BufferGeometry, THREE.ShaderMaterial>
      | null = null;

    function createStarfield() {
      const count = 8000;
      const positions: number[] = [];
      const colors: number[] = [];
      const sizes: number[] = [];

      for (let i = 0; i < count; i++) {
        const r = THREE.MathUtils.randFloat(50, 150);
        const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
        const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);

        positions.push(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );

        const colorChoice = Math.random();
        if (colorChoice < 0.7) {
          colors.push(1, 1, 1);
        } else if (colorChoice < 0.85) {
          colors.push(0.7, 0.8, 1);
        } else {
          colors.push(1, 0.9, 0.8);
        }

        sizes.push(THREE.MathUtils.randFloat(0.1, 0.3));
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geo.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));

      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          uniform float uTime;
          void main() {
              vColor = color;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              float twinkle = sin(uTime * 2.0 + position.x * 100.0) * 0.3 + 0.7;
              gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
              vec2 center = gl_PointCoord - 0.5;
              float dist = length(center);
              if (dist > 0.5) discard;
              float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
              gl_FragColor = vec4(vColor, alpha * 0.8);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      return new THREE.Points(geo, mat);
    }

    const starField = createStarfield();
    scene.add(starField);

    function generateNeuralNetwork(formationIndex: number, density = 1.0) {
      let nodes: NodeType[] = [];
      let rootNode: NodeType;

      function generateCrystallineSphere() {
        rootNode = new NeuralNode(new THREE.Vector3(0, 0, 0), 0, 0);
        rootNode.size = 2.0;
        nodes.push(rootNode);

        const layers = 5;
        const goldenRatio = (1 + Math.sqrt(5)) / 2;

        for (let layer = 1; layer <= layers; layer++) {
          const radius = layer * 4;
          const numPoints = Math.floor(layer * 12 * density);

          for (let i = 0; i < numPoints; i++) {
            const phi = Math.acos(1 - (2 * (i + 0.5)) / numPoints);
            const theta = (2 * Math.PI * i) / goldenRatio;

            const pos = new THREE.Vector3(
              radius * Math.sin(phi) * Math.cos(theta),
              radius * Math.sin(phi) * Math.sin(theta),
              radius * Math.cos(phi)
            );

            const isLeaf = layer === layers || Math.random() < 0.3;
            const node = new NeuralNode(pos, layer, isLeaf ? 1 : 0);
            node.distanceFromRoot = radius;
            nodes.push(node);

            if (layer > 1) {
              const prevLayerNodes = nodes.filter(
                (n) => n.level === layer - 1 && n !== rootNode
              );
              prevLayerNodes.sort(
                (a, b) =>
                  pos.distanceTo(a.position) - pos.distanceTo(b.position)
              );

              for (let j = 0; j < Math.min(3, prevLayerNodes.length); j++) {
                const dist = pos.distanceTo(prevLayerNodes[j].position);
                const strength = 1.0 - dist / (radius * 2);
                node.addConnection(prevLayerNodes[j], Math.max(0.3, strength));
              }
            } else {
              rootNode.addConnection(node, 0.9);
            }
          }

          const layerNodes = nodes.filter(
            (n) => n.level === layer && n !== rootNode
          );

          for (let i = 0; i < layerNodes.length; i++) {
            const node = layerNodes[i];
            const nearby = layerNodes
              .filter((n) => n !== node)
              .sort(
                (a, b) =>
                  node.position.distanceTo(a.position) -
                  node.position.distanceTo(b.position)
              )
              .slice(0, 5);

            for (const nearNode of nearby) {
              const dist = node.position.distanceTo(nearNode.position);
              if (dist < radius * 0.8 && !node.isConnectedTo(nearNode)) {
                node.addConnection(nearNode, 0.6);
              }
            }
          }
        }

        const outerNodes = nodes.filter((n) => n.level >= 3);
        for (let i = 0; i < Math.min(20, outerNodes.length); i++) {
          const n1 = outerNodes[Math.floor(Math.random() * outerNodes.length)];
          const n2 = outerNodes[Math.floor(Math.random() * outerNodes.length)];
          if (
            n1 !== n2 &&
            !n1.isConnectedTo(n2) &&
            Math.abs(n1.level - n2.level) > 1
          ) {
            n1.addConnection(n2, 0.4);
          }
        }
      }

      switch (formationIndex % 3) {
        case 0:
        default:
          generateCrystallineSphere();
          break;
      }

      return { nodes, rootNode: rootNode! };
    }

    function createNetworkVisualization(formationIndex: number, density = 1.0) {
      if (nodesMesh) {
        scene.remove(nodesMesh);
        nodesMesh.geometry.dispose();
        nodesMesh.material.dispose();
      }

      if (connectionsMesh) {
        scene.remove(connectionsMesh);
        connectionsMesh.geometry.dispose();
        connectionsMesh.material.dispose();
      }

      neuralNetwork = generateNeuralNetwork(formationIndex, density);
      if (!neuralNetwork || neuralNetwork.nodes.length === 0) return;

      const palette = colorPalettes[activePaletteIndex];

      const nodesGeometry = new THREE.BufferGeometry();
      const nodePositions: number[] = [];
      const nodeTypes: number[] = [];
      const nodeSizes: number[] = [];
      const nodeColors: number[] = [];
      const distancesFromRoot: number[] = [];

      neuralNetwork.nodes.forEach((node) => {
        nodePositions.push(node.position.x, node.position.y, node.position.z);
        nodeTypes.push(node.type);
        nodeSizes.push(node.size);
        distancesFromRoot.push(node.distanceFromRoot);

        const colorIndex = Math.min(node.level, palette.length - 1);
        const baseColor = palette[colorIndex % palette.length].clone();
        baseColor.offsetHSL(
          THREE.MathUtils.randFloatSpread(0.03),
          THREE.MathUtils.randFloatSpread(0.08),
          THREE.MathUtils.randFloatSpread(0.08)
        );

        nodeColors.push(baseColor.r, baseColor.g, baseColor.b);
      });

      nodesGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(nodePositions, 3)
      );
      nodesGeometry.setAttribute(
        "nodeType",
        new THREE.Float32BufferAttribute(nodeTypes, 1)
      );
      nodesGeometry.setAttribute(
        "nodeSize",
        new THREE.Float32BufferAttribute(nodeSizes, 1)
      );
      nodesGeometry.setAttribute(
        "nodeColor",
        new THREE.Float32BufferAttribute(nodeColors, 3)
      );
      nodesGeometry.setAttribute(
        "distanceFromRoot",
        new THREE.Float32BufferAttribute(distancesFromRoot, 1)
      );

      const nodesMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(pulseUniforms),
        vertexShader: nodeShader.vertexShader,
        fragmentShader: nodeShader.fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      nodesMesh = new THREE.Points(nodesGeometry, nodesMaterial);
      scene.add(nodesMesh);

      const connectionsGeometry = new THREE.BufferGeometry();
      const connectionColors: number[] = [];
      const connectionStrengths: number[] = [];
      const connectionPositions: number[] = [];
      const startPoints: number[] = [];
      const endPoints: number[] = [];
      const pathIndices: number[] = [];
      const processedConnections = new Set<string>();
      let pathIndex = 0;

      neuralNetwork.nodes.forEach((node, nodeIndex) => {
        node.connections.forEach((connection) => {
          const connectedNode = connection.node;
          const connectedIndex = neuralNetwork!.nodes.indexOf(connectedNode);
          if (connectedIndex === -1) return;

          const key = [
            Math.min(nodeIndex, connectedIndex),
            Math.max(nodeIndex, connectedIndex),
          ].join("-");

          if (!processedConnections.has(key)) {
            processedConnections.add(key);

            const startPoint = node.position;
            const endPoint = connectedNode.position;
            const numSegments = 20;

            for (let i = 0; i < numSegments; i++) {
              const t = i / (numSegments - 1);
              connectionPositions.push(t, 0, 0);
              startPoints.push(startPoint.x, startPoint.y, startPoint.z);
              endPoints.push(endPoint.x, endPoint.y, endPoint.z);
              pathIndices.push(pathIndex);
              connectionStrengths.push(connection.strength);

              const avgLevel = Math.min(
                Math.floor((node.level + connectedNode.level) / 2),
                palette.length - 1
              );

              const baseColor = palette[avgLevel % palette.length].clone();
              baseColor.offsetHSL(
                THREE.MathUtils.randFloatSpread(0.03),
                THREE.MathUtils.randFloatSpread(0.08),
                THREE.MathUtils.randFloatSpread(0.08)
              );

              connectionColors.push(baseColor.r, baseColor.g, baseColor.b);
            }

            pathIndex++;
          }
        });
      });

      connectionsGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(connectionPositions, 3)
      );
      connectionsGeometry.setAttribute(
        "startPoint",
        new THREE.Float32BufferAttribute(startPoints, 3)
      );
      connectionsGeometry.setAttribute(
        "endPoint",
        new THREE.Float32BufferAttribute(endPoints, 3)
      );
      connectionsGeometry.setAttribute(
        "connectionStrength",
        new THREE.Float32BufferAttribute(connectionStrengths, 1)
      );
      connectionsGeometry.setAttribute(
        "connectionColor",
        new THREE.Float32BufferAttribute(connectionColors, 3)
      );
      connectionsGeometry.setAttribute(
        "pathIndex",
        new THREE.Float32BufferAttribute(pathIndices, 1)
      );

      const connectionsMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(pulseUniforms),
        vertexShader: connectionShader.vertexShader,
        fragmentShader: connectionShader.fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      connectionsMesh = new THREE.LineSegments(
        connectionsGeometry,
        connectionsMaterial
      );
      scene.add(connectionsMesh);

      palette.forEach((color, i) => {
        if (i < 3) {
          nodesMaterial.uniforms.uPulseColors.value[i].copy(color);
          connectionsMaterial.uniforms.uPulseColors.value[i].copy(color);
        }
      });
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const interactionPoint = new THREE.Vector3();
    const clock = new THREE.Clock();
    let lastPulseIndex = 0;
    let animationId = 0;

    function triggerPulse(clientX: number, clientY: number) {
      pointer.x = (clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      interactionPlane.normal.copy(camera.position).normalize();
      interactionPlane.constant =
        -interactionPlane.normal.dot(camera.position) + camera.position.length() * 0.5;

      if (raycaster.ray.intersectPlane(interactionPlane, interactionPoint)) {
        const time = clock.getElapsedTime();

        if (nodesMesh && connectionsMesh) {
          lastPulseIndex = (lastPulseIndex + 1) % 3;

          nodesMesh.material.uniforms.uPulsePositions.value[lastPulseIndex].copy(
            interactionPoint
          );
          nodesMesh.material.uniforms.uPulseTimes.value[lastPulseIndex] = time;

          connectionsMesh.material.uniforms.uPulsePositions.value[lastPulseIndex].copy(
            interactionPoint
          );
          connectionsMesh.material.uniforms.uPulseTimes.value[lastPulseIndex] = time;

          const palette = colorPalettes[activePaletteIndex];
          const randomColor = palette[Math.floor(Math.random() * palette.length)];

          nodesMesh.material.uniforms.uPulseColors.value[lastPulseIndex].copy(
            randomColor
          );
          connectionsMesh.material.uniforms.uPulseColors.value[lastPulseIndex].copy(
            randomColor
          );
        }
      }
    }

    const onCanvasClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-ui-panel='true']")) return;
      triggerPulse(e.clientX, e.clientY);
    };

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-ui-panel='true']")) return;
      e.preventDefault();
      if (e.touches.length > 0) {
        triggerPulse(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    renderer.domElement.addEventListener("click", onCanvasClick);
    renderer.domElement.addEventListener("touchstart", onTouchStart, {
      passive: false,
    });

    function animate() {
      animationId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (nodesMesh) {
        nodesMesh.material.uniforms.uTime.value = t;
        nodesMesh.rotation.y = Math.sin(t * 0.04) * 0.05;
      }

      if (connectionsMesh) {
        connectionsMesh.material.uniforms.uTime.value = t;
        connectionsMesh.rotation.y = Math.sin(t * 0.04) * 0.05;
      }

      starField.rotation.y += 0.0002;
      (starField.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      controls.update();
      composer.render();
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      bloomPass.resolution.set(window.innerWidth, window.innerHeight);
    }

    createNetworkVisualization(currentFormation, densityFactor);
    animate();
    window.addEventListener("resize", onWindowResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onWindowResize);
      renderer.domElement.removeEventListener("click", onCanvasClick);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);

      controls.dispose();
      composer.dispose();
      renderer.dispose();

      if (nodesMesh) {
        nodesMesh.geometry.dispose();
        nodesMesh.material.dispose();
      }

      if (connectionsMesh) {
        connectionsMesh.geometry.dispose();
        connectionsMesh.material.dispose();
      }

      starField.geometry.dispose();
      (starField.material as THREE.ShaderMaterial).dispose();

      scene.clear();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[1] h-full w-full cursor-crosshair"
    />
  );
}

function Register() {
  const navigate = useNavigate();
  const { showMessage, dialogNode } = useCenteredDialog();

  const floatingSymbols = [
    { icon: "⌨️", top: "15%", left: "10%", delay: "0s", duration: "6s" },
    { icon: "🖥️", top: "25%", right: "15%", delay: "1s", duration: "7s" },
    { icon: "📱", bottom: "30%", left: "20%", delay: "2s", duration: "8s" },
    { icon: "💻", top: "40%", right: "25%", delay: "3s", duration: "7.5s" },
    { icon: "🔌", bottom: "20%", right: "10%", delay: "4s", duration: "8.2s" },
    { icon: "🖱️", top: "35%", left: "30%", delay: "0.5s", duration: "6.5s" },
    { icon: "⚡", bottom: "35%", right: "30%", delay: "2.2s", duration: "7.2s" },
    { icon: "💾", top: "20%", left: "40%", delay: "3.1s", duration: "8.4s" },
    { icon: "📊", bottom: "25%", left: "35%", delay: "1.4s", duration: "6.9s" },
    { icon: "🔍", top: "30%", right: "40%", delay: "4.3s", duration: "7.8s" },
    { icon: "⚙️", top: "45%", left: "15%", delay: "2.6s", duration: "8.1s" },
    { icon: "🔒", bottom: "40%", right: "20%", delay: "3.4s", duration: "7.4s" },
    { icon: "📡", top: "10%", left: "45%", delay: "1.5s", duration: "8.6s" },
    { icon: "🌐", bottom: "15%", right: "45%", delay: "2.5s", duration: "7.6s" },
    { icon: "🔋", top: "50%", left: "5%", delay: "3.5s", duration: "6.8s" },
    { icon: "💡", bottom: "45%", right: "5%", delay: "4.5s", duration: "7.1s" },
    { icon: "📶", top: "5%", right: "35%", delay: "1.8s", duration: "8.3s" },
    { icon: "🔄", bottom: "5%", left: "25%", delay: "2.8s", duration: "7.3s" },
    { icon: "⌘", top: "55%", right: "15%", delay: "3.8s", duration: "8.5s" },
    { icon: "⌥", bottom: "50%", left: "45%", delay: "4.8s", duration: "7.7s" },
    { icon: "⇧", top: "15%", right: "50%", delay: "1.2s", duration: "8s" },
    { icon: "⌃", bottom: "10%", left: "50%", delay: "2.2s", duration: "7.9s" },
    { icon: "⎋", top: "60%", left: "55%", delay: "3.2s", duration: "8.7s" },
    { icon: "⏎", bottom: "55%", right: "55%", delay: "4.2s", duration: "7.5s" },
  ];

  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    email: "",
    number: "",
    password: "",
    role: "CUSTOMER",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim();
    const number = formData.number.trim();
    const password = formData.password;

    if (!name) {
      setErrorMsg("Full Name is required");
      return;
    }

    if (name.length < 3) {
      setErrorMsg("Name must be at least 3 characters long");
      return;
    }

    if (!/^[A-Za-z ]+$/.test(name)) {
      setErrorMsg("Name should contain only letters and spaces");
      return;
    }

    if (!email) {
      setErrorMsg("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("Please enter a valid email address");
      return;
    }

    if (!number) {
      setErrorMsg("Mobile number is required");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(number)) {
      setErrorMsg("Enter valid 10-digit Indian mobile number");
      return;
    }

    if (!password) {
      setErrorMsg("Password is required");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      setErrorMsg("Password must contain at least one uppercase letter");
      return;
    }

    if (!/(?=.*[0-9])/.test(password)) {
      setErrorMsg("Password must contain at least one number");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await axios.post(
        "http://localhost:8080/api/users/register",
        {
          name,
          email,
          number,
          password,
          role: formData.role,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      await showMessage(
        response.data?.message || "Account created successfully! Redirecting to Login..."
      );
      navigate("/login");
    } catch (error: unknown) {
      let errMsg = "Registration failed";

      if (axios.isAxiosError(error) && error.response?.data?.message) {
        errMsg = String(error.response.data.message);
      }

      if (errMsg === "User already exists") {
        await showMessage("User already exists");
      } else {
        setErrorMsg(errMsg);
      }

      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#050508] font-sans text-white">
      <QuantumBackground />

      <div className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-6 px-6 py-4 text-sm font-medium text-white/80">
          <Link to="/" className="transition hover:text-indigo-300">
            Home
          </Link>
          <Link to="/login" className="transition hover:text-indigo-300">
            Login
          </Link>
          <Link to="/register" className="text-indigo-300">
            Register
          </Link>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
        {floatingSymbols.map((item, index) => (
          <span
            key={`${item.icon}-${index}`}
            className="absolute animate-pulse text-2xl text-indigo-300/20"
            style={{
              top: item.top,
              bottom: item.bottom,
              left: item.left,
              right: item.right,
              animationDelay: item.delay,
              animationDuration: item.duration,
            }}
          >
            {item.icon}
          </span>
        ))}
      </div>

      <div className="relative z-30 flex flex-1 items-center justify-center px-4 pb-8 pt-24">
        <div
          data-ui-panel="true"
          className="w-full max-w-md rounded-3xl border border-white/10 border-l-white/20 border-t-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-2xl"
        >
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-6">
              <svg
                className="h-8 w-8 text-indigo-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <svg
                className="h-8 w-8 text-yellow-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <svg
                className="h-8 w-8 text-pink-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>

            <h2 className="mb-2 bg-gradient-to-r from-white via-indigo-200 to-pink-200 bg-clip-text text-3xl font-bold text-transparent">
              Create Account
            </h2>
            <p className="text-white/70">
              Join us and start your learning journey
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none backdrop-blur-sm transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none backdrop-blur-sm transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Mobile Number
              </label>
              <input
                type="tel"
                name="number"
                maxLength={10}
                value={formData.number}
                onChange={handleChange}
                required
                placeholder="Enter your mobile number"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none backdrop-blur-sm transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Create a password"
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 pr-12 text-white placeholder:text-white/40 outline-none backdrop-blur-sm transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-indigo-300"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Select Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none backdrop-blur-sm transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/40"
              >
                <option value="CUSTOMER" className="bg-slate-900 text-white">
                  Customer
                </option>
                <option value="ADMIN" className="bg-slate-900 text-white">
                  Admin
                </option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 px-4 py-3 font-medium text-white shadow-lg transition hover:scale-[1.02] hover:shadow-indigo-500/30 ${
                loading ? "cursor-not-allowed opacity-70" : ""
              }`}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-white/70">
            <p>
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-indigo-300 transition hover:text-pink-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <GlobalFooter className="relative z-30" titleClassName="text-white/90" textClassName="text-white/70" />

      {dialogNode}
    </div>
  );
}

export default Register;
