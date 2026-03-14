/* =====================================================
   ADVANCED AR FACE ENGINE
   Snapchat-like architecture
   ===================================================== */

import { FaceMesh } from "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js"

/* =====================================================
   CONFIG
   ===================================================== */

const MAX_FACES = 3

const POSITION_SMOOTH = 0.35
const ROTATION_SMOOTH = 0.25
const SCALE_SMOOTH = 0.25

/* =====================================================
   GLOBALS
   ===================================================== */

let video
let canvas

let scene
let camera
let renderer

let faceMesh

let faces = []

/* =====================================================
   FACE STATE
   ===================================================== */

class FaceState{

  constructor(){

    this.nose = new THREE.Vector3()
    this.leftEye = new THREE.Vector3()
    this.rightEye = new THREE.Vector3()

    this.rotation = new THREE.Euler()
    this.scale = 1

    this.group = new THREE.Group()

    scene.add(this.group)

    this.lastSeen = performance.now()
  }

}

/* =====================================================
   SMOOTHING
   ===================================================== */

function smooth(a,b,alpha){
  return a*(1-alpha)+b*alpha
}

function smoothVec(prev,next,alpha){

  prev.x = smooth(prev.x,next.x,alpha)
  prev.y = smooth(prev.y,next.y,alpha)
  prev.z = smooth(prev.z,next.z,alpha)

}

/* =====================================================
   INIT ENGINE
   ===================================================== */

export async function initAREngine(videoEl,canvasEl){

  video = videoEl
  canvas = canvasEl

  initThree()
  initFaceMesh()

}

/* =====================================================
   THREE SETUP
   ===================================================== */

function initThree(){

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(
    45,
    canvas.width/canvas.height,
    0.1,
    1000
  )

  camera.position.z = 5

  renderer = new THREE.WebGLRenderer({
    canvas:canvas,
    alpha:true
  })

  renderer.setSize(canvas.width,canvas.height)

}

/* =====================================================
   FACE MESH
   ===================================================== */

function initFaceMesh(){

  faceMesh = new FaceMesh({
    locateFile:(file)=>{
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    }
  })

  faceMesh.setOptions({

    maxNumFaces:MAX_FACES,
    refineLandmarks:true,

    minDetectionConfidence:0.6,
    minTrackingConfidence:0.6

  })

  faceMesh.onResults(onResults)

}

/* =====================================================
   FRAME LOOP
   ===================================================== */

export async function processFrame(){

  await faceMesh.send({image:video})

}

/* =====================================================
   RESULTS
   ===================================================== */

function onResults(results){

  if(!results.multiFaceLandmarks) return

  for(let lm of results.multiFaceLandmarks){

    processLandmarks(lm)

  }

  render()

}

/* =====================================================
   LANDMARK PROCESSING
   ===================================================== */

function processLandmarks(lm){

  const nose = lm[1]
  const leftEye = lm[33]
  const rightEye = lm[263]

  const nx = nose.x*2-1
  const ny = -(nose.y*2-1)

  let face = findFace(nx,ny)

  if(!face) return

  const nextNose = new THREE.Vector3(nx,ny,0)

  smoothVec(face.nose,nextNose,POSITION_SMOOTH)

  const lex = leftEye.x*2-1
  const ley = -(leftEye.y*2-1)

  const rex = rightEye.x*2-1
  const rey = -(rightEye.y*2-1)

  face.leftEye.set(lex,ley,0)
  face.rightEye.set(rex,rey,0)

  const dx = rex-lex
  const dy = rey-ley

  const angle = Math.atan2(dy,dx)

  face.rotation.z = smooth(face.rotation.z,angle,ROTATION_SMOOTH)

  const dist = Math.hypot(dx,dy)

  const scale = dist*2.5

  face.scale = smooth(face.scale,scale,SCALE_SMOOTH)

  updateFaceObject(face)

}

/* =====================================================
   FACE MATCH
   ===================================================== */

function findFace(x,y){

  let best=null
  let bestDist=999

  for(let f of faces){

    const dx=f.nose.x-x
    const dy=f.nose.y-y

    const d=dx*dx+dy*dy

    if(d<bestDist){
      bestDist=d
      best=f
    }

  }

  if(best && bestDist<0.2) return best

  if(faces.length<MAX_FACES){

    const f=new FaceState()
    faces.push(f)

    return f
  }

  return null
}

/* =====================================================
   UPDATE OBJECT
   ===================================================== */

function updateFaceObject(face){

  face.group.position.copy(face.nose)

  face.group.rotation.z = face.rotation.z

  face.group.scale.set(
    face.scale,
    face.scale,
    face.scale
  )

}

/* =====================================================
   FILTER CREATION
   ===================================================== */

export function createGlasses(){

  const geometry = new THREE.TorusGeometry(0.3,0.05,16,100)

  const material = new THREE.MeshBasicMaterial({
    color:0x000000
  })

  const left = new THREE.Mesh(geometry,material)
  left.position.x=-0.5

  const right = new THREE.Mesh(geometry,material)
  right.position.x=0.5

  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.2,0.05,0.05),
    material
  )

  const group = new THREE.Group()

  group.add(left)
  group.add(right)
  group.add(bridge)

  return group

}

/* =====================================================
   ADD FILTER
   ===================================================== */

export function attachFilter(faceIndex,object){

  if(!faces[faceIndex]) return

  faces[faceIndex].group.add(object)

}

/* =====================================================
   RENDER
   ===================================================== */

function render(){

  renderer.render(scene,camera)

}