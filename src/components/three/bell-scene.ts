import {
  ACESFilmicToneMapping,
  Box3,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Texture,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { extractBellShapes } from "./bell-shapes";

const BODY_DEPTH = 18;
const LETTER_DEPTH = 30;
const SWAY_DEG = 12;
const SCROLL_TURN_DEG = 30;
const SCROLL_PULLBACK = 0.25;

/**
 * Cảnh three.js một vật thể: quả chuông PK vàng kim đùn từ logo gốc.
 * Lắc nhẹ quanh trục đứng, nghiêng theo con trỏ, xoay thêm và lùi xa khi cuộn qua Hero.
 */
export class BellScene {
  onContextLost?: () => void;

  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(30, 1, 1, 10000);
  private pivot = new Group();
  private envTexture: Texture;
  private pmrem: PMREMGenerator;
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private running = false;
  private baseDistance = 1000;
  private bellSize = new Vector3(1, 1, 1);
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private scroll = 0;
  private startTime = performance.now();
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement, svgText: string) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setClearColor(0x000000, 0);

    this.pmrem = new PMREMGenerator(this.renderer);
    this.envTexture = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;

    const key = new DirectionalLight(0xfff1d0, 1.6);
    key.position.set(-1, 1.2, 2);
    this.scene.add(key);

    this.buildBell(svgText);
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
    this.scroll = MathUtils.clamp(progress, 0, 1);
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
    this.envTexture.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
  }

  private buildBell(svgText: string): void {
    const { svg, letterIds } = extractBellShapes(svgText);
    const data = new SVGLoader().parse(svg);
    const bodyMaterial = new MeshStandardMaterial({ color: 0xe9be57, metalness: 0.95, roughness: 0.28 });
    const letterMaterial = new MeshStandardMaterial({ color: 0xf2ce72, metalness: 0.9, roughness: 0.22 });

    const shapesGroup = new Group();
    for (const path of data.paths) {
      const id = (path.userData?.node as Element | undefined)?.getAttribute("id") ?? "";
      const isLetter = letterIds.includes(id);
      const geometry = new ExtrudeGeometry(SVGLoader.createShapes(path), {
        depth: isLetter ? LETTER_DEPTH : BODY_DEPTH,
        bevelEnabled: true,
        bevelThickness: 2,
        bevelSize: 1.2,
        bevelSegments: 2,
        curveSegments: 10,
      });
      shapesGroup.add(new Mesh(geometry, isLetter ? letterMaterial : bodyMaterial));
    }

    // SVG có trục Y hướng xuống: lật lại (three tự xử lý chiều mặt khi scale âm), rồi căn giữa
    shapesGroup.scale.y = -1;
    shapesGroup.updateMatrixWorld(true);
    const box = new Box3().setFromObject(shapesGroup);
    const center = box.getCenter(new Vector3());
    shapesGroup.position.sub(center);
    this.pivot.add(shapesGroup);

    box.getSize(this.bellSize);
  }

  /** Lùi camera vừa đủ để cả quả chuông nằm gọn trong khung (tính lại khi đổi tỷ lệ khung). */
  private fitCamera(): void {
    const fitHeight = Math.max(this.bellSize.y, this.bellSize.x / this.camera.aspect);
    this.baseDistance = (fitHeight / 2 / Math.tan(MathUtils.degToRad(this.camera.fov / 2))) * 1.2;
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
    this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.06;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.06;

    this.pivot.rotation.y =
      MathUtils.degToRad(SWAY_DEG) * Math.sin(t * 0.6) +
      this.pointer.x * 0.35 +
      MathUtils.degToRad(SCROLL_TURN_DEG) * this.scroll;
    this.pivot.rotation.x = this.pointer.y * 0.2;
    this.camera.position.set(0, 0, this.baseDistance * (1 + SCROLL_PULLBACK * this.scroll));
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
