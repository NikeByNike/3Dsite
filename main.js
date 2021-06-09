import './style.css'

import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('screen'),
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(55);

const geometry = new THREE.ConeGeometry(10);
const material = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true});

const item = new THREE.Mesh(geometry, material);

scene.add(item);

function animation() {
    requestAnimationFrame(animation);

    item.rotation.x += 0.01;

    renderer.render(scene, camera);
}

animation();


