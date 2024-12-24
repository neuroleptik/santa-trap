const DEBUG = false;
const START_MUSIC_AT = 0;
const COLLISION = true;

let gameArea = document.getElementById("game");
let player = document.getElementById("player");
let playerBoundingBox = document.getElementById("player-bounding-box");
let obstacles = document.getElementsByClassName("obstacle");
let scoreDisplay = document.getElementById("score");
let playBtn = document.getElementById("play-btn");
let music = document.getElementById("music");
let titleDiv = document.getElementById("title-div");
let isJumping = false;
let isSliding = false;
let isDead = false;
let score = 0;
let animationDuration = 0;
var isPlaying = false;
const preloadedImages = {};
const gameOverModal = document.querySelector(".game-over-modal");
let gameOverModalelementBottomPosition = "35px";
let arrowLeft = document.getElementById("arrow-left");
let arrowRight = document.getElementById("arrow-right");

let collisionIntervalId;
let animationIntervalId;
let objectGenerationIntervalId;
let obstacleGenerationIntervalId;
let fadeAudioIntervalId;

let nbObstacleCreated = 0;
let musicIntervalIds = [];

const spriteBasePath = "sprites/santa/";
const spriteObstacleBasePath = "sprites/objects/";

let obstacleArray = ["Stone", "Crate", "Crystal", "Sign_2", "IceBox"];
let upperObstacleObjects = ["Crate", "Stone", "IceBox"];
let backgroundObjectArray = ["Tree_1", "Tree_2", "SnowMan", "Igloo"];

var e = new Event("touchstart");

function preloadImages(imagePaths) {
  imagePaths.forEach((path) => {
    const img = new Image();
    img.src = path; // Charge l'image
    preloadedImages[path] = img; // Stocke l'image préchargée
  });
}

arrowLeft.style.display = "none";
arrowRight.style.display = "none";

// Charger les images depuis le fichier JSON
fetch("./sprites/santa/santa-images.json")
  .then((response) => response.json())
  .then((images) => {
    preloadImages(images.map((image) => `${spriteBasePath}${image}`));
  })
  .catch((error) => console.error("Error loading santa images:", error));

fetch("./sprites/objects/obstacle-images.json")
  .then((response) => response.json())
  .then((images) => {
    preloadImages(images.map((image) => `${spriteObstacleBasePath}${image}`));
  })
  .catch((error) => console.error("Error loading santa images:", error));

playBtn.addEventListener("click", play);
scoreDisplay.style.display = "none";

checkSize();

function play() {
  animationDuration = calculateAnimationDuration();

  arrowLeft.style.display = "block";
  arrowRight.style.display = "block";

  nbObstacleCreated = 0;
  musicIntervalIds = [];
  titleDiv.style.display = "none";
  scoreDisplay.style.display = "block";
  music.volume = 1;
  const playerSize = player.offsetHeight;
  clearInterval(fadeAudioIntervalId);

  document.documentElement.style.setProperty(
    "--player-size",
    `${playerSize}px`
  );
  gameOverModal.style.display = "none";
  music.pause();
  music.currentTime = START_MUSIC_AT;

  isDead = false;
  isPlaying = true;

  Array.from(obstacles).forEach((obstacle) => {
    obstacle.remove();
  });

  Array.from(document.getElementsByClassName("background-object")).forEach(
    (obstacle) => {
      obstacle.remove();
    }
  );
  playBtn.style.display = "none";

  setTimeout(() => {
    music.volume = 1;
    music.play();
  }, calculateTimeToPlayer(animationDuration * 1000) + 50);

  objectGenerationIntervalId = setInterval(() => {
    const backgroundObject = document.createElement("img");
    backgroundObject.classList.add("background-object");
    backgroundObject.src =
      "./sprites/objects/" +
      backgroundObjectArray[
        Math.floor(Math.random() * backgroundObjectArray.length)
      ] +
      ".png";
    gameArea.appendChild(backgroundObject);

    // Supprimer l'obstacle une fois hors écran
    backgroundObject.addEventListener("animationend", (event) => {
      if (event.target === backgroundObject) {
        backgroundObject.remove();
      }
    });
  }, 10000);
  document.addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp" && !isJumping) {
      jump();
    }
  });

  //slide function
  document.addEventListener("keydown", (e) => {
    if (e.code === "ArrowDown" && !isSliding) {
      slide();
    }
  });

  // // Collision detection
  // Intervalle pour vérifier les collisions
  collisionIntervalId = setInterval(() => {
    score++;
    scoreDisplay.textContent = "Score : " + score;

    if (!COLLISION) return;
    if (isDead) return;
    if (obstacles.length === 0) return;

    // Parcourt tous les obstacles pour vérifier les collisions
    Array.from(obstacles).forEach((obstacle, index) => {
      const obstacleRect = obstacle.getBoundingClientRect();
      const playerBoundingBoxRect = playerBoundingBox.getBoundingClientRect();

      // Vérifie si le joueur entre en collision avec cet obstacle
      if (
        playerBoundingBoxRect.right > obstacleRect.left &&
        playerBoundingBoxRect.left < obstacleRect.right
      ) {
        // Gère la logique en cas de collision
        if (obstacle.classList.contains("stay")) {
          if (playerBoundingBoxRect.top < obstacleRect.bottom) {
            finished();
          }
        } else if (obstacle.classList.contains("down")) {
          if (playerBoundingBoxRect.bottom > obstacleRect.top) {
            finished();
          }
        } else if (obstacle.classList.contains("up")) {
          if (playerBoundingBoxRect.top < obstacleRect.bottom) {
            if (!isSliding) {
              finished();
            }
          }
        }
      }

      // Met à jour le score si l'obstacle a été dépassé
      if (obstacleRect.right < playerBoundingBoxRect.left) {
        // Optionnel : supprime l'obstacle s'il est hors écran
        if (obstacleRect.right < 0) {
          Array.from(obstacles).slice(index, 1); // Retire l'obstacle de la liste
          obstacle.remove(); // Retire l'élément DOM
        }
      }
    });
  }, 60);
  //generation d'obstacle
  obstacleGenerationIntervalId = scheduleActions();
}

// // Change chararctere image to animate
animationIntervalId = setInterval(() => {
  if (!isPlaying) {
    if (AnimationIndex > 15) AnimationIndex = 1;
    changeAnimation("Idle", AnimationIndex);
  } else {
    if (isJumping) {
      if (AnimationIndex > 15) AnimationIndex = 1;
      changeAnimation("Jump", AnimationIndex);
    } else if (isSliding) {
      if (AnimationIndex > 8) AnimationIndex = 1;
      changeAnimation("Slide", AnimationIndex);
    } else if (isDead) {
      if (AnimationIndex > 16) return;
      changeAnimation("Dead", AnimationIndex);
    } else {
      if (AnimationIndex > 10) AnimationIndex = 1;
      changeAnimation("Run", AnimationIndex);
    }
  }

  AnimationIndex++; // Incrémentez l'index
}, 70);

function jump() {
  if (isJumping) return; // Empêche un double saut

  isJumping = true;
  isSliding = false; // Interrompre le slide si un saut est déclenché
  AnimationIndex = 1;

  // Réinitialiser la position de base pour éviter les conflits
  player.style.animation = "";
  player.style.bottom = gameOverModalelementBottomPosition;

  // Appliquer l'animation de saut
  requestAnimationFrame(() => {
    player.style.animation = "jump 0.3s ease";
  });

  // Réinitialiser l'état après la durée du saut
  setTimeout(() => {
    isJumping = false;
    player.style.animation = "";
  }, 300);
}

function slide() {
  AnimationIndex = 1;
  isJumping = false; // Stopper le saut immédiatement
  isSliding = true;

  // Réinitialiser la position du personnage avant d'appliquer l'animation de slide
  player.style.animation = ""; // Annuler toute animation en cours
  player.style.bottom = gameOverModalelementBottomPosition; // Remettre à la position de base

  playerBoundingBox.style.top = "25%";
  playerBoundingBox.style.height = "60%";

  // Appliquer l'animation de slide
  requestAnimationFrame(() => {
    player.style.animation = "slide 0.3s ease";
  });

  // Réinitialiser après la durée de l'animation
  setTimeout(() => {
    isSliding = false;
    player.style.animation = "";
    player.querySelector("#player-bounding-box").style.top = "2%";
    player.querySelector("#player-bounding-box").style.height = "85%";
  }, 300);
}

function finished(win = false) {
  scoreDisplay.style.display = "none";
  gameOverModal.style.display = "flex";
  gameOverModal.querySelector("#final-score").textContent = score;
  score = 0;
  if (win) {
    document.querySelector("#modal-title").innerText = "You Win !";
  } else {
    document.querySelector("#modal-title").innerText = "Game Over !";
    isDead = true;
  }

  isJumping = false;
  isSliding = false;

  fadeAudioIntervalId = setInterval(() => {
    if (music.volume > 0) {
      let volume = Math.max(0, music.volume - 0.1); // Decrease volume
      music.volume = volume; // Apply the new volume
    } else {
      clearInterval(fadeAudioIntervalId); // Stop fading when volume is 0
      music.pause(); // Optionally pause the audio
    }
  }, 100);

  // Arrête les intervalles
  clearInterval(collisionIntervalId);
  clearInterval(objectGenerationIntervalId);
  clearInterval(obstacleGenerationIntervalId);
  musicIntervalIds.forEach((id) => clearInterval(id));

  // Supprime les animations des obstacles
  Array.from(document.getElementsByClassName("obstacle")).forEach(
    (obstacle) => {
      const computedStyle = getComputedStyle(obstacle);

      // Extraire la position actuelle
      const currentRight = computedStyle.right;
      const currentBottom = computedStyle.bottom;

      // Appliquer la position actuelle et stopper l'animation
      obstacle.style.animation = "none";
      obstacle.style.right = currentRight;
      obstacle.style.bottom = currentBottom;
    }
  );

  // Arrêter les animations des objets d'arrière-plan
  Array.from(document.getElementsByClassName("background-object")).forEach(
    (bgObject) => {
      const computedStyle = getComputedStyle(bgObject);

      // Extraire la position actuelle
      const currentRight = computedStyle.right;
      const currentBottom = computedStyle.bottom;

      // Appliquer la position actuelle et stopper l'animation
      bgObject.style.animation = "none";
      bgObject.style.right = currentRight;
      bgObject.style.bottom = currentBottom;
    }
  );

  // Réafficher le bouton play
  playBtn.style.display = "block";
}

function createObstacle(type, time) {
  const obstacle = document.createElement("img");
  const obstacleDiv = document.createElement("div");
  obstacleDiv.classList.add("obstacle");
  obstacleDiv.classList.add(type);
  obstacleDiv.style.animation =
    "moveObstacle " + animationDuration + "s linear forwards";

  if (type == "stay") {
    obstacleDiv.style.bottom = "calc(var(--player-size) * 2)";
    obstacle.src = "./sprites/objects/Ground_center.png";
  } else if (type == "down") {
    obstacle.src = `./sprites/objects/${
      obstacleArray[Math.floor(Math.random() * obstacleArray.length)]
    }.png`;
    obstacleDiv.style.bottom = gameOverModalelementBottomPosition;
  } else {
    obstacleDiv.style.bottom = "calc(var(--player-size))";
    obstacle.src = "./sprites/objects/Ground_center.png";
  }

  if (DEBUG) {
    let debugDiv = document.createElement("div");
    debugDiv.innerText = time;
    debugDiv.style.top = "-30px";
    debugDiv.style.fontSize = "30px";
    obstacleDiv.appendChild(debugDiv);
  }
  obstacleDiv.appendChild(obstacle);

  // Ajouter l'obstacle dans la zone de jeu
  gameArea.appendChild(obstacleDiv);

  // Supprimer l'obstacle une fois hors écran
  obstacleDiv.addEventListener("animationend", (event) => {
    if (event.target === obstacleDiv) {
      obstacleDiv.remove();
    }
  });

  nbObstacleCreated++;

  if (nbObstacleCreated == musicIntervalIds.length) {
    setTimeout(() => {
      if (isDead) return;
      finished((win = true));
    }, calculateTimeToPlayer(animationDuration * 1000) + 500);
  }
}

let AnimationIndex = 1;

function changeAnimation(base_name, index) {
  const currentImage = `${base_name} (${index}).png`;
  const imagePath = `${spriteBasePath}${currentImage}`;

  if (preloadedImages[imagePath]) {
    // Appliquez l'image préchargée comme arrière-plan
    player.querySelector("#player-img").src = `${imagePath}`;
  } else {
    console.warn(`Image not preloaded: ${imagePath}`);
  }
}

// Fonction pour exécuter une action au bon moment
function scheduleActions() {
  const actions = [];
  fetch("./trap.json")
    .then((response) => response.json())
    .then((data) => {
      // Ajoute les actions "down"
      data.down.forEach((time) => {
        if (time >= START_MUSIC_AT) {
          actions.push({
            time,
            type: "down",
          });
        }
      });

      // Ajoute les actions "up"
      data.up.forEach((time) => {
        if (time >= START_MUSIC_AT) {
          actions.push({
            time,
            type: "up",
          });
        }
      });

      // Ajoute les actions "stay"
      data.stay.forEach((time) => {
        if (time >= START_MUSIC_AT) {
          actions.push({
            time,
            type: "stay",
          });
        }
      });

      // Trie les actions par temps croissant
      actions.sort((a, b) => a.time - b.time);
      // Programme les actions
      actions.forEach(({ time, type }) => {
        musicIntervalIds.push(
          setTimeout(
            () => createObstacle(type, time),
            (time - START_MUSIC_AT) * 1000
          )
        ); // Convertit les secondes en millisecondes
      });
    })
    .catch((error) => console.error("Error loading traps:", error));
}

function calculateTimeToPlayer(animationDuration) {
  const screenWidth = window.innerWidth;
  const playerPosition = player.getBoundingClientRect().right;

  // Distance entre la droite de l'écran et le joueur
  const distanceToPlayer = screenWidth - playerPosition;

  // Temps nécessaire pour atteindre le joueur
  return animationDuration * (distanceToPlayer / screenWidth);
}

window.addEventListener("resize", () => {
  const playerSize = player.style.height;
  document.documentElement.style.setProperty(
    "--player-size",
    `${playerSize}px`
  );
  checkSize();
  animationDuration = calculateAnimationDuration();
});

document.addEventListener(
  "touchmove",
  function (event) {
    event.preventDefault();
  },
  { passive: false }
);

function calculateAnimationDuration() {
  const screenWidth = window.innerWidth; // Largeur de l'écran
  const distanceToTravel = screenWidth; // Les obstacles traversent tout l'écran
  return distanceToTravel / 900; // Durée en secondes
}

function checkSize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const isStandalonePWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (isStandalonePWA) {
    if (width < height) {
      // Activate the button if width is less than height
      playBtn.innerText = "Turn your phone to play";
      playBtn.style.backgroundColor = "inherit";
      //playBtn.style.background = "inherit";
      playBtn.disabled = true;
    } else {
      playBtn.innerText = "Play";
      playBtn.style.backgroundColor = "#9e0202";
      playBtn.disabled = false;
    }
  } else if (isSafari) {
    playBtn.innerText = "Please add the app to home screen to play";
    playBtn.disabled = true;
    playBtn.style.backgroundColor = "inherit";
  } else {
    if (width < height) {
      // Activate the button if width is less than height
      playBtn.innerText = "Turn your phone to play";
      playBtn.style.backgroundColor = "inherit";
      //playBtn.style.background = "inherit";
      playBtn.disabled = true;
    } else {
      playBtn.innerText = "Play";
      playBtn.style.backgroundColor = "#9e0202";
      playBtn.disabled = false;
    }
  }
}

document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") {
    // Mettre en pause la musique si l'onglet n'est pas visible
    if (music && !music.paused) {
      music.pause();
    }
  } else if (document.visibilityState === "visible") {
    // Reprendre la musique si nécessaire lorsque l'onglet redevient visible
    if (music && music.paused) {
      music.play();
    }
  }
});

document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("gesturechange", (e) => e.preventDefault());
document.addEventListener("gestureend", (e) => e.preventDefault());
