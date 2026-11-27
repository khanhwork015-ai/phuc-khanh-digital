import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  NormalBlending,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  type Texture,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { extractBellShapes } from "./bell-shapes";

const BODY_DEPTH = 18;
const LETTER_DEPTH = 30;
const SWAY_DEG = 14;

export type BellSceneOptions = {
  /** Chế độ nhẹ cho mobile: ít hạt hơn, DPR giới hạn 1.25, bỏ PMREM nặng. */
  lite?: boolean;
};

/**
 * Cảnh three.js toàn màn hình cho Hero:
 * - Quả chuông PK vàng kim đùn khối làm tâm điểm
 * - Hai vòng quỹ đạo kim loại mảnh xoay lệch pha
 * - Trường hạt bụi vàng 3D có chiều sâu
 * - Camera zoom-in rồi zoom-out mượt theo tiến độ cuộn (setScroll) và nghiêng theo con trỏ
 */
export class BellScene {
  onContextLost?: () => void;

  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(34, 1, 1, 10000);
  private pivot = new Group();
  private ringA: Mesh | null = null;
  private ringB: Mesh | null = null;
  private particles: Points | null = null;
  private bodyMaterial: MeshStandardMaterial | null = null;
  private letterMaterial: MeshStandardMaterial | null = null;
  private ringMatA: MeshStandardMaterial | null = null;
  private ringMatB: MeshStandardMaterial | null = null;
  private particleMaterial: PointsMaterial | null = null;
  private envTexture: Texture | null = null;
  private pmrem: PMREMGenerator | null = null;
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private running = false;
  private baseDistance = 1000;
  private bellSize = new Vector3(1, 1, 1);
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private scroll = 0;
  private targetScroll = 0;
  private startTime = performance.now();
  private disposed = false;
  private lite: boolean;

  constructor(
    private canvas: HTMLCanvasElement,
    svgText: string,
    options: BellSceneOptions = {},
  ) {
    this.lite = options.lite === true;
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !this.lite,
      powerPreference: this.lite ? "low-power" : "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lite ? 1.25 : 1.75));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(0x000000, 0);

    // Dùng chung RoomEnvironment HDR trên mọi thiết bị (chỉ tạo 1 lần lúc khởi tạo) để chuông mobile sáng như desktop
    this.pmrem = new PMREMGenerator(this.renderer);
    this.envTexture = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;

    if (this.lite) {
      this.scene.add(new HemisphereLight(0xfff4d6, 0x3a2a14, 1.1));
    }

    const key = new DirectionalLight(0xfff1d0, 1.8);
    key.position.set(-1.2, 1.4, 2.2);
    this.scene.add(key);

    const rim = new DirectionalLight(0xe9be57, 1.1);
    rim.position.set(1.6, -0.8, -1.4);
    this.scene.add(rim);

    const warmGlow = new PointLight(0xf2ce72, 1.8, 2800, 1.5);
    warmGlow.position.set(0, 80, 420);
    this.scene.add(warmGlow);

    this.buildBell(svgText);
    this.buildOrbitalRings();
    this.buildParticles();
    this.scene.add(this.pivot);

    canvas.addEventListener("webglcontextlost", this.handleContextLost);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  /** x, y trong khoảng -1..1 (giữa màn hình là 0). */
  setPointer(x: number, y: number): void {
    this.pointer.tx = MathUtils.clamp(x, -1, 1);
    this.pointer.ty = MathUtils.clamp(y, -1, 1);
  }

  /** 0 ở đầu trang, 1 khi đã cuộn hết Hero. */
  setScroll(progress: number): void {
    this.targetScroll = MathUtils.clamp(progress, 0, 1);
  }

  setTheme(isLight: boolean): void {
    if (this.bodyMaterial) {
      this.bodyMaterial.color.setHex(isLight ? 0xc58b16 : 0xe9be57);
      this.bodyMaterial.metalness = isLight ? (this.lite ? 0.42 : 0.78) : (this.lite ? 0.5 : 0.92);
      this.bodyMaterial.roughness = isLight ? 0.28 : this.lite ? 0.28 : 0.24;
      this.bodyMaterial.emissive.setHex(isLight ? 0x3b2304 : this.lite ? 0x3b2c0a : 0x000000);
      this.bodyMaterial.emissiveIntensity = isLight ? 0.25 : this.lite ? 0.4 : 0;
    }
    if (this.letterMaterial) {
      this.letterMaterial.color.setHex(isLight ? 0x18181b : 0xf8ecde);
      this.letterMaterial.metalness = isLight ? 0.25 : this.lite ? 0.35 : 0.85;
      this.letterMaterial.roughness = isLight ? 0.35 : this.lite ? 0.22 : 0.18;
      this.letterMaterial.emissive.setHex(isLight ? 0x09090b : this.lite ? 0x3d372e : 0x000000);
      this.letterMaterial.emissiveIntensity = isLight ? 0.15 : this.lite ? 0.4 : 0;
    }
    if (this.ringMatA) {
      this.ringMatA.color.setHex(isLight ? 0xa16207 : 0xe9be57);
      this.ringMatA.opacity = isLight ? 0.55 : 0.36;
    }
    if (this.ringMatB) {
      this.ringMatB.color.setHex(isLight ? 0x78350f : 0xf8ecde);
      this.ringMatB.opacity = isLight ? 0.32 : 0.2;
    }
    if (this.particleMaterial) {
      this.particleMaterial.color.setHex(isLight ? 0xa16207 : 0xf2ce72);
      this.particleMaterial.opacity = isLight ? 0.78 : 0.55;
      this.particleMaterial.size = isLight ? 4.2 : this.lite ? 3.5 : 3.2;
      this.particleMaterial.blending = isLight ? NormalBlending : AdditiveBlending;
      this.particleMaterial.needsUpdate = true;
    }
  }

  start(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.frame = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    this.resizeObserver.disconnect();
    this.pivot.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.geometry.dispose();
        (obj.material as MeshStandardMaterial).dispose();
      }
    });
    if (this.particles) {
      this.particles.geometry.dispose();
      (this.particles.material as PointsMaterial).dispose();
    }
    this.envTexture?.dispose();
    this.pmrem?.dispose();
    this.renderer.dispose();
  }

  private buildBell(svgText: string): void {
    const { svg, letterIds } = extractBellShapes(svgText);
    const data = new SVGLoader().parse(svg);
    const bodyMaterial = new MeshStandardMaterial({
      color: 0xe9be57,
      metalness: this.lite ? 0.5 : 0.92,
      roughness: this.lite ? 0.28 : 0.24,
      emissive: this.lite ? 0x3b2c0a : 0x000000,
      emissiveIntensity: this.lite ? 0.4 : 0,
    });
    const letterMaterial = new MeshStandardMaterial({
      color: 0xf8ecde,
      metalness: this.lite ? 0.35 : 0.85,
      roughness: this.lite ? 0.22 : 0.18,
      emissive: this.lite ? 0x3d372e : 0x000000,
      emissiveIntensity: this.lite ? 0.4 : 0,
    });
    this.bodyMaterial = bodyMaterial;
    this.letterMaterial = letterMaterial;

    const shapesGroup = new Group();
    for (const path of data.paths) {
      const id = (path.userData?.node as Element | undefined)?.getAttribute("id") ?? "";
      const isLetter = letterIds.includes(id);
      const geometry = new ExtrudeGeometry(SVGLoader.createShapes(path), {
        depth: isLetter ? LETTER_DEPTH : BODY_DEPTH,
        bevelEnabled: true,
        bevelThickness: 2,
        bevelSize: 1.2,
        bevelSegments: this.lite ? 1 : 2,
        curveSegments: this.lite ? 6 : 10,
      });
      shapesGroup.add(new Mesh(geometry, isLetter ? letterMaterial : bodyMaterial));
    }

    shapesGroup.scale.y = -1;
    shapesGroup.updateMatrixWorld(true);
    const box = new Box3().setFromObject(shapesGroup);
    const center = box.getCenter(new Vector3());
    shapesGroup.position.sub(center);
    this.pivot.add(shapesGroup);

    box.getSize(this.bellSize);
  }

  private buildOrbitalRings(): void {
    const radius = Math.max(this.bellSize.x, this.bellSize.y) * 0.72;
    const ringMatA = new MeshStandardMaterial({
      color: 0xe9be57,
      metalness: 0.9,
      roughness: 0.25,
      transparent: true,
      opacity: 0.36,
    });
    this.ringMatA = ringMatA;
    const ringA = new Mesh(new TorusGeometry(radius, 1.4, 12, this.lite ? 64 : 96), ringMatA);
    ringA.rotation.set(Math.PI * 0.38, Math.PI * 0.14, 0);
    this.ringA = ringA;
    this.pivot.add(ringA);

    if (!this.lite) {
      const ringMatB = new MeshStandardMaterial({
        color: 0xf8ecde,
        metalness: 0.85,
        roughness: 0.3,
        transparent: true,
        opacity: 0.2,
      });
      this.ringMatB = ringMatB;
      const ringB = new Mesh(new TorusGeometry(radius * 1.22, 1.0, 10, 96), ringMatB);
      ringB.rotation.set(-Math.PI * 0.32, Math.PI * 0.28, 0);
      this.ringB = ringB;
      this.pivot.add(ringB);
    }
  }

  private buildParticles(): void {
    const count = this.lite ? 80 : 220;
    const positions = new Float32Array(count * 3);
    const spreadX = Math.max(this.bellSize.x, 400) * 3.2;
    const spreadY = Math.max(this.bellSize.y, 400) * 2.4;
    const spreadZ = 900;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spreadX;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spreadY;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spreadZ - 120;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    const material = new PointsMaterial({
      color: 0xf2ce72,
      size: this.lite ? 3.5 : 3.2,
      transparent: true,
      opacity: 0.55,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.particleMaterial = material;
    this.particles = new Points(geometry, material);
    this.scene.add(this.particles);
  }

  private fitCamera(): void {
    const fitHeight = Math.max(this.bellSize.y, this.bellSize.x / this.camera.aspect);
    // Chừa dư biên 2.35x để hai vòng quỹ đạo ngoài cùng không bị cắt ở mép trên/dưới khi xoay/zoom
    this.baseDistance = (fitHeight / 2 / Math.tan(MathUtils.degToRad(this.camera.fov / 2))) * 2.35;
  }

  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fitCamera();
    if (!this.running) this.render();
  }

  private render(): void {
    const t = (performance.now() - this.startTime) / 1000;
    this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.07;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.07;
    this.scroll += (this.targetScroll - this.scroll) * 0.1;

    // Giai đoạn 1 (0 -> 0.45): zoom-in vừa phải vào chuông; Giai đoạn 2 (0.45 -> 1): zoom-out lùi sâu
    const zoomPhase =
      this.scroll < 0.45
        ? 1 - 0.15 * (this.scroll / 0.45)
        : 0.85 + 0.55 * ((this.scroll - 0.45) / 0.55);

    this.pivot.rotation.y =
      MathUtils.degToRad(SWAY_DEG) * Math.sin(t * 0.65) +
      this.pointer.x * 0.42 +
      MathUtils.degToRad(58) * this.scroll;
    this.pivot.rotation.x = this.pointer.y * 0.24 - MathUtils.degToRad(10) * this.scroll;
    this.pivot.position.y = Math.sin(t * 1.1) * 8 - this.scroll * 35;

    if (this.ringA) {
      this.ringA.rotation.z = t * 0.22 + this.scroll * 1.2;
    }
    if (this.ringB) {
      this.ringB.rotation.z = -t * 0.16 - this.scroll * 0.9;
    }
    if (this.particles) {
      this.particles.rotation.y = t * 0.04 + this.pointer.x * 0.08 + this.scroll * 0.35;
      this.particles.rotation.x = this.pointer.y * 0.05;
    }

    const camX = this.pointer.x * 45;
    const camY = -this.pointer.y * 28 + this.scroll * 24;
    this.camera.position.set(camX, camY, this.baseDistance * zoomPhase);
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }

  private tick = () => {
    if (!this.running) return;
    this.render();
    this.frame = requestAnimationFrame(this.tick);
  };

  private handleContextLost = (event: Event) => {
    event.preventDefault();
    this.stop();
    this.onContextLost?.();
  };
}
