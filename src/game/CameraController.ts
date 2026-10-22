import * as THREE from 'three';

/**
 * 第三人稱斜上方約 35 度平順跟隨鏡頭（規格書 1.2 & 3.1：避免學生手動旋轉造成眩暈）
 */
export class CameraController {
  public readonly camera: THREE.PerspectiveCamera;
  private readonly offset = new THREE.Vector3(0, 8.8, 10.5);
  private readonly lookAtTarget = new THREE.Vector3();
  private readonly desiredPosition = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 160);
    this.camera.position.set(0, 9, 12);
  }

  public snapTo(targetPos: THREE.Vector3): void {
    this.desiredPosition.copy(targetPos).add(this.offset);
    this.camera.position.copy(this.desiredPosition);
    this.lookAtTarget.copy(targetPos).add(new THREE.Vector3(0, 0.7, -1.2));
    this.camera.lookAt(this.lookAtTarget);
  }

  public update(dt: number, targetPos: THREE.Vector3): void {
    this.desiredPosition.copy(targetPos).add(this.offset);
    const lerpFactor = 1 - Math.exp(-6.5 * dt);
    this.camera.position.lerp(this.desiredPosition, lerpFactor);

    const desiredLook = new THREE.Vector3(targetPos.x, targetPos.y + 0.7, targetPos.z - 1.2);
    this.lookAtTarget.lerp(desiredLook, lerpFactor);
    this.camera.lookAt(this.lookAtTarget);
  }

  public resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
