/* ==========================================================
   PRO AR FACE FILTER ENGINE
   Snapchat-level stability architecture
   ========================================================== */

import { FaceMesh } from "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";

/* ==========================================================
   CONFIG
   ========================================================== */

const MAX_FACES = 3
const POSITION_SMOOTH = 0.35
const ROTATION_SMOOTH = 0.25
const SCALE_SMOOTH = 0.25

/* ==========================================================
   STATE
   ========================================================== */

let faceMesh
let videoEl
let canvasEl
let ctx

let faces = []

/* ==========================================================
   FACE STATE OBJECT
   ========================================================== */

class FaceState {

  constructor(id){
    this.id = id

    this.noseX = 0
    this.noseY = 0

    this.leftEyeX = 0
    this.leftEyeY = 0

    this.rightEyeX = 0
    this.rightEyeY = 0

    this.mouthX = 0
    this.mouthY = 0

    this.angle = 0
    this.scale = 1

    this.lastSeen = performance.now()
  }

}

/* ==========================================================
   SMOOTH FUNCTIONS
   ========================================================== */

function smooth(prev,val,alpha){
  return prev*(1-alpha)+val*alpha
}

function smoothAngle(prev,val,alpha){

  let d = val-prev

  if(d>Math.PI) d -= Math.PI*2
  if(d<-Math.PI) d += Math.PI*2

  return prev + d*alpha
}

/* ==========================================================
   INIT
   ========================================================== */

export async function initFaceFilter(video,canvas){

  videoEl = video
  canvasEl = canvas
  ctx = canvas.getContext("2d")

  faceMesh = new FaceMesh({
    locateFile:(file)=>{
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    }
  })

  faceMesh.setOptions({
    maxNumFaces:MAX_FACES,
    refineLandmarks:true,
    minDetectionConfidence:0.5,
    minTrackingConfidence:0.5
  })

  faceMesh.onResults(onResults)

}

/* ==========================================================
   PROCESS FRAME
   ========================================================== */

export async function processFrame(){

  if(!videoEl) return

  await faceMesh.send({image:videoEl})

}

/* ==========================================================
   MATCH FACE
   ========================================================== */

function matchFace(cx,cy){

  let best = null
  let bestDist = 999999

  for(let f of faces){

    let dx = f.noseX - cx
    let dy = f.noseY - cy

    let dist = dx*dx + dy*dy

    if(dist < bestDist){
      bestDist = dist
      best = f
    }
  }

  if(best && bestDist < 20000){
    return best
  }

  if(faces.length < MAX_FACES){

    let newFace = new FaceState(Math.random())
    faces.push(newFace)
    return newFace

  }

  return null
}

/* ==========================================================
   RESULTS
   ========================================================== */

function onResults(results){

  ctx.clearRect(0,0,canvasEl.width,canvasEl.height)

  if(!results.multiFaceLandmarks) return

  for(let lm of results.multiFaceLandmarks){

    processLandmarks(lm)

  }

  draw()

}

/* ==========================================================
   PROCESS LANDMARKS
   ========================================================== */

function processLandmarks(lm){

  const nose = lm[1]
  const leftEye = lm[33]
  const rightEye = lm[263]
  const mouth = lm[13]

  const nx = nose.x * canvasEl.width
  const ny = nose.y * canvasEl.height

  const lex = leftEye.x * canvasEl.width
  const ley = leftEye.y * canvasEl.height

  const rex = rightEye.x * canvasEl.width
  const rey = rightEye.y * canvasEl.height

  const mx = mouth.x * canvasEl.width
  const my = mouth.y * canvasEl.height

  let face = matchFace(nx,ny)
  if(!face) return

  face.lastSeen = performance.now()

  face.noseX = smooth(face.noseX,nx,POSITION_SMOOTH)
  face.noseY = smooth(face.noseY,ny,POSITION_SMOOTH)

  face.leftEyeX = smooth(face.leftEyeX,lex,POSITION_SMOOTH)
  face.leftEyeY = smooth(face.leftEyeY,ley,POSITION_SMOOTH)

  face.rightEyeX = smooth(face.rightEyeX,rex,POSITION_SMOOTH)
  face.rightEyeY = smooth(face.rightEyeY,rey,POSITION_SMOOTH)

  face.mouthX = smooth(face.mouthX,mx,POSITION_SMOOTH)
  face.mouthY = smooth(face.mouthY,my,POSITION_SMOOTH)

  const dx = rex - lex
  const dy = rey - ley

  const angle = Math.atan2(dy,dx)
  const eyeDist = Math.hypot(dx,dy)

  const scale = eyeDist / 120

  face.angle = smoothAngle(face.angle,angle,ROTATION_SMOOTH)
  face.scale = smooth(face.scale,scale,SCALE_SMOOTH)

}

/* ==========================================================
   DRAW LOOP
   ========================================================== */

function draw(){

  const now = performance.now()

  faces = faces.filter(f=> now - f.lastSeen < 800)

  for(let f of faces){

    drawFaceFilter(f)

  }

}

/* ==========================================================
   FILTER DRAW
   ========================================================== */

function drawFaceFilter(face){

  ctx.save()

  ctx.translate(face.noseX,face.noseY)
  ctx.rotate(face.angle)
  ctx.scale(face.scale,face.scale)

  drawGlasses()
  drawNose()
  drawMouth()

  ctx.restore()

}

/* ==========================================================
   FILTERS
   ========================================================== */

function drawGlasses(){

  ctx.strokeStyle = "black"
  ctx.lineWidth = 6

  ctx.beginPath()
  ctx.arc(-60,-10,40,0,Math.PI*2)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(60,-10,40,0,Math.PI*2)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(-20,-10)
  ctx.lineTo(20,-10)
  ctx.stroke()

}

function drawNose(){

  ctx.fillStyle = "red"

  ctx.beginPath()
  ctx.arc(0,10,15,0,Math.PI*2)
  ctx.fill()

}

function drawMouth(){

  ctx.strokeStyle="black"
  ctx.lineWidth=4

  ctx.beginPath()
  ctx.arc(0,50,30,0,Math.PI)
  ctx.stroke()

}

/* ==========================================================
   DEBUG DRAW
   ========================================================== */

export function drawDebug(){

  ctx.fillStyle="lime"

  for(let f of faces){

    ctx.fillRect(f.noseX-3,f.noseY-3,6,6)
    ctx.fillRect(f.leftEyeX-3,f.leftEyeY-3,6,6)
    ctx.fillRect(f.rightEyeX-3,f.rightEyeY-3,6,6)

  }

}