const DEBUG = true;

let gameArea = document.getElementById("game");
let player = document.getElementById("player");
let obstacles = document.getElementsByClassName("obstacle");
let scoreDisplay = document.getElementById("score");
let playBtn = document.getElementById("play-btn");
let music = document.getElementById("music");
let isJumping = false;
let isSliding = false;
let isDead = false;
let score = 0;
var isPlaying = false;
const preloadedImages = {};
const gameOverModal = document.querySelector(".game-over-modal");
let gameOverModalelementBottomPosition = "40px";

let collisionIntervalId;
let animationIntervalId;
let objectGenerationIntervalId;
let obstacleGenerationIntervalId;
let musicIntervalIds = [];

const spriteBasePath = "sprites/santa/";

let obstacleArray = ["Stone", "Crate", "Crystal", "Sign_2", "IceBox"];
let upperObstacleObjects = ["Crate", "Stone", "IceBox"];
let backgroundObjectArray = ["Tree_1", "Tree_2", "SnowMan", "Igloo"];

var e = new Event("touchstart");
// target.dispatchEvent(e);

function preloadImages(imagePaths) {
  imagePaths.forEach((path) => {
    const img = new Image();
    img.src = path; // Charge l'image
    preloadedImages[path] = img; // Stocke l'image préchargée
  });
}

// Charger les images depuis le fichier JSON
fetch("./sprites/santa/santa-images.json")
  .then((response) => response.json())
  .then((images) => {
    preloadImages(images.map((image) => `${spriteBasePath}${image}`));
  })
  .catch((error) => console.error("Error loading santa images:", error));

playBtn.addEventListener("click", play);

function play() {
  gameOverModal.style.display = "none";
  music.pause(); // Pause the music
  music.currentTime = 0;

  isDead = false;
  isPlaying = true;
  // remove all obstacles
  Array.from(obstacles).forEach((obstacle) => {
    obstacle.remove();
  });
  playBtn.style.display = "none";

  setTimeout(() => {
    music.play();
  }, calculateTimeToPlayer(2000));

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
  document.addEventListener("touchstart", (e) => {
    jump();
  });

  //slide function
  document.addEventListener("keydown", (e) => {
    if (e.code === "ArrowDown" && !isSliding) {
      slide();
    }
  });
  // document.addEventListener("touchstart", (e) => {
  //   if (e.code === "ArrowDown" && !isSliding) {
  //     slide();
  //   }
  // });

  // // Collision detection
  // Intervalle pour vérifier les collisions
  collisionIntervalId = setInterval(() => {
    if (isDead) return;
    if (obstacles.length === 0) return;

    // Récupère les dimensions du personnage (statique)
    const playerRect = player.getBoundingClientRect();

    // Parcourt tous les obstacles pour vérifier les collisions
    Array.from(obstacles).forEach((obstacle, index) => {
      const obstacleRect = obstacle.getBoundingClientRect();

      // Vérifie si le joueur entre en collision avec cet obstacle
      if (
        playerRect.right - 100 > obstacleRect.left &&
        playerRect.left + 110 < obstacleRect.right
      ) {
        // Gère la logique en cas de collision
        if (obstacle.classList.contains("stay")) {
          if (playerRect.top + 50 < obstacleRect.bottom) {
            finished();
          }
        } else if (obstacle.classList.contains("down")) {
          if (playerRect.bottom - 20 > obstacleRect.top) {
            finished();
          }
        }
      }

      // Met à jour le score si l'obstacle a été dépassé
      if (obstacleRect.right < playerRect.left) {
        // Optionnel : supprime l'obstacle s'il est hors écran
        if (obstacleRect.right < 0) {
          obstacles.splice(index, 1); // Retire l'obstacle de la liste
          obstacle.remove(); // Retire l'élément DOM
        }
      }
    });
    score++;
    scoreDisplay.textContent = "Score : " + score;
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

// function slide() {
//   AnimationIndex = 1;
//   isJumping = false;
//   isSliding = true;
//   player.style.animation = "slide 0.3s ease";
//   setTimeout(() => {
//     isSliding = false;
//     player.style.animation = "";
//   }, 300);
// }

function slide() {
  AnimationIndex = 1;
  isJumping = false; // Stopper le saut immédiatement
  isSliding = true;

  // Réinitialiser la position du personnage avant d'appliquer l'animation de slide
  player.style.animation = ""; // Annuler toute animation en cours
  player.style.bottom = gameOverModalelementBottomPosition; // Remettre à la position de base

  // Appliquer l'animation de slide
  requestAnimationFrame(() => {
    player.style.animation = "slide 0.3s ease";
  });

  // Réinitialiser après la durée de l'animation
  setTimeout(() => {
    isSliding = false;
    player.style.animation = "";
  }, 300);
}

function finished() {
  gameOverModal.style.display = "flex";
  gameOverModal.querySelector("#final-score").textContent = score;
  score = 0;
  isDead = true;
  isJumping = false;
  isSliding = false;

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

  if (type == "stay") {
    obstacleDiv.style.bottom = "250px";
    obstacle.src = "./sprites/objects/Ground_center.png";
  } else if (type == "down") {
    obstacle.src = `./sprites/objects/${
      obstacleArray[Math.floor(Math.random() * obstacleArray.length)]
    }.png`;
    obstacleDiv.style.bottom = gameOverModalelementBottomPosition;
  } else {
    obstacleDiv.style.bottom = "130px";
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
}

let AnimationIndex = 1;

function changeAnimation(base_name, index) {
  const currentImage = `${base_name} (${index}).png`;
  const imagePath = `${spriteBasePath}${currentImage}`;

  if (preloadedImages[imagePath]) {
    // Appliquez l'image préchargée comme arrière-plan
    player.src = `${imagePath}`;
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
        actions.push({
          time,
          type: "down",
        });
      });

      // Ajoute les actions "up"
      data.up.forEach((time) => {
        actions.push({
          time,
          type: "up",
        });
      });

      // Ajoute les actions "stay"
      data.stay.forEach((time) => {
        actions.push({
          time,
          type: "stay",
        });
      });

      // Trie les actions par temps croissant
      actions.sort((a, b) => a.time - b.time);

      // Programme les actions
      actions.forEach(({ time, type }) => {
        musicIntervalIds.push(
          setTimeout(() => createObstacle(type, time), time * 1000)
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
