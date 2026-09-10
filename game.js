const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let lastTime = 0;
let xPos = 50;

function update(deltaTime) {
  xPos += 100 * deltaTime;
  if (xPos > canvas.width) xPos = 0;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'cyan';
  ctx.fillRect(xPos, 250, 50, 50);
}

function gameLoop(timeStamp) {
  let deltaTime = (timeStamp - lastTime) / 1000;
  lastTime = timeStamp;

  if (!isNaN(deltaTime)) {
    update(deltaTime);
    draw();
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);