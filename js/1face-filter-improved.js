import { FaceMesh } from "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";

let faceMesh;
let SMOOTH = 0.35;

let prevState = {
  noseX:0,
  noseY:0,
  eyeLx:0,
  eyeLy:0,
  eyeRx:0,
  eyeRy:0,
  angle:0,
  scale:1
};

function smooth(prev,val){
  return prev*(1-SMOOTH)+val*SMOOTH;
}

export async function initFaceFilter(){

  faceMesh = new FaceMesh({
    locateFile:(file)=>{
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }
  });

  faceMesh.setOptions({
    maxNumFaces:1,
    refineLandmarks:true,
    minDetectionConfidence:0.5,
    minTrackingConfidence:0.5
  });

  faceMesh.onResults(onResults);

}

export async function processFrame(video){
  await faceMesh.send({image:video});
}

function onResults(results){

  if(!results.multiFaceLandmarks) return;

  const canvas = document.getElementById("faceCanvas");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0,0,canvas.width,canvas.height);

  const lm = results.multiFaceLandmarks[0];

  const nose = lm[1];
  const leftEye = lm[33];
  const rightEye = lm[263];
  const mouth = lm[13];

  const nx = nose.x * canvas.width;
  const ny = nose.y * canvas.height;

  const lex = leftEye.x * canvas.width;
  const ley = leftEye.y * canvas.height;

  const rex = rightEye.x * canvas.width;
  const rey = rightEye.y * canvas.height;

  const mx = mouth.x * canvas.width;
  const my = mouth.y * canvas.height;

  const dx = rex - lex;
  const dy = rey - ley;

  const angle = Math.atan2(dy,dx);
  const eyeDist = Math.hypot(dx,dy);

  const scale = eyeDist / 120;

  prevState.noseX = smooth(prevState.noseX,nx);
  prevState.noseY = smooth(prevState.noseY,ny);
  prevState.eyeLx = smooth(prevState.eyeLx,lex);
  prevState.eyeLy = smooth(prevState.eyeLy,ley);
  prevState.eyeRx = smooth(prevState.eyeRx,rex);
  prevState.eyeRy = smooth(prevState.eyeRy,rey);
  prevState.angle = smooth(prevState.angle,angle);
  prevState.scale = smooth(prevState.scale,scale);

  drawFilter(ctx,prevState);
}

function drawFilter(ctx,state){

  ctx.save();

  ctx.translate(state.noseX,state.noseY);
  ctx.rotate(state.angle);
  ctx.scale(state.scale,state.scale);

  ctx.fillStyle="red";

  ctx.beginPath();
  ctx.arc(0,0,30,0,Math.PI*2);
  ctx.fill();

  ctx.restore();
}