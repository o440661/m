import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as CANNON from 'cannon-es';
import {
  calculateExplosionImpulse,
  computeContactProperties,
  generateBouncyBalls,
  generateDominoRun,
  generateJengaTower,
  generateMixedChaos,
  generatePyramid,
  PresetBlockConfig
} from './math.ts';
import { physicsAudio } from './audio.ts';
import { PhysicsConfig, PhysicsStats, PresetType, ShapeType } from './types.ts';

export interface DragState {
  isDragging: boolean;
  hoveredBodyId: string | null;
  draggedBodyId: string | null;
}

export class PhysicsEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private world: CANNON.World;

  // Reusable math objects
  private _raycaster = new THREE.Raycaster();
  private _mousePos = new THREE.Vector2();
  private _dragPlane = new THREE.Plane();
  private _planeIntersect = new THREE.Vector3();
  private _camDir = new THREE.Vector3();

  // Mesh & Physics maps
  private bodyEntries = new Map<
    string,
    {
      id: string;
      body: CANNON.Body;
      mesh: THREE.Mesh;
      shape: ShapeType;
      color: string;
    }
  >();

  // Mouse Dragging
  private mouseBody: CANNON.Body | null = null;
  private mouseConstraint: CANNON.PointToPointConstraint | null = null;
  private activeDraggedEntry: { id: string; body: CANNON.Body; mesh: THREE.Mesh } | null = null;
  private tetherLine: THREE.Line | null = null;
  private hoveredMesh: THREE.Mesh | null = null;

  // Configuration
  private config: PhysicsConfig = {
    gravityY: -9.82,
    restitution: 0.55,
    friction: 0.35,
    linearDamping: 0.05
  };

  private timeScale: number = 1.0;
  private isPaused: boolean = false;
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private lastFpsCalcTime: number = 0;
  private currentFps: number = 60;

  // Listeners & Callbacks
  private onStatsCallback?: (stats: PhysicsStats) => void;
  private onDragChangeCallback?: (dragState: DragState) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Three.js Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#090d16');
    this.scene.fog = new THREE.FogExp2('#090d16', 0.018);

    // 2. Camera Setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 150);
    this.camera.position.set(0, 10, 20);

    // 3. Renderer Setup
    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Studio Environment Lighting
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    pmremGenerator.dispose();
    roomEnv.dispose();

    // 5. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03; // Don't look below ground
    this.controls.target.set(0, 2, 0);

    // 6. Lights
    const hemiLight = new THREE.HemisphereLight('#c7d2fe', '#1e293b', 0.85);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 2.2);
    dirLight.position.set(12, 22, 14);
    dirLight.castShadow = !isHeadless;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 60;
    const shadowD = 16;
    dirLight.shadow.camera.left = -shadowD;
    dirLight.shadow.camera.right = shadowD;
    dirLight.shadow.camera.top = shadowD;
    dirLight.shadow.camera.bottom = -shadowD;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 1.0);
    rimLight.position.set(-14, 10, -14);
    this.scene.add(rimLight);

    // 7. Cannon Physics World
    this.world = new CANNON.World();
    this.world.gravity.set(0, this.config.gravityY, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    (this.world.solver as CANNON.GSSolver).iterations = 12;

    this.applyContactProperties();

    // 8. Visual & Physics Ground Arena
    this.createGroundArena();

    // 9. Tether Line for Dragging
    const tetherGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ]);
    const tetherMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 3,
      transparent: true,
      opacity: 0.9
    });
    this.tetherLine = new THREE.Line(tetherGeo, tetherMat);
    this.tetherLine.visible = false;
    this.tetherLine.frustumCulled = false;
    this.scene.add(this.tetherLine);

    // 10. Event Listeners
    this.initEventListeners();

    // 11. Initial Preset
    this.loadPreset('tower');

    // 12. Prewarm & start loop
    this.renderer.compile(this.scene, this.camera);
    this.animate(0);
  }

  private applyContactProperties() {
    const props = computeContactProperties(this.config.restitution, this.config.friction);
    this.world.defaultContactMaterial.restitution = props.restitution;
    this.world.defaultContactMaterial.friction = props.friction;
    this.world.defaultContactMaterial.contactEquationStiffness = props.contactEquationStiffness;
    this.world.defaultContactMaterial.contactEquationRelaxation = props.contactEquationRelaxation;
  }

  private createGroundArena() {
    // Large ground box in Cannon (top surface at y = 0)
    const groundHalfWidth = 20;
    const groundHalfHeight = 1;
    const groundBody = new CANNON.Body({
      mass: 0, // static
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(groundHalfWidth, groundHalfHeight, groundHalfWidth)),
      position: new CANNON.Vec3(0, -groundHalfHeight, 0)
    });
    this.world.addBody(groundBody);

    // Visual Platform (3-part composite assembly for rich fidelity)
    const arenaGroup = new THREE.Group();

    // Main play surface with circular chamfered base
    const surfaceGeo = new THREE.CylinderGeometry(15, 15.6, 0.4, 48);
    const surfaceMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.65,
      metalness: 0.2
    });
    const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
    surfaceMesh.position.y = -0.2;
    surfaceMesh.receiveShadow = true;
    arenaGroup.add(surfaceMesh);

    // Inner Grid Circle
    const gridHelper = new THREE.GridHelper(26, 26, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = 0.01;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.6;
    arenaGroup.add(gridHelper);

    // Glowing Neon Rim Ring
    const ringGeo = new THREE.RingGeometry(14.8, 15.1, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.015;
    arenaGroup.add(ringMesh);

    // Radial shadow grounding ring underneath
    const shadowGeo = new THREE.RingGeometry(15, 20, 48);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x030712,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.4;
    arenaGroup.add(shadowMesh);

    this.scene.add(arenaGroup);
  }

  // --- Interaction & Dragging ---

  private initEventListeners() {
    const dom = this.renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      // Primary mouse button only
      if (e.button !== 0) return;

      this.updateMousePos(e);
      this._raycaster.setFromCamera(this._mousePos, this.camera);

      const meshes = Array.from(this.bodyEntries.values()).map(entry => entry.mesh);
      const intersects = this._raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const hitMesh = hit.object as THREE.Mesh;
        const entry = Array.from(this.bodyEntries.values()).find(en => en.mesh === hitMesh);

        if (entry) {
          this.startDragging(entry, hit.point);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      this.updateMousePos(e);

      if (this.activeDraggedEntry && this.mouseBody && this.mouseConstraint) {
        // Project onto drag plane
        this._raycaster.setFromCamera(this._mousePos, this.camera);
        if (this._raycaster.ray.intersectPlane(this._dragPlane, this._planeIntersect)) {
          // Clamp to reasonable play boundary
          this._planeIntersect.y = Math.max(0.2, this._planeIntersect.y);

          // Update kinematic mouse body position
          this.mouseBody.position.set(
            this._planeIntersect.x,
            this._planeIntersect.y,
            this._planeIntersect.z
          );

          // Update tether visual line
          if (this.tetherLine) {
            const positions = this.tetherLine.geometry.attributes.position as THREE.BufferAttribute;
            positions.setXYZ(0, this.activeDraggedEntry.body.position.x, this.activeDraggedEntry.body.position.y, this.activeDraggedEntry.body.position.z);
            positions.setXYZ(1, this._planeIntersect.x, this._planeIntersect.y, this._planeIntersect.z);
            positions.needsUpdate = true;
            this.tetherLine.visible = true;
          }
        }
      } else {
        // Hover inspection
        this._raycaster.setFromCamera(this._mousePos, this.camera);
        const meshes = Array.from(this.bodyEntries.values()).map(entry => entry.mesh);
        const intersects = this._raycaster.intersectObjects(meshes, false);

        if (intersects.length > 0) {
          const hovered = intersects[0].object as THREE.Mesh;
          if (this.hoveredMesh !== hovered) {
            this.setMeshHighlight(this.hoveredMesh, false);
            this.hoveredMesh = hovered;
            this.setMeshHighlight(this.hoveredMesh, true);
            dom.style.cursor = 'grab';

            const entry = Array.from(this.bodyEntries.values()).find(en => en.mesh === hovered);
            this.notifyDragChange(false, entry ? entry.id : null, null);
          }
        } else if (this.hoveredMesh) {
          this.setMeshHighlight(this.hoveredMesh, false);
          this.hoveredMesh = null;
          dom.style.cursor = 'default';
          this.notifyDragChange(false, null, null);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (this.activeDraggedEntry) {
        this.stopDragging();
      }
    };

    const onResize = () => {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('resize', onResize);
  }

  private updateMousePos(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private setMeshHighlight(mesh: THREE.Mesh | null, highlight: boolean) {
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (mat && mat.emissive) {
      if (highlight) {
        mat.emissive.set('#38bdf8');
        mat.emissiveIntensity = 0.35;
      } else {
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      }
    }
  }

  private startDragging(entry: { id: string; body: CANNON.Body; mesh: THREE.Mesh }, hitPoint: THREE.Vector3) {
    this.activeDraggedEntry = entry;
    this.controls.enabled = false; // Disable orbit while dragging
    this.renderer.domElement.style.cursor = 'grabbing';

    // Set camera-facing plane through hit point
    this.camera.getWorldDirection(this._camDir);
    this._dragPlane.setFromNormalAndCoplanarPoint(this._camDir.negate(), hitPoint);

    // Kinematic target body
    this.mouseBody = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.KINEMATIC,
      position: new CANNON.Vec3(hitPoint.x, hitPoint.y, hitPoint.z)
    });
    this.world.addBody(this.mouseBody);

    // Point-to-point constraint between hit body and kinematic mouse
    const localHit = entry.body.pointToLocalFrame(
      new CANNON.Vec3(hitPoint.x, hitPoint.y, hitPoint.z)
    );
    this.mouseConstraint = new CANNON.PointToPointConstraint(
      entry.body,
      localHit,
      this.mouseBody,
      new CANNON.Vec3(0, 0, 0),
      1400 // maxForce
    );
    this.world.addConstraint(this.mouseConstraint);

    entry.body.wakeUp();

    this.notifyDragChange(true, entry.id, entry.id);
  }

  private stopDragging() {
    if (this.mouseConstraint) {
      this.world.removeConstraint(this.mouseConstraint);
      this.mouseConstraint = null;
    }
    if (this.mouseBody) {
      this.world.removeBody(this.mouseBody);
      this.mouseBody = null;
    }
    if (this.tetherLine) {
      this.tetherLine.visible = false;
    }

    if (this.activeDraggedEntry) {
      this.activeDraggedEntry.body.wakeUp();
    }

    this.activeDraggedEntry = null;
    this.controls.enabled = true;
    this.renderer.domElement.style.cursor = this.hoveredMesh ? 'grab' : 'default';

    this.notifyDragChange(false, this.hoveredMesh ? (this.hoveredMesh.userData.id ?? null) : null, null);
  }

  private notifyDragChange(isDragging: boolean, hoveredBodyId: string | null, draggedBodyId: string | null) {
    if (this.onDragChangeCallback) {
      this.onDragChangeCallback({ isDragging, hoveredBodyId, draggedBodyId });
    }
  }

  // --- Spawning Bodies ---

  public spawnShape(shape: ShapeType, position?: THREE.Vector3, colorOverride?: string) {
    const id = `body_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];
    const chosenColor = colorOverride || colors[Math.floor(Math.random() * colors.length)];

    // Target position
    const posX = position ? position.x : (Math.random() - 0.5) * 4;
    const posY = position ? position.y : 8 + Math.random() * 2;
    const posZ = position ? position.z : (Math.random() - 0.5) * 4;

    let body: CANNON.Body;
    let mesh: THREE.Mesh;

    const material = new THREE.MeshStandardMaterial({
      color: chosenColor,
      roughness: 0.35,
      metalness: 0.45
    });

    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    if (shape === 'sphere') {
      const radius = 0.7;
      const sphereShape = new CANNON.Sphere(radius);
      body = new CANNON.Body({
        mass: 1.2,
        shape: sphereShape,
        position: new CANNON.Vec3(posX, posY, posZ),
        linearDamping: this.config.linearDamping,
        angularDamping: 0.05
      });

      const sphereGeo = new THREE.SphereGeometry(radius, 24, 24);
      mesh = new THREE.Mesh(sphereGeo, material);
    } else if (shape === 'box') {
      const hx = 0.55;
      const hy = 0.55;
      const hz = 0.55;
      const boxShape = new CANNON.Box(new CANNON.Vec3(hx, hy, hz));
      body = new CANNON.Body({
        mass: 1.5,
        shape: boxShape,
        position: new CANNON.Vec3(posX, posY, posZ),
        linearDamping: this.config.linearDamping,
        angularDamping: 0.05
      });

      const boxGeo = new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2);
      mesh = new THREE.Mesh(boxGeo, material);
    } else {
      // Cylinder
      const radius = 0.55;
      const height = 1.3;
      const cylinderShape = new CANNON.Cylinder(radius, radius, height, 16);
      body = new CANNON.Body({
        mass: 1.4,
        position: new CANNON.Vec3(posX, posY, posZ),
        linearDamping: this.config.linearDamping,
        angularDamping: 0.05
      });

      // Cannon cylinder is along Z; rotate shape by 90deg around X so it aligns with Three.js Y-axis
      const q = new CANNON.Quaternion();
      q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
      body.addShape(cylinderShape, new CANNON.Vec3(0, 0, 0), q);

      const cylinderGeo = new THREE.CylinderGeometry(radius, radius, height, 24);
      mesh = new THREE.Mesh(cylinderGeo, material);
    }

    // Gentle initial spin
    body.angularVelocity.set(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );

    // Collision sound
    body.addEventListener('collide', (e: { contact: { getImpactVelocityAlongNormal: () => number } }) => {
      const v = e.contact.getImpactVelocityAlongNormal();
      physicsAudio.playImpact(v, body.mass);
    });

    mesh.castShadow = !isHeadless;
    mesh.receiveShadow = true;
    mesh.userData = { id, shape, color: chosenColor };

    this.world.addBody(body);
    this.scene.add(mesh);

    this.bodyEntries.set(id, {
      id,
      body,
      mesh,
      shape,
      color: chosenColor
    });

    physicsAudio.playSpawn();
    return id;
  }

  // --- Presets ---

  public loadPreset(preset: PresetType) {
    this.clearWorld();

    let configs: PresetBlockConfig[] = [];
    if (preset === 'tower') {
      configs = generateJengaTower(8);
    } else if (preset === 'pyramid') {
      configs = generatePyramid(5);
    } else if (preset === 'dominoes') {
      configs = generateDominoRun(14);
    } else if (preset === 'bouncy_balls') {
      configs = generateBouncyBalls(18);
    } else {
      configs = generateMixedChaos(22);
    }

    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    configs.forEach((cfg, idx) => {
      const id = `preset_${idx}_${Date.now()}`;
      let body: CANNON.Body;
      let mesh: THREE.Mesh;

      const material = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.35,
        metalness: 0.45
      });

      if (cfg.shape === 'sphere') {
        const radius = cfg.size.radius || cfg.size.x / 2;
        const sphereShape = new CANNON.Sphere(radius);
        body = new CANNON.Body({
          mass: 1.2,
          shape: sphereShape,
          position: new CANNON.Vec3(cfg.position.x, cfg.position.y, cfg.position.z),
          linearDamping: this.config.linearDamping
        });
        mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 24), material);
      } else if (cfg.shape === 'box') {
        const hx = cfg.size.x / 2;
        const hy = cfg.size.y / 2;
        const hz = cfg.size.z / 2;
        body = new CANNON.Body({
          mass: 1.5,
          shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)),
          position: new CANNON.Vec3(cfg.position.x, cfg.position.y, cfg.position.z),
          linearDamping: this.config.linearDamping
        });
        mesh = new THREE.Mesh(new THREE.BoxGeometry(cfg.size.x, cfg.size.y, cfg.size.z), material);
      } else {
        const radius = cfg.size.radius || cfg.size.x / 2;
        const height = cfg.size.y;
        body = new CANNON.Body({
          mass: 1.4,
          position: new CANNON.Vec3(cfg.position.x, cfg.position.y, cfg.position.z),
          linearDamping: this.config.linearDamping
        });
        const q = new CANNON.Quaternion();
        q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
        body.addShape(new CANNON.Cylinder(radius, radius, height, 16), new CANNON.Vec3(0, 0, 0), q);
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), material);
      }

      body.addEventListener('collide', (e: { contact: { getImpactVelocityAlongNormal: () => number } }) => {
        const v = e.contact.getImpactVelocityAlongNormal();
        physicsAudio.playImpact(v, body.mass);
      });

      mesh.castShadow = !isHeadless;
      mesh.receiveShadow = true;
      mesh.userData = { id, shape: cfg.shape, color: cfg.color };

      this.world.addBody(body);
      this.scene.add(mesh);
      this.bodyEntries.set(id, { id, body, mesh, shape: cfg.shape, color: cfg.color });
    });
  }

  // --- Shockwave Blast ---

  public applyShockwave(origin?: THREE.Vector3, strength: number = 28, radius: number = 18) {
    const center = origin || new THREE.Vector3(0, 0.5, 0);

    this.bodyEntries.forEach(({ body }) => {
      const impulse = calculateExplosionImpulse(
        { x: body.position.x, y: body.position.y, z: body.position.z },
        { x: center.x, y: center.y, z: center.z },
        strength * body.mass,
        radius
      );

      if (impulse.x !== 0 || impulse.y !== 0 || impulse.z !== 0) {
        body.wakeUp();
        body.applyImpulse(
          new CANNON.Vec3(impulse.x, impulse.y, impulse.z),
          new CANNON.Vec3(body.position.x, body.position.y, body.position.z)
        );
      }
    });

    // Visual ripple effect
    this.createShockwaveVisual(center, radius);
    physicsAudio.playShockwave();
  }

  private createShockwaveVisual(center: THREE.Vector3, radius: number) {
    const ringGeo = new THREE.RingGeometry(0.2, 0.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(center.x, center.y + 0.1, center.z);
    this.scene.add(ring);

    const startTime = performance.now();
    const duration = 400;

    const animateRing = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      const currentRadius = 0.5 + progress * radius;
      ring.scale.set(currentRadius, currentRadius, 1);
      ringMat.opacity = 0.95 * (1.0 - progress);

      if (progress < 1.0) {
        requestAnimationFrame(animateRing);
      } else {
        this.scene.remove(ring);
        ringGeo.dispose();
        ringMat.dispose();
      }
    };

    animateRing();
  }

  // --- Controls & Sliders ---

  public setGravity(gravityY: number) {
    this.config.gravityY = gravityY;
    this.world.gravity.set(0, gravityY, 0);
    // Wake up all bodies so gravity change is immediate
    this.bodyEntries.forEach(({ body }) => body.wakeUp());
  }

  public setRestitution(restitution: number) {
    this.config.restitution = restitution;
    this.applyContactProperties();
    this.bodyEntries.forEach(({ body }) => body.wakeUp());
  }

  public setFriction(friction: number) {
    this.config.friction = friction;
    this.applyContactProperties();
  }

  public setTimeScale(scale: number) {
    this.timeScale = Math.max(0.1, Math.min(3.0, scale));
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  public getPaused(): boolean {
    return this.isPaused;
  }

  public stepSingleFrame() {
    if (this.isPaused) {
      this.world.step(1 / 60);
      this.syncMeshes();
    }
  }

  public clearWorld() {
    if (this.activeDraggedEntry) {
      this.stopDragging();
    }

    this.bodyEntries.forEach(({ body, mesh }) => {
      this.world.removeBody(body);
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });

    this.bodyEntries.clear();
    this.hoveredMesh = null;
  }

  public resetCamera() {
    this.camera.position.set(0, 10, 20);
    this.controls.target.set(0, 2, 0);
    this.controls.update();
  }

  private lastRenderTimestamp: number = 0;

  // --- Animation Loop ---

  private animate = (timestamp: number) => {
    this.animFrameId = requestAnimationFrame(this.animate);

    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    if (isHeadless && timestamp - this.lastRenderTimestamp < 50) {
      return;
    }
    this.lastRenderTimestamp = timestamp;

    if (this.lastTime === 0) {
      this.lastTime = timestamp;
      this.lastFpsCalcTime = timestamp;
    }

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    // FPS Counter
    this.frameCount++;
    if (timestamp - this.lastFpsCalcTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsCalcTime));
      this.frameCount = 0;
      this.lastFpsCalcTime = timestamp;
    }

    if (!this.isPaused) {
      // Step physics
      const physicsDt = (1 / 60) * this.timeScale;
      this.world.step(1 / 60, dt * this.timeScale, 4);

      // Clean up bodies that fall off the abyss
      const toRemove: string[] = [];
      let kineticEnergy = 0;
      let activeCount = 0;

      this.bodyEntries.forEach((entry, id) => {
        if (entry.body.position.y < -22) {
          toRemove.push(id);
        } else {
          // Sync Mesh to Body
          entry.mesh.position.set(
            entry.body.position.x,
            entry.body.position.y,
            entry.body.position.z
          );
          entry.mesh.quaternion.set(
            entry.body.quaternion.x,
            entry.body.quaternion.y,
            entry.body.quaternion.z,
            entry.body.quaternion.w
          );

          if (entry.body.sleepState !== CANNON.Body.SLEEPING) {
            activeCount++;
          }

          const speedSq = entry.body.velocity.lengthSquared();
          kineticEnergy += 0.5 * entry.body.mass * speedSq;
        }
      });

      toRemove.forEach(id => {
        const entry = this.bodyEntries.get(id);
        if (entry) {
          this.world.removeBody(entry.body);
          this.scene.remove(entry.mesh);
          entry.mesh.geometry.dispose();
          if (Array.isArray(entry.mesh.material)) {
            entry.mesh.material.forEach(m => m.dispose());
          } else {
            entry.mesh.material.dispose();
          }
          this.bodyEntries.delete(id);
        }
      });

      // Notify stats
      if (this.onStatsCallback) {
        this.onStatsCallback({
          bodyCount: this.bodyEntries.size,
          activeCount,
          fps: this.currentFps,
          kineticEnergy: Math.round(kineticEnergy * 10) / 10
        });
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private syncMeshes() {
    this.bodyEntries.forEach(entry => {
      entry.mesh.position.set(entry.body.position.x, entry.body.position.y, entry.body.position.z);
      entry.mesh.quaternion.set(
        entry.body.quaternion.x,
        entry.body.quaternion.y,
        entry.body.quaternion.z,
        entry.body.quaternion.w
      );
    });
  }

  public setStatsCallback(cb: (stats: PhysicsStats) => void) {
    this.onStatsCallback = cb;
  }

  public setDragChangeCallback(cb: (dragState: DragState) => void) {
    this.onDragChangeCallback = cb;
  }

  public getConfig(): PhysicsConfig {
    return { ...this.config };
  }

  public dispose() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.clearWorld();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
