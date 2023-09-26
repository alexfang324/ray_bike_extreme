import Direction from './direction_enum.js';

export default class Bike {
  #bikeElement;
  #position;
  #headPosition;
  #direction;
  #speed;
  #bikeId;
  #prevHeadSeg;

  BikeRotation = Object.freeze({
    up: '0deg',
    right: '90deg',
    down: '180deg',
    left: '270deg'
  });

  constructor(position, direction, speed, bikeId) {
    this.position = position;
    this.headPosition = position;
    this.direction = direction;
    this.speed = speed;
    this.bikeId = bikeId;
    this.prevHeadSeg = [...position, ...position];
    const arena = document.getElementById('arena');
    const bike = document.createElement('img');
    bike.id = bikeId;
    bike.src = '../img/green-bike.jpg';
    bike.style.top = position[1] + 'px';
    bike.style.left = position[0] + 'px';
    bike.style.rotate = this.BikeRotation[direction];
    bike.classList.add('bike');
    arena.appendChild(bike);
    this.bikeElement = bike;
    return this;
  }

  calculateHeadPosition (){
    const bikeWidth = parseFloat(this.bikeElement.getBoundingClientRect().left.toFixed(2));
    const bikeHeight = parseFloat(this.bikeElement.getBoundingClientRect().top.toFixed(2));
    switch (this.direction){
      // case Direction.up:
      //   return [this.position[0]+bikeWidth/2.0, this.position[1]];
      // case Direction.down:
      //   return [this.position[0]+bikeWidth/2.0, this.position[1]+bikeHeight];
      // case Direction.left:
      //   return [this.position[0], this.position[1]+bikeWidth/2.0];
      // case Direction.right:
      //   return [this.position[0]+bikeHeight, this.position[1]+bikeWidth/2.0];

      case Direction.up:
        return [this.position[0]+bikeWidth/2.0, this.position[1]];
      case Direction.down:
        return [this.position[0]+bikeWidth/2.0, this.position[1]+bikeHeight];
      case Direction.left:
        return [this.position[0], this.position[1]+bikeHeight/2.0];
      case Direction.right:
        return [this.position[0]+bikeWidth, this.position[1]+bikeHeight/2.0];
    }
  }

  //Summary: advance bike position based on speed and direction
  //Output: bike's new position
  moveForward() {
    const bike = document.getElementById(this.bikeId);
    const oldHeadPostion = [...this.headPosition]; //copy by value
    switch (this.direction) {
      case Direction.up:
        this.position[1] -= this.speed;
        bike.style.top = this.position[1] + 'px';
        break;
      case Direction.down:
        this.position[1] += this.speed;
        bike.style.top = this.position[1] + 'px';
        break;
      case Direction.left:
        this.position[0] -= this.speed;
        bike.style.left = this.position[0] + 'px';
        break;
      case Direction.right:
        this.position[0] += this.speed;
        bike.style.left = this.position[0] + 'px';
        break;
    }
    this.headPosition = this.calculateHeadPosition();
    this.prevHeadSeg = [...oldHeadPostion, ...this.headPosition];
  }

  //Summary: return position of the bike
  //Output: bike position
  getPosition = () => {
    return this.position;
  };

  //Summary: update bike's moving direction
  //Input: a valid direction from the Direction enum
  //Output: Null
  updateDirection = (key) => {
    switch (key) {
      case 'ArrowUp':
        this.direction = Direction.up;
        break;
      case 'ArrowDown':
        this.direction = Direction.down;
        break;
      case 'ArrowLeft':
        this.direction = Direction.left;
        break;
      case 'ArrowRight':
        this.direction = Direction.right;
    }
    const bike = document.getElementById(this.bikeId);
    bike.style.rotate = this.BikeRotation[this.direction];
  };

  //Summary: check if a bike's movement will collide with one of the game object
  //Input: prevHeadSeg is an array [x1, y1, x2, y2], reprsent bike's movement from previous position (x1,y1)
  //       to current location (x2,y2)
  //       obstacle is either a segment [x1,y1,x2,y2], e.g. wall or ray segment, or a position (x1,y1), e.g. point-like obstacle.
  //Output: boolean of whether the prevHeadSeg cross the obstacle segment or rest on a point-like obstacle.
  //Assumption: obstacle obstacle must lie on a grid point.
  //            assume every segment only contains either a x (horizontal) or y (vertical) change and not both.
  hasCollided = (obstacle) => {
    let collided = false;
    console.log(this.prevHeadSeg)
    if (obstacle.length == 4) {
      //object is another segment
      const bikeDir =
        this.prevHeadSeg[2] - this.prevHeadSeg[0] == 0 ? 'vertical' : 'horizontal';
      const objDir = obstacle[2] - obstacle[0] == 0 ? 'vertical' : 'horizontal';

      if (bikeDir == 'horizontal' && objDir == 'vertical') {
        const minObjY = Math.min(obstacle[1], obstacle[3]);
        const maxObjY = Math.max(obstacle[1], obstacle[3]);
        const minBikeX = Math.min(this.prevHeadSeg[0], this.prevHeadSeg[2]);
        const maxBikeX = Math.max(this.prevHeadSeg[0], this.prevHeadSeg[2]);
        if (
          this.prevHeadSeg[1] >= minObjY &&
          this.prevHeadSeg[1] <= maxObjY &&
          minBikeX <= obstacle[0] &&
          maxBikeX >= obstacle[0]
        ) {
          collided = true;
        }
      }

      if (bikeDir == 'vertical' && objDir == 'horizontal') {
        const minObjX = Math.min(obstacle[0], obstacle[2]);
        const maxObjX = Math.max(obstacle[0], obstacle[2]);
        const minBikeY = Math.min(this.prevHeadSeg[1], this.prevHeadSeg[3]);
        const maxBikeY = Math.max(this.prevHeadSeg[1], this.prevHeadSeg[3]);
        if (
          this.prevHeadSeg[0] >= minObjX &&
          this.prevHeadSeg[0] <= maxObjX &&
          minBikeY <= obstacle[1] &&
          maxBikeY >= obstacle[1]
        ) {
          collided = true;
        }
      }
    } else {
      //obstacle a single point on grid
      const sameX =
        obstacle[0] == this.prevHeadSeg[0] || obstacle[0] == this.prevHeadSeg[2]
          ? true
          : false;
      const sameY =
        obstacle[1] == this.prevHeadSeg[1] || obstacle[1] == this.prevHeadSeg[3]
          ? true
          : false;
      collided = sameX && sameY ? true : false;
    }
    return collided;
  };
}
