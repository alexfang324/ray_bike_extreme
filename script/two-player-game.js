'use strict';
import Game from './game.js';
import Player from './player.js';
import Bike from './bike.js';
import Obstacle from './obstacle.js';
import { Direction, ObstacleType } from './enum.js';
import Projectile from './projectile.js';

export default class TwoPlayerGame extends Game {
  RAY_LIFETIME = 8000; //lifetime in miliseconds
  NUM_PROJ = 5; //# of laser a bike can emit
  PROJ_SPEED = 20; //speed of projectile
  MIN_OBS_HEIGHT = 20; //minimum obstacle height in px;
  MAX_OBS_HEIGHT = 100; //max obstacle height in px;
  MED_LEVEL_OBS_NUM = 4;
  HARD_LEVEL_OBS_NUM = 8;
  BIKE1_ID = 'bike1';
  INITIAL_BIKE1_DIR = Direction.right;
  INITIAL_BIKE1_IMG_POS = [150, 185]; //left and top position of bike
  BIKE2_ID = 'bike2';
  INITIAL_BIKE2_DIR = Direction.left;
  INITIAL_BIKE2_IMG_POS = [750, 185];
  OBS_IMG_PATH = '../img/rock.jpg'; //image path of stationary obstacle
  PROJ_IMG_PATH = '../img/laser.png'; //image path of projectile
  isRunning = false; //boolean to indicate the status of the game
  lastTimestamp; //record last timestamp used for requestAnimateFrame of the main game loop
  animFrameId; //requestAnimationFrame id for the main game loop
  winningPlayer; //tracks the winning player object

  difficulty; //game difficulty
  openingPageElement;
  gamePageElement;
  gameHeaderElement;
  projRowElement; //div element that contains projectile box with icon for each player
  gameOverPageElement;
  playerName1;
  playerName2;
  score;
  projectiles = [];

  constructor(difficulty, playerName1, playerName2) {
    super();
    this.difficulty = difficulty;
    this.playerName1 = playerName1;
    this.playerName2 = playerName2;
    this.openingPageElement = document.getElementById('opening-page');
    this.gamePageElement = document.getElementById('game-page');
    this.gameOverPageElement = document.getElementById('game-over-page');

    const player1 = new Player(this.playerName1);
    this.players.push(player1);

    const player2 = new Player(this.playerName2);
    this.players.push(player2);

    //wire up game-over page buttons
    document
      .getElementById('main-menu-btn')
      .addEventListener('click', this.mainMenuBtnClicked);

    document
      .getElementById('play-again-btn')
      .addEventListener('click', this.playAgainBtnClicked);

    this.startFreshGame();
  }

  startFreshGame() {
    //reset parameters and elements
    this.gamePageElement.innerHTML = '';
    this.score = 0;
    this.obstacles = [];
    this.projectiles = [];
    this.lastTimestamp = undefined;
    this.winningPlayer = undefined;
    //delete the bike if it already exist (for play-again feature)
    const bike1Element = document.getElementById(this.BIKE1_ID);
    if (bike1Element) {
      bike1Element.remove();
    }
    const bike2Element = document.getElementById(this.BIKE2_ID);
    if (bike2Element) {
      bike2Element.remove();
    }

    this.setupGameHeader(this.playerName1, this.playerName2);
    this.setupArena();

    const bike1 = new Bike(
      this.INITIAL_BIKE1_IMG_POS,
      this.INITIAL_BIKE1_DIR,
      this.BIKESPEED,
      this.BIKE1_ID,
      ['a', 'd', 'w'],
      '../img/red-bike.jpg',
      'rgb(188, 19, 254)',
      this.RAY_LIFETIME,
      this.NUM_PROJ,
      this.emitProjectile
    );
    this.players[0].bike = bike1;

    const bike2 = new Bike(
      this.INITIAL_BIKE2_IMG_POS,
      this.INITIAL_BIKE2_DIR,
      this.BIKESPEED,
      this.BIKE2_ID,
      ['ArrowLeft', 'ArrowRight', 'ArrowUp'],
      '../img/green-bike.jpg',
      'rgb(57, 255, 20)',
      this.RAY_LIFETIME,
      this.NUM_PROJ,
      this.emitProjectile
    );
    this.players[1].bike = bike2;

    this.setupCanvases();
    if (this.difficulty === 'medium') {
      this.addObstacles(this.MED_LEVEL_OBS_NUM);
    } else if (this.difficulty === 'hard') {
      this.addObstacles(this.HARD_LEVEL_OBS_NUM);
    }
    this.gameStartCountDown();
  }

  setupGameHeader(playerName1, playerName2) {
    const gameHeaderElement = document.createElement('div');
    gameHeaderElement.id = 'game-header';
    this.gameHeaderElement = gameHeaderElement;
    this.gamePageElement.appendChild(gameHeaderElement);
    this.setupScoreBoard(playerName1, playerName2);
    this.setupProjectileBox();
  }

  setupScoreBoard(playerName1, playerName2) {
    const scoreBoardElement = document.createElement('div');
    scoreBoardElement.classList.add('score-board');
    scoreBoardElement.innerHTML = `<div class="score-box"><p class="label">Player 1</p>
    <p class="player-name">${playerName1}</p></div>
    <p id="player-score">0</p><div class="score-box"><p class="label">Player 2</p>
    <p class="player-name">${playerName2}</p></div>`;
    this.gameHeaderElement.append(scoreBoardElement);
  }

  setupProjectileBox() {
    const projRowElement = document.createElement('div');
    projRowElement.id = 'proj-row';

    //dynamically generate projectile box id based on bike Id
    const projId1 = this.BIKE1_ID + '-proj-box';
    const projId2 = this.BIKE2_ID + '-proj-box';
    //set up row element to hold two projectile box elements
    projRowElement.innerHTML = `<div id=${projId1} class="proj-box"></div>
    <div id=${projId2} class="proj-box"></div>`;
    this.projRowElement = projRowElement;
    //for each projectile box, add NUM_PROJ number of projectile img as icon
    [...projRowElement.children].forEach((pbox) => {
      for (let i = 0; i < this.NUM_PROJ; i++) {
        const projIconElement = document.createElement('div');
        projIconElement.classList.add('proj-icon');
        projIconElement.innerHTML = `<img src=${this.PROJ_IMG_PATH} class="proj-icon-img"/>`;
        pbox.append(projIconElement);
      }
    });

    this.gameHeaderElement.append(projRowElement);
  }

  addObstacles(numObstacles) {
    //list of arena objects, e.g. bike, rock
    let arenaObjects = [...this.players.map((p) => p.bike.element)];

    //get variable obstacle height
    for (let i = 0; i < numObstacles; i++) {
      const obsHeight =
        this.MIN_OBS_HEIGHT +
        Math.random() * (this.MAX_OBS_HEIGHT - this.MIN_OBS_HEIGHT);

      //add obstacle onto arena with initial arena-relative position [0,0]
      const obsElement = document.createElement('img');
      obsElement.src = this.OBS_IMG_PATH;
      obsElement.classList.add('rock');
      obsElement.style.height = obsHeight + 'px';
      obsElement.style.top = '0px';
      obsElement.style.left = '0px';
      this.arena.appendChild(obsElement);

      obsElement.onload = () => {
        const obsWidth = parseFloat(
          obsElement.getBoundingClientRect().width.toFixed(4)
        );

        let attempts = 20;
        while (attempts) {
          let overlap = false;
          attempts -= 1;

          //arena relative position
          //randomly place an obstacle and make sure it's not on top of another obstacle
          const left = Math.random() * (this.ARENA_WIDTH - obsWidth);
          const top = Math.random() * (this.ARENA_HEIGHT - obsHeight);
          obsElement.style.top = top + 'px';
          obsElement.style.left = left + 'px';
          const obsRect = obsElement.getBoundingClientRect();

          for (const obj of arenaObjects) {
            const objRect = obj.getBoundingClientRect();
            overlap = this.checkImageOverlap(obsRect, objRect);
            if (overlap) {
              break;
            }
          }
          //add boundaries of the obstacle if no overlap is found and also update twoDObstacle array
          if (!overlap) {
            const width = obsRect.width;
            const height = obsRect.height;
            arenaObjects.push(obsElement);
            const obsId = Math.random();
            this.obstacles.push(
              new Obstacle(
                left,
                top,
                left + width,
                top,
                ObstacleType.rock,
                obsId,
                null,
                obsElement
              ),
              new Obstacle(
                left + width,
                top,
                left + width,
                top + height,
                ObstacleType.rock,
                obsId,
                null,
                obsElement
              ),
              new Obstacle(
                left,
                top + height,
                left + width,
                top + height,
                ObstacleType.rock,
                obsId,
                null,
                obsElement
              ),
              new Obstacle(
                left,
                top,
                left,
                top + height,
                ObstacleType.rock,
                obsId,
                null,
                obsElement
              )
            );
            break;
          }
        }
      };
    }
  }

  //Summary: check if two rectangular image html elements overlap
  //overlap is true when a corner of an image 1 is within both the x-range
  //and y-range of image 2.
  //Input: inputs are DOMRect objects that are return from calling getBoundingClientRect()
  //       on an html element
  checkImageOverlap(rect1, rect2) {
    const minX1 = rect1.left;
    const maxX1 = rect1.left + rect1.width;
    const minY1 = rect1.top;
    const maxY1 = rect1.top + rect1.height;
    const minX2 = rect2.left;
    const maxX2 = rect2.left + rect2.width;
    const minY2 = rect2.top;
    const maxY2 = rect2.top + rect2.height;

    const inXRange =
      (minX2 > minX1 && minX2 < maxX1) || (maxX2 > minX1 && maxX2 < maxX1);

    const inYRange =
      (minY2 > minY1 && minY2 < maxY1) || (maxY2 > minY1 && maxY2 < maxY1);
    return inXRange && inYRange;
  }

  incrementScore() {
    const newScore = Math.round((Date.now() - this.GAME_START_TIME) / 100);
    this.score = newScore;
    const scoreElement = document.getElementById('player-score');
    scoreElement.textContent = `${newScore}`;
  }

  //call back function for bike when emit projectile key is pressed
  emitProjectile = (bike) => {
    //add projectile to list for collision checking
    this.projectiles.push(
      new Projectile(
        bike.centerPosition,
        bike.direction,
        this.PROJ_SPEED,
        this.PROJ_IMG_PATH
      )
    );
    //remove a projectile icon from projectile box element
    const projId = bike.bikeId + '-proj-box';
    const projBox = document.getElementById(projId);
    projBox.removeChild(projBox.children[0]);
  };

  gameStartCountDown() {
    let counter = 3;
    const countDownTextElement = document.createElement('div');
    countDownTextElement.classList.add('pop-up-text');
    countDownTextElement.innerHTML = counter;
    this.arena.append(countDownTextElement);
    const timeoutId = setInterval(() => {
      if (counter) {
        counter--;
        const text = counter ? counter : 'GO';
        countDownTextElement.innerHTML = text;
      } else {
        clearInterval(timeoutId);
        countDownTextElement.remove();

        //starting the game
        this.isRunning = true;
        this.GAME_START_TIME = Date.now();
        this.setupBikeEventListeners();
        this.animFrameId = requestAnimationFrame(this.evolveGame);
      }
    }, 1000);
  }

  evolveGame = (timestamp) => {
    //initialize lasttimestamp during the the first loop
    if (this.lastTimestamp === undefined) {
      this.lastTimestamp = timestamp;
    }

    if (timestamp - this.lastTimestamp >= this.GAME_REFRESH_RATE) {
      this.lastTimestamp = timestamp;

      //advance bike motion and update its trail on canvas
      this.players.forEach((player, i) => {
        const bike = player.bike;
        bike.moveForwardAndAddTrail();
        const obsToRemove = bike.removeExpiredTrail();
        this.eraseCanvasTrail(obsToRemove);
        this.drawCanvasTrail();
      });

      //add current bike trail to list of obstacle segments
      let updatedObstacles = [...this.obstacles];
      this.players.forEach((player) => {
        updatedObstacles = [
          ...updatedObstacles,
          ...player.bike.getTrailForCollisionCheck()
        ];
      });

      //advance projectile motion
      this.projectiles.forEach((proj) => {
        proj.moveForward(proj);
      });

      //increment score
      this.incrementScore();

      //check for collision with bikes
      this.checkBikeCollision(updatedObstacles);

      //check for collision with laser
      this.checkProjectileCollision(updatedObstacles);
    }
    //check if we should run the game loop again
    if (this.isRunning) {
      this.animFrameId = requestAnimationFrame(this.evolveGame);
    } else {
      cancelAnimationFrame(this.animFrameId);
      this.endGame();
    }
  };

  checkBikeCollision(updatedObstacles) {
    for (const player of this.players) {
      const hasCollided = updatedObstacles.map((obs) => {
        return player.bike.hasCollided(obs);
      });

      if (hasCollided.includes(true)) {
        //figure out the winning player and end the game
        const winnerInd = hasCollided.indexOf(false);
        this.winningPlayer = this.players[winnerInd];
        this.isRunning = false;
        return;
      }
    }
  }

  checkProjectileCollision(updatedObstacles) {
    for (const obs of updatedObstacles) {
      let i = this.projectiles.length;
      while (i--) {
        if (this.projectiles[i].hasCollided(obs)) {
          //remove projectile object and its html element and handle collidee situation
          this.projectiles[i].element.remove();
          this.projectiles.splice(i, 1);
          this.handleProjectileCollision(obs);
        }
      }
    }
  }

  handleProjectileCollision(obstacle) {
    switch (obstacle.type) {
      case ObstacleType.wall:
        break;
      case ObstacleType.rock:
        //remove html element and the 4 obstacles object that forms the rock
        obstacle.element.remove();
        this.obstacles = this.obstacles.filter(
          (obs) => obs.ownerId != obstacle.ownerId
        );
        break;
      case ObstacleType.trail:
        this.removeTrailFrom(obstacle);
        break;
      default:
        break;
    }
  }

  removeTrailFrom(seg) {
    const bikeId = seg.ownerId;
    const bike = this.players.filter((player) => {
      return player.bike.bikeId == bikeId;
    })[0].bike;
    const index = bike.trail.findIndex((trailSeg) => {
      return (
        trailSeg.x1 == seg.x1 &&
        trailSeg.x2 == seg.x2 &&
        trailSeg.y1 == seg.y1 &&
        trailSeg.y2 == seg.y2
      );
    });

    //extend the trail deletion further to allow the entire bike's width to pass through
    //without touch the trail
    const halfWidthOfWidestBike =
      Math.max(
        ...this.players.map((player) => {
          return player.bike.imgWidth;
        })
      ) / 2;

    const deletionIndex =
      Math.ceil(index + halfWidthOfWidestBike / this.BIKESPEED) + 5;
    this.eraseCanvasTrail(bike.trail.slice(0, deletionIndex));
    bike.trail = bike.trail.slice(deletionIndex);
  }

  endGame() {
    //display Game Over text for 2 seconds
    const endGameTextElement = document.createElement('div');
    endGameTextElement.classList.add('pop-up-text');
    endGameTextElement.innerHTML = 'Game Over';
    this.arena.append(endGameTextElement);
    const timeoutId = setTimeout(() => {
      endGameTextElement.remove();
      //remove event listeners, update score and render game-over page
      this.removeBikeEventListeners();
      this.winningPlayer.updateScore(this.score);
      this.renderGameOverPage();
    }, 2000);
  }

  renderGameOverPage() {
    //switch from game page to game over page and wire the buttons in game over page
    this.gamePageElement.setAttribute('hidden', 'true');
    this.gameOverPageElement.removeAttribute('hidden');

    //calculate and display stats to player
    document.getElementById(
      'winner-name'
    ).innerHTML = `${this.winningPlayer.name}`;
    document.getElementById(
      'winner-score'
    ).innerHTML = `You scored ${this.score} points!`;

    const statsBoardElement = document.getElementById('score-stats');
    statsBoardElement.innerHTML = `<p></p><p>${this.players[0].name}</p>
    <p>${this.players[1].name}
    </p><p>Best Score</p>
    <p>${this.players[0].bestScore}</p>
    <p>${this.players[1].bestScore}</p>
    <p>Accumulated Score</p>
    <p>${this.players[0].accumulatedScore}</p>
    <p>${this.players[1].accumulatedScore}</p>`;
  }

  mainMenuBtnClicked = () => {
    this.openingPageElement.removeAttribute('hidden');
    this.gameOverPageElement.setAttribute('hidden', true);
  };

  playAgainBtnClicked = () => {
    this.gameOverPageElement.setAttribute('hidden', true);
    this.gamePageElement.removeAttribute('hidden');
    this.startFreshGame();
  };
}
