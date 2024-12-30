import React, { useEffect } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

const ThreeBackground = () => {
  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 30, 60);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x5500ff);
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    const modelPath = '/Open_Small_Box.fbx';
    const texturePath = '/Texture_box.png';

    const models = [];
    const boundaries = { x: 120, y: 50 };
    const loader = new FBXLoader();
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(texturePath);

    const customPositions = [
      { x: -50, y: 20, z: -30 },
      { x: 10, y: 40, z: 40 },
      { x: -20, y: 30, z: 50 },
      { x: 30, y: 10, z: -40 },
      { x: -10, y: 5, z: -50 },
    ];

    loader.load(modelPath, (fbx) => {
      fbx.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = new THREE.MeshStandardMaterial({ map: texture });
        }
      });

      const scaleFactor = 1;
      customPositions.forEach((position) => {
        const modelInstance = fbx.clone();
        modelInstance.scale.set(scaleFactor, scaleFactor, scaleFactor);
        modelInstance.position.set(position.x, position.y, position.z);
        modelInstance.rotationSpeed = { x: Math.random() * 0.02, y: Math.random() * 0.02 };
        modelInstance.velocity = {
          x: (Math.random() - 0.5) * 0.5,
          y: (Math.random() - 0.5) * 0.5,
        };
        modelInstance.recoil = { x: 0, y: 0 };
        scene.add(modelInstance);
        models.push(modelInstance);
      });
    });

    function checkCollision(model1, model2) {
      const distance = model1.position.distanceTo(model2.position);
      const combinedRadius = 0.5;

      return distance < combinedRadius;
    }

    function resolveCollision(model1, model2) {
      const tempVelocity = { ...model1.velocity };
      model1.velocity.x = model2.velocity.x;
      model1.velocity.y = model2.velocity.y;
      model2.velocity.x = tempVelocity.x;
      model2.velocity.y = tempVelocity.y;
    }

    function animate() {
      models.forEach((model) => {
        model.position.x += model.velocity.x;
        model.position.y += model.velocity.y;

        if (model.position.x > boundaries.x || model.position.x < -boundaries.x) {
          model.velocity.x *= -1;
        }
        if (model.position.y > boundaries.y || model.position.y < -boundaries.y) {
          model.velocity.y *= -1;
        }

        models.forEach((otherModel) => {
          if (model !== otherModel && checkCollision(model, otherModel)) {
            resolveCollision(model, otherModel);
          }
        });

        model.rotation.x += model.rotationSpeed.x;
        model.rotation.y += model.rotationSpeed.y;
      });

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.remove();
    };
  }, []);

  return null;
};

export default ThreeBackground;