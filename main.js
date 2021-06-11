import './style.css'

import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

const width = 300;
const length = 300;
const pointSize = 0.05;
const threshold = 0.2;
const raiseRadius = 0.1;
let raiseHeight = 0.2;
let raiseSpeed = 0.008;
let raiseSpeedSlowMult = 4;
let intersection = null;
let color = new THREE.Color( 0, 1, 0 );

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('screen'),
});

const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = threshold;
const pointer = new THREE.Vector2();

const rotateX = (num) => new THREE.Matrix4().makeRotationX(num);
const rotateY = (num) => new THREE.Matrix4().makeRotationY(num);
const rotateZ = (num) => new THREE.Matrix4().makeRotationZ(num);

const pointLight = new THREE.PointLight(0xffffff);
const ambientLight = new THREE.AmbientLight(0x505050);
pointLight.position.setY(55);
scene.add(pointLight);
scene.add(ambientLight);

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.set(10, 10, 10);
camera.lookAt(scene.position);

function random(min, max) {
    return THREE.MathUtils.randFloat(min, max);
}

function createStar() {
    const geometry = new THREE.SphereGeometry( 0.1);
    const material = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true});

    const item = new THREE.Mesh(geometry, material);

    const coordinates = Array(3).fill().map(() => random(-50, 50));

    item.position.set(...coordinates);

    return item;
}
new Array(200).fill().map(() => {
    const star = createStar();

    scene.add(star);
});

// const controls = new OrbitControls(camera, renderer.domElement);
// controls.minDistance = 30;
// controls.maxDistance = 100;

function generatePointCloudGeometry( color, width, length ) {

    const geometry = new THREE.BufferGeometry();
    const numPoints = width * length;

    const positions = new Float32Array( numPoints * 3 );
    const colors = new Float32Array( numPoints * 3 );

    let k = 0;

    for ( let i = 0; i < width; i ++ ) {

        for ( let j = 0; j < length; j ++ ) {

            const u = i / width;
            const v = j / length;
            const x = u - 0.5;
            // const y = ( Math.cos( u * Math.PI * 4 ) + Math.sin( v * Math.PI * 8 ) ) / 20;
            const y = 0;
            const z = v - 0.5;

            positions[ 3 * k ] = x;
            positions[ 3 * k + 1 ] = y;
            positions[ 3 * k + 2 ] = z;

            // const intensity = ( y + 0.01 ) * 5;
            const intensity = 0.1;
            colors[ 3 * k ] = color.r * intensity;
            colors[ 3 * k + 1 ] = color.g * intensity;
            colors[ 3 * k + 2 ] = color.b * intensity;

            k ++;

        }

    }

    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
    geometry.computeBoundingBox();

    return geometry;

}

function generatePointcloud( color, width, length ) {

    const geometry = generatePointCloudGeometry( color, width, length );
    const material = new THREE.PointsMaterial( { size: pointSize, vertexColors: true } );

    return new THREE.Points( geometry, material );

}

const pcIndexed = generatePointcloud( color, width, length );
pcIndexed.scale.set( 60, 40, 60 );
pcIndexed.position.set( 0, 0, 0 );
scene.add( pcIndexed );

function getYbyDot(dot1, dot2) {
    const [x1, z1] = dot1;
    const [x2, z2] = dot2;

    const a = Math.abs(x1-x2);
    const b = Math.abs(z1-z2);
    const z = Math.sqrt(a*a + b*b);

    const res = raiseRadius - z;

    if (res > 0) {
        return Math.sin(res / raiseRadius * Math.PI / 2) * raiseHeight;
    }
    return 0;
}

function animation() {
    requestAnimationFrame(animation);

    camera.applyMatrix4(rotateY(0.001));
    camera.updateMatrixWorld();

    raycaster.setFromCamera( pointer, camera );

    const intersections = raycaster.intersectObjects( [pcIndexed] );
    intersection = ( intersections.length ) > 0 ? intersections[ 0 ] : null;

    let intersectionX, intersectionZ;
    if (intersection) {
        intersectionX = pcIndexed.geometry.attributes.position.array[intersection.index * 3];
        intersectionZ = pcIndexed.geometry.attributes.position.array[intersection.index * 3+2];
    }
    for (let i = 0; i < width * length; i++) {
        let x = pcIndexed.geometry.attributes.position.array[i * 3];
        let y = pcIndexed.geometry.attributes.position.array[i * 3+1];
        let z = pcIndexed.geometry.attributes.position.array[i * 3+2];

        let yNeedToBe = intersection ? getYbyDot([intersectionX, intersectionZ], [x, z]) : 0;

        const res = yNeedToBe - y;
        if (res > 0) {
            yNeedToBe = y + Math.min(res, raiseSpeed * Math.sin(Math.abs(res / raiseHeight) * Math.PI / 4 / (raiseHeight > 0 ? 1 : raiseSpeedSlowMult)));
        } else if (res < 0) {
            yNeedToBe = y + Math.max(res, -raiseSpeed * Math.sin(Math.abs(res / raiseHeight) * Math.PI / 4 / (raiseHeight < 0 ? 1 :raiseSpeedSlowMult)));
        }
        pcIndexed.geometry.attributes.position.array[i * 3+1] = yNeedToBe;

        const intensity = Math.abs(yNeedToBe / raiseHeight) + 0.2;
        pcIndexed.geometry.attributes.color.array[i * 3] = intensity * color.r;
        pcIndexed.geometry.attributes.color.array[i * 3+1] = intensity * color.g;
        pcIndexed.geometry.attributes.color.array[i * 3+2] = intensity * color.b;
    }
    pcIndexed.geometry.attributes.position.needsUpdate = true;
    pcIndexed.geometry.attributes.color.needsUpdate = true;

    // controls.update();

    renderer.render(scene, camera);
}

animation();

function onPointerMove( event ) {
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

// function onWindowClick() {
//     raiseHeight = -raiseHeight;
// }

window.addEventListener( 'resize', onWindowResize );
// window.addEventListener( 'click', onWindowClick );
document.addEventListener( 'pointermove', onPointerMove );


