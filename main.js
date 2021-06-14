import './style.css'

import * as THREE from 'three';
import * as dat from 'dat.gui'
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import requestAnimationFrame from "dat.gui/src/dat/utils/requestAnimationFrame";

/**
 * ENV
 */
const env = {
    width: 200,
    length: 200,
    pointSize: 0.15,
    threshold: 0.4,
    raiseRadius: 0.1,
    raiseHeight: 0.2,
    raiseSpeed: 0.008,
    raiseSpeedSlowMult: 4,
    colorStr: 0x00ff00,
    color: new THREE.Color( 0x00ff00 ),
    defaultColorIntensity: 0.1,
    enableDots: true,
}


/**
 * Scene
 */
const scene = new THREE.Scene();


/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 10, 10);
camera.lookAt(scene.position);


/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('screen'),
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);


/**
 * Raycaster
 */
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = env.threshold;


/**
 * Controls
 */
const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 30;
controls.maxDistance = 100;
controls.enabled = false;


/**
 * Pointer
 */
const pointer = new THREE.Vector2()
document.addEventListener( 'pointermove', onPointerMove );
function onPointerMove( event ) {
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}


/**
 * Lights
 */
const pointLight = new THREE.PointLight(0xffffff, 0.5);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
pointLight.position.set(55, 55, 55);
scene.add(pointLight);
scene.add(ambientLight);


/**
 * Debug
 */
const gui = new dat.GUI()

gui.add(env, 'width').min(100).max(500).step(10).onChange(hardUpdate);
gui.add(env, 'length').min(100).max(500).step(10).onChange(hardUpdate);
gui.add(env, 'pointSize').min(0.01).max(1).step(0.01).onChange(update);
gui.add(env, 'threshold').min(0.1).max(1).step(0.1).onChange(update);
gui.add(env, 'raiseRadius').min(0.01).max(1).step(0.01);
gui.add(env, 'raiseHeight').min(0.01).max(5).step(0.01);
gui.add(env, 'raiseSpeed').min(0.0001).max(0.01);
gui.add(env, 'raiseSpeedSlowMult').min(1).max(10);
gui.addColor(env, 'colorStr').onChange((color) => {
        env.color = new THREE.Color(color);
});
gui.add(env, 'defaultColorIntensity').min(0.01).max(1).onChange(hardUpdate);
gui.add({hardUpdate}, 'hardUpdate');
gui.add(env, 'enableDots').onChange(hardUpdate);


/**
 * Update
 */
function update() {
    plane.material.size = env.pointSize;
    raycaster.params.Points.threshold = env.threshold
}
function hardUpdate() {
    scene.remove(plane);
    scene.remove(stars);
    init();
    update();
}


/**
 * Init
 */
let plane, stars;
function init() {
    stars = new THREE.Group();
    new Array(200).fill().map(() => {
        const star = createStar();

        stars.add(star);
    });
    scene.add( stars );

    plane = generatePlane( env.color, env.width, env.length );
    plane.scale.set( 100, 100, 40 );
    plane.position.set( 0, 0, 0 );
    plane.rotation.set( - Math.PI * 0.5, 0, 0 );
    scene.add( plane );
}

/**
 * Animate
 */
let intersection = null;
const clock = new THREE.Clock()

function animation() {
    const deltaTime = clock.getDelta()

    camera.applyMatrix4(new THREE.Matrix4().makeRotationY(deltaTime * 0.1));
    camera.updateMatrixWorld();

    raycaster.setFromCamera( pointer, camera );

    const intersections = raycaster.intersectObjects( scene.children );
    intersection = ( intersections.length ) > 0 ? intersections[ 0 ] : null;

    let intersectionX, intersectionY, needsUpdate = false;
    if (intersection) {
        if (env.enableDots) {
            intersectionX = plane.geometry.attributes.position.array[intersection.index * 3];
            intersectionY = plane.geometry.attributes.position.array[intersection.index * 3+1];
        } else {
            intersectionX = intersection.uv.x - 0.5;
            intersectionY = intersection.uv.y - 0.5;
        }
    }
    for (let i = 0; i < env.width * env.length; i++) {
        let x = plane.geometry.attributes.position.array[i * 3];
        let y = plane.geometry.attributes.position.array[i * 3+1];
        let z = plane.geometry.attributes.position.array[i * 3+2];

        let zNeedToBe = intersection ? getZbyDot([intersectionX, intersectionY], [x, y]) : 0;

        const res = zNeedToBe - z;
        if (res > 0) {
            zNeedToBe = z + Math.min(res, env.raiseSpeed * Math.sin(Math.abs(res / env.raiseHeight) * Math.PI / 4 / (env.raiseHeight > 0 ? 1 : env.raiseSpeedSlowMult)));
        } else if (res < 0) {
            zNeedToBe = z + Math.max(res, -env.raiseSpeed * Math.sin(Math.abs(res / env.raiseHeight) * Math.PI / 4 / (env.raiseHeight < 0 ? 1 : env.raiseSpeedSlowMult)));
        } else {
            continue;
        }
        needsUpdate = true;
        plane.geometry.attributes.position.array[i * 3+2] = zNeedToBe;

        const intensity = Math.abs(zNeedToBe / env.raiseHeight) + env.defaultColorIntensity;
        // plane.material.color.r = env.color.r * intensity;
        // plane.material.color.g = env.color.g * intensity;
        // plane.material.color.b = env.color.b * intensity;
        plane.geometry.attributes.color.array[i * 3] = intensity * env.color.r;
        plane.geometry.attributes.color.array[i * 3+1] = intensity * env.color.g;
        plane.geometry.attributes.color.array[i * 3+2] = intensity * env.color.b;
    }
    plane.geometry.attributes.position.needsUpdate = needsUpdate;
    plane.geometry.attributes.color.needsUpdate = needsUpdate;

    controls.update();

    renderer.render(scene, camera);
    requestAnimationFrame(animation);
}


/**
 * Start
 */
init();
animation();

/**
 * Helpers
 */
function random(min, max) {
    return THREE.MathUtils.randFloat(min, max);
}
function getZbyDot(dot1, dot2) {
    const [x1, y1] = dot1;
    const [x2, y2] = dot2;

    const a = Math.abs(x1-x2);
    const b = Math.abs(y1-y2);
    const z = Math.sqrt(a*a + b*b);

    const res = env.raiseRadius - z;

    if (res > 0) {
        return Math.sin(res / env.raiseRadius * Math.PI / 2) * env.raiseHeight;
    }
    return 0;
}
function createStar() {
    const geometry = new THREE.SphereGeometry( 0.1);
    const material = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true});

    const item = new THREE.Mesh(geometry, material);

    const coordinates = Array(3).fill().map(() => random(-50, 50));

    item.position.set(...coordinates);

    return item;
}
function generatePlane( color, width, length ) {
    const geometry = new THREE.PlaneGeometry(1, 1, width, length);
    geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array( width * length * 3).fill().map((item, index) => {
        if (index % 3 === 0) {
            return color.r * env.defaultColorIntensity;
        } else if (index % 3 === 1) {
            return color.g * env.defaultColorIntensity;
        } else {
            return color.b * env.defaultColorIntensity;
        }
    }), 3 ) );
    let material;
    if (env.enableDots) {
        material = new THREE.PointsMaterial( { size: env.pointSize, vertexColors: true } );
        return new THREE.Points( geometry, material );
    } else {
        material = new THREE.MeshStandardMaterial({color, flatShading: true, vertexColors: true});
        return new THREE.Mesh( geometry, material );
    }

}

/**
 * Resize
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

window.addEventListener( 'resize', onWindowResize );

