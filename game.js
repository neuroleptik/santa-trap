const DEBUG = false;
const START_MUSIC_AT = 0;
const COLLISION = true;
const HITBOX_REDUCTION_PX = 5;

const gameArea = document.getElementById("game");
const player = document.getElementById("player");
const playerBoundingBox = document.getElementById("player-bounding-box");
const obstacles = document.getElementsByClassName("obstacle");
const scoreDisplay = document.getElementById("score");
const playBtn = document.getElementById("play-btn");
const music = document.getElementById("music");
const titleDiv = document.getElementById("title-div");

let isJumping = false;
let isSliding = false;
let isDead = false;
let score = 0;
let animationDuration = 0;
let isPlaying = false;

const preloadedImages = {};
const gameOverModal = document.querySelector(".game-over-modal");
const gameOverModalelementBottomPosition = "35px";
const arrowLeftArea = document.getElementById("controll-area-left");
const arrowRightArea = document.getElementById("controll-area-right");

let collisionIntervalId;
let animationIntervalId;
let objectGenerationIntervalId;
let obstacleGenerationIntervalId;
let fadeAudioIntervalId;

let nbObstacleCreated = 0;
let musicIntervalIds = [];

const spriteBasePath = "sprites/santa/";
const spriteObstacleBasePath = "sprites/objects/";

const obstacleArray = ["Stone", "Crate", "Crystal", "Sign_2", "IceBox"];
const upperObstacleObjects = ["Crate", "Stone", "IceBox"];
const backgroundObjectArray = ["Tree_1", "Tree_2", "SnowMan", "Igloo"];

let e = new Event("touchstart");

function preloadImages(imagePaths) {
  imagePaths.forEach((path) => {
    const img = new Image();
    img.src = path;
    preloadedImages[path] = img;
  });
}

arrowLeftArea.style.display = "none";
arrowRightArea.style.display = "none";

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

arrowLeftArea.addEventListener("touchstart", (e) => {
  e.preventDefault();
  slide();
});
arrowRightArea.addEventListener("touchstart", (e) => {
  e.preventDefault();
  jump();
});

/**
 * Launch the game.
 *
 * @returns {void}
 */
function play() {
  animationDuration = calculateAnimationDuration();

  arrowLeftArea.style.display = "block";
  arrowRightArea.style.display = "block";

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

  setTimeout(() => {
    music.volume = 1;
    music.play();
  }, calculateTimeToPlayer(animationDuration * 1000) + 50);

  Array.from(obstacles).forEach((obstacle) => {
    obstacle.remove();
  });

  Array.from(document.getElementsByClassName("background-object")).forEach(
    (obstacle) => {
      obstacle.remove();
    }
  );
  playBtn.style.display = "none";

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

  document.addEventListener("keydown", (e) => {
    if (e.code === "ArrowDown" && !isSliding) {
      slide();
    }
  });

  collisionIntervalId = setInterval(() => {
    score++;
    scoreDisplay.textContent = "Score : " + score;

    if (!COLLISION) return;
    if (isDead) return;
    if (obstacles.length === 0) return;

    Array.from(obstacles).forEach((obstacle, index) => {
      const obstacleRect = obstacle.getBoundingClientRect();
      const playerBoundingBoxRect = playerBoundingBox.getBoundingClientRect();

      if (
        playerBoundingBoxRect.right - HITBOX_REDUCTION_PX > obstacleRect.left &&
        playerBoundingBoxRect.left + HITBOX_REDUCTION_PX < obstacleRect.right
      ) {
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
      if (obstacleRect.right < playerBoundingBoxRect.left) {
        if (obstacleRect.right < 0) {
          Array.from(obstacles).slice(index, 1);
          obstacle.remove();
        }
      }
    });
  }, 60);
  obstacleGenerationIntervalId = scheduleActions();
}

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

  AnimationIndex++;
}, 70);

/**
 * Jumps the player up.
 *
 * This function will first check if the player is already jumping. If so, it will return.
 * Then, it will set the jumping flag to true and the sliding flag to false, reset the animation index to 1, and set the animation to none.
 * It will then set the bottom position of the player to the bottom of the game over modal element.
 * Finally, it will request an animation frame to set the jump animation, and set a timeout of 300ms to reset the jumping flag and animation.
 */
function jump() {
  if (isJumping) return;

  isJumping = true;
  isSliding = false;
  AnimationIndex = 1;

  player.style.animation = "";
  player.style.bottom = gameOverModalelementBottomPosition;

  requestAnimationFrame(() => {
    player.style.animation = "jump 0.3s ease";
  });

  setTimeout(() => {
    isJumping = false;
    player.style.animation = "";
  }, 300);
}

/**
 * Initiates a sliding action for the player.
 *
 * This function sets the player's animation to slide and adjusts the player's bounding box
 * to simulate a sliding motion. The sliding state is activated and the jumping state is deactivated.
 * After a short delay, the sliding state is reset, and the bounding box is restored to its original dimensions.
 */

function slide() {
  AnimationIndex = 1;
  isJumping = false;
  isSliding = true;

  player.style.animation = "";
  player.style.bottom = gameOverModalelementBottomPosition;

  playerBoundingBox.style.top = "25%";
  playerBoundingBox.style.height = "60%";

  requestAnimationFrame(() => {
    player.style.animation = "slide 0.3s ease";
  });

  setTimeout(() => {
    isSliding = false;
    player.style.animation = "";
    player.querySelector("#player-bounding-box").style.top = "2%";
    player.querySelector("#player-bounding-box").style.height = "85%";
  }, 300);
}

/**
 * Ends the game and displays the game over or win modal.
 *
 * This function stops all ongoing animations and intervals, displays the final score,
 * and shows the game over or win message based on whether the player has won.
 * It also handles fading out the music, resets the score, and re-enables the play button.
 *
 * @param {boolean} win - Indicates whether the player has won the game.
 */

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
      let volume = Math.max(0, music.volume - 0.1);
      music.volume = volume;
    } else {
      clearInterval(fadeAudioIntervalId);
      music.pause();
    }
  }, 100);

  clearInterval(collisionIntervalId);
  clearInterval(objectGenerationIntervalId);
  clearInterval(obstacleGenerationIntervalId);
  musicIntervalIds.forEach((id) => clearInterval(id));

  Array.from(document.getElementsByClassName("obstacle")).forEach(
    (obstacle) => {
      const computedStyle = getComputedStyle(obstacle);

      const currentRight = computedStyle.right;
      const currentBottom = computedStyle.bottom;

      obstacle.style.animation = "none";
      obstacle.style.right = currentRight;
      obstacle.style.bottom = currentBottom;
    }
  );

  Array.from(document.getElementsByClassName("background-object")).forEach(
    (bgObject) => {
      const computedStyle = getComputedStyle(bgObject);

      const currentRight = computedStyle.right;
      const currentBottom = computedStyle.bottom;

      bgObject.style.animation = "none";
      bgObject.style.right = currentRight;
      bgObject.style.bottom = currentBottom;
    }
  );

  playBtn.style.display = "block";
}

/**
 * Creates an obstacle based on the given type and time.
 *
 * This function creates a DOM element for the obstacle, sets its animation and
 * bottom position based on the given type, and appends it to the game area.
 *
 * If debug mode is enabled, it also adds a debug element displaying the time at which the obstacle was created.
 *
 * Finally, it increments the number of obstacles created and checks if it has reached the total number of obstacles in the music interval array.
 * If it has, it schedules a timeout to finish the game after a short delay.
 *
 * @param {string} type - The type of the obstacle to create. Can be "stay", "down", or "up".
 * @param {number} time - The time at which the obstacle was created.
 */
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

  gameArea.appendChild(obstacleDiv);

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

/**
 * Changes the current animation image to the one at the given index.
 *
 * If the image at the given index has been preloaded, it is used as the new player image.
 * If the image has not been preloaded, a console warning is printed.
 *
 * @param {string} base_name - The base name of the animation, without index or extension.
 * @param {number} index - The index of the animation image to change to.
 * @returns {void}
 */
function changeAnimation(base_name, index) {
  const currentImage = `${base_name} (${index}).png`;
  const imagePath = `${spriteBasePath}${currentImage}`;

  if (preloadedImages[imagePath]) {
    player.querySelector("#player-img").src = `${imagePath}`;
  } else {
    console.warn(`Image not preloaded: ${imagePath}`);
  }
}

/**
 * Schedules the creation of obstacles based on the data in the JSON file.
 *
 * This function will fetch the JSON file, parse it, and then create a sorted list of actions to perform.
 * Each action is either a "down", "up", or "stay" type, and each is scheduled to happen at the given time.
 * The actions are scheduled using setTimeout, and the time is calculated as the difference between the current time and the start time of the music.
 *
 * This function should be called once the music has started playing.
 *
 * @returns {void}
 */
function scheduleActions() {
  const actions = [];
  fetch("./trap.json")
    .then((response) => response.json())
    .then((data) => {
      data.down.forEach((time) => {
        if (time >= START_MUSIC_AT) {
          actions.push({
            time,
            type: "down",
          });
        }
      });

      data.up.forEach((time) => {
        if (time >= START_MUSIC_AT) {
          actions.push({
            time,
            type: "up",
          });
        }
      });

      data.stay.forEach((time) => {
        if (time >= START_MUSIC_AT) {
          actions.push({
            time,
            type: "stay",
          });
        }
      });

      actions.sort((a, b) => a.time - b.time);

      actions.forEach(({ time, type }) => {
        musicIntervalIds.push(
          setTimeout(
            () => createObstacle(type, time),
            (time - START_MUSIC_AT) * 1000
          )
        );
      });
    })
    .catch((error) => console.error("Error loading traps:", error));
}

/**
 * Calculates the time it takes for an obstacle to reach the player given the animation duration.
 * @param {number} animationDuration - The animation duration of the obstacle.
 * @returns {number} The time it takes for the obstacle to reach the player.
 */
function calculateTimeToPlayer(animationDuration) {
  const screenWidth = window.innerWidth;
  const playerPosition = player.getBoundingClientRect().right;

  const distanceToPlayer = screenWidth - playerPosition;

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

/**
 * Calculates the animation duration based on the screen width.
 * The animation duration is the time it takes for an obstacle to move from the right edge of the screen to the left edge.
 * The duration is calculated as the screen width divided by 900.
 * This value was chosen so that the animation is fast enough to be fun, but not so fast that it's impossible to react.
 * @returns {number} The animation duration in seconds.
 */
function calculateAnimationDuration() {
  const screenWidth = window.innerWidth;
  const distanceToTravel = screenWidth;
  return distanceToTravel / 900;
}

/**
 * Checks the size of the window and disables or enables the play button based on it.
 * If the window is in standalone mode (i.e. a PWA), and the width is less than the height,
 * the button is disabled and the text changed to "Turn your phone to play".
 * If the window is in a Safari browser, the button is disabled and the text changed to "Please add the app to home screen to play".
 * Otherwise, the button is enabled and the text changed to "Play".
 * @returns {void}
 */
function checkSize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const isStandalonePWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (isStandalonePWA) {
    if (width < height) {
      playBtn.innerText = "Turn your phone to play";
      playBtn.style.backgroundColor = "inherit";
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
      playBtn.innerText = "Turn your phone to play";
      playBtn.style.backgroundColor = "inherit";
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
    if (music && !music.paused) {
      music.pause();
    }
  } else if (document.visibilityState === "visible") {
    if (music && music.paused) {
      music.play();
    }
  }
});

document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("gesturechange", (e) => e.preventDefault());
document.addEventListener("gestureend", (e) => e.preventDefault());
