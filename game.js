// =============== SETUP ===============
document.body.style.margin = "0";
document.body.style.background = "#fafafa";
document.body.style.fontFamily = "Inter, system-ui, Arial";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

const cx = () => canvas.width / 2;
const cy = () => canvas.height / 2;

// =============== ASSETS ===============
const sounds = {
  click: new Audio("click.mp3"),
  evolve: new Audio("upgrade.mp3"),
  jumpscare: new Audio("jumpscare.mp3"),
  osu: new Audio("osu_hit.mp3")
};
Object.values(sounds).forEach(s => s.volume = 0.45);

let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  Object.values(sounds).forEach(s => {
    s.play().then(() => {
      s.pause();
      s.currentTime = 0;
    }).catch(()=>{});
  });
  audioUnlocked = true;
}
const play = s => {
  if (!audioUnlocked) return;
  try { s.currentTime = 0; s.play(); } catch {}
};

// Images
const kolbasaImgs = ["unnamed.jpg","unnamed1.jpg","unnamed2.jpg","unnamed3.jpg","unnamed4.jpg"]
  .map(src => { const i = new Image(); i.src = src; return i; });

const bossImgs = ["boss1.png","boss2.png"]
  .map(src => { const i = new Image(); i.src = src; return i; });

// =============== STATE ===============
let clicks = 0;
let clickPower = 1;
let upgradeCost = 100;

let kolbasaStage = 0;
const kolbasaMilestones = [1000, 2000, 5000, 10000];
let evolutionTimer = 0;

let nextBossAt = 2000;
let bossActive = false;
let bossHP = 0;
let bossMaxHP = 0;
let bossImg = null;
let bossRadius = 150;

let osu = null;
let shake = 0;

// Hover + FX
let hoverKolbasa = false;
let kolbasaScale = 1;
let hoverUpgrade = false;
let hoverSave = false;
let hoverReset = false;

// =============== SAVE SYSTEM ===============
const SAVE_KEY = "kolbasa_canvas_save";

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    clicks,
    clickPower,
    upgradeCost,
    kolbasaStage,
    nextBossAt
  }));
}

function loadGame() {
  const d = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (!d) return;
  clicks = d.clicks ?? clicks;
  clickPower = d.clickPower ?? clickPower;
  upgradeCost = d.upgradeCost ?? upgradeCost;
  kolbasaStage = d.kolbasaStage ?? kolbasaStage;
  nextBossAt = d.nextBossAt ?? nextBossAt;
}
loadGame();
setInterval(saveGame, 2000);

// =============== RESET ===============
function resetGame() {
  if (!confirm("Reset all progress?")) return;
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

// =============== HELPERS ===============
function screenShake() {
  if (shake > 0) {
    ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
    shake *= 0.9;
  }
}

// =============== BOSS ===============
function spawnBoss() {
  bossActive = true;
  bossMaxHP = 20;
  bossHP = bossMaxHP;
  bossImg = bossImgs[Math.floor(Math.random()*bossImgs.length)];
  play(sounds.jumpscare);
  shake = 20;
  spawnOsu();
}

function spawnOsu() {
  osu = {
    r: 22,
    x: cx() + (Math.random()-0.5)*bossRadius*1.2,
    y: cy() + (Math.random()-0.5)*bossRadius*1.2,
    pulse: 0
  };
}

function hitOsu(mx,my) {
  if (!osu) return;
  if (Math.hypot(mx-osu.x,my-osu.y) > osu.r) return;
  bossHP--;
  play(sounds.osu);
  shake = 14;
  spawnOsu();
  if (bossHP <= 0) {
    bossActive = false;
    nextBossAt += 2000;
  }
}

// =============== EVOLUTION ===============
function checkEvolution() {
  if (kolbasaStage >= kolbasaMilestones.length) return;
  if (clicks >= kolbasaMilestones[kolbasaStage]) {
    kolbasaStage++;
    evolutionTimer = 360;
    play(sounds.evolve);
    shake = 18;
  }
}

// =============== INPUT ===============
canvas.addEventListener("mousemove", e => {
  const r = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;

  hoverKolbasa =
    !bossActive &&
    evolutionTimer === 0 &&
    Math.hypot(mx - cx(), my - cy()) < 120;

  hoverUpgrade =
    !bossActive &&
    mx > cx()-110 && mx < cx()+110 &&
    my > cy()+160 && my < cy()+205;

  hoverSave = mx < 100 && my > canvas.height-50;
  hoverReset = mx > 120 && mx < 240 && my > canvas.height-50;

  canvas.style.cursor =
    hoverKolbasa || hoverUpgrade || hoverSave || hoverReset
      ? "pointer" : "default";
});

canvas.addEventListener("click", e => {
  unlockAudio();

  const r = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;

  if (hoverSave) return saveGame();
  if (hoverReset) return resetGame();

  if (bossActive) return hitOsu(mx,my);

  if (hoverUpgrade && clicks >= upgradeCost) {
    clicks -= upgradeCost;
    clickPower++;
    upgradeCost = Math.floor(upgradeCost * 1.8);
    play(sounds.evolve);
    shake = 10;
    return;
  }

  if (hoverKolbasa) {
    clicks += clickPower;
    play(sounds.click);
    shake = 6;
    checkEvolution();
    if (clicks >= nextBossAt && !bossActive && evolutionTimer === 0) {
      spawnBoss();
    }
  }
});

// =============== DRAW ===============
function draw() {
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  screenShake();

  ctx.textAlign = "center";
  ctx.fillStyle = "#111";
  ctx.font = "800 28px Inter";
  ctx.fillText("Clicks: " + clicks, cx(), 40);

  if (evolutionTimer > 0) {
    ctx.fillStyle = "rgba(255,215,0,"+(evolutionTimer/360)+")";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.font = "900 40px Inter";
    ctx.fillText("KOLBASA EVOLVING", cx(), cy());
    evolutionTimer--;
  }

  if (!bossActive && evolutionTimer === 0) {
    kolbasaScale += ((hoverKolbasa ? 1.08 : 1) - kolbasaScale) * 0.15;
    ctx.save();
    ctx.translate(cx(), cy());
    ctx.scale(kolbasaScale, kolbasaScale);
    if (hoverKolbasa) {
      ctx.shadowColor = "rgba(255,180,0,0.6)";
      ctx.shadowBlur = 30;
    }
    ctx.drawImage(kolbasaImgs[kolbasaStage], -120, -120, 240, 240);
    ctx.restore();

    ctx.fillStyle = hoverUpgrade ? "#eee" : "#fff";
    ctx.fillRect(cx()-110, cy()+160, 220, 45);
    ctx.fillStyle = "#111";
    ctx.font = "700 18px Inter";
    ctx.fillText("Upgrade Click +1 ("+upgradeCost+")", cx(), cy()+190);
  }

  if (bossActive) {
    ctx.drawImage(bossImg, cx()-bossRadius, cy()-bossRadius, bossRadius*2, bossRadius*2);
    ctx.font = "900 34px Inter";
    ctx.fillText("LUKRECIUS", cx(), cy()-bossRadius-20);

    ctx.fillStyle = "#ddd";
    ctx.fillRect(cx()-200, cy()+bossRadius+20, 400, 14);
    ctx.fillStyle = "#c62828";
    ctx.fillRect(cx()-200, cy()+bossRadius+20, 400*(bossHP/bossMaxHP), 14);

    osu.pulse += 0.15;
    ctx.beginPath();
    ctx.arc(osu.x, osu.y, osu.r + Math.sin(osu.pulse)*4, 0, Math.PI*2);
    ctx.fillStyle = "red";
    ctx.fill();
  }

  ctx.textAlign = "left";
  ctx.font = "700 16px Inter";
  ctx.fillStyle = hoverSave ? "#000" : "#555";
  ctx.fillText("SAVE", 20, canvas.height-20);
  ctx.fillStyle = hoverReset ? "#000" : "#555";
  ctx.fillText("RESET", 140, canvas.height-20);

  requestAnimationFrame(draw);
}
draw();
