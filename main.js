var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');

var width = canvas.width = window.innerWidth;
var height = canvas.height = window.innerHeight;
var BALL_COUNT = random(15,20);
var ANIMATION = null;
window.onload = function () {
  setTimeout();
  loop();
}
// function to generate random number

function random(min,max) {
  var num = Math.floor(Math.random()*(max-min)) + min;
  return num;
}

function Shape(x, y, velX, velY, exists) {
  this.x = x;
  this.y = y;
  this.velX = velX;
  this.velY = velY;
  this.exists = exists;
}

//定义控制器
function EvilCircle(x, y, exists) {
  Shape.call(this, x, y, exists);
  this.color = 'white';
  this.size = 10;
  this.velX = 10;
  this.velY = 10;
  this.hp = 10; // 生命值
}

EvilCircle.prototype.draw = function(){
  ctx.beginPath();
  ctx.lineWidth = 5;
  ctx.strokeStyle = this.color;
  ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
  ctx.stroke();
}

EvilCircle.prototype.checkBounds = function() {
  if((this.x + this.size) >= width) {
    this.x -= this.size;
  }

  if((this.x - this.size) <= 0) {
    this.x += this.size;
  }

  if((this.y + this.size) >= height) {
    this.y -= this.size;
  }

  if((this.y - this.size) <= 0) {
    this.y += this.size;
  }
};

EvilCircle.prototype.setControls = function() {
  var _this = this;
  var _keyPressed = {};

  window.onkeyup = function (e) {
    _keyPressed[e.keyCode] = false;
  }
  window.onkeydown = function(e){
    _keyPressed[e.keyCode] = true;
  }
  setInterval(function(){
    for(var key in _keyPressed){
      if(_keyPressed[key]){

        switch (parseInt(key)) {
          case 65:
            _this.x -= _this.velX;
            break;
          case 68:
            _this.x += _this.velX;
            break;
          case 87:
            _this.y -= _this.velY;
            break;
          case 83:
            _this.y += _this.velY;
            break;
        
          default:
            break;
        }
      }
    }
  },50)
}

//碰撞判断
EvilCircle.prototype.collisionDetect = function() {
  for(var j = 0; j < balls.length; j++) {
    
    var dx = this.x - balls[j].x;
    var dy = this.y - balls[j].y;
    var distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.size + balls[j].size) {
      this.hp --; //扣分
      this.color = 'rgb(' + random(0,255) + ',' + random(0,255) + ',' + random(0,255) +')';
    }
    
  }
};

// define Ball constructor

function Ball(x, y, velX, velY, exists, color, size) {
  Shape.call(this, x, y, velX, velY, exists); //继承调用
  // this.x = x;
  // this.y = y;
  // this.velX = velX;
  // this.velY = velY;
  this.color = color;
  this.size = size;
}

// define ball draw method

Ball.prototype.draw = function() {
  ctx.beginPath();
  ctx.fillStyle = this.color;
  ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
  ctx.fill();
};

// define ball update method

Ball.prototype.update = function() {
  if((this.x + this.size) >= width) {
    this.velX = -(this.velX);
  }

  if((this.x - this.size) <= 0) {
    this.velX = -(this.velX);
  }

  if((this.y + this.size) >= height) {
    this.velY = -(this.velY);
  }

  if((this.y - this.size) <= 0) {
    this.velY = -(this.velY);
  }

  this.x += this.velX;
  this.y += this.velY;
};

// define ball collision detection

Ball.prototype.collisionDetect = function() {
  for(var j = 0; j < balls.length; j++) {
    if(!(this === balls[j])) {
      var dx = this.x - balls[j].x;
      var dy = this.y - balls[j].y;
      var distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.size + balls[j].size) {
        balls[j].color = this.color = 'rgb(' + random(0,255) + ',' + random(0,255) + ',' + random(0,255) +')';
      }
    }
  }
};

// define array to store balls

var balls = [];

// define loop that keeps drawing the scene constantly

function loop() {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0,0,width,height);
  
  while(balls.length < BALL_COUNT) {
    var size = random(10,20);
    var ball = new Ball(
      // ball position always drawn at least one ball width
      // away from the adge of the canvas, to avoid drawing errors
      random(0 + size,width - size),
      random(0 + size,height - size),
      random(-5,5),
      random(-5,5),
      true,
      'rgb(' + random(0,255) + ',' + random(0,255) + ',' + random(0,255) +')',
      size
    );
    balls.push(ball);
  }

  var _ballCount = 0;
  for(var i = 0; i < balls.length; i++) {
    if(balls[i].exists){
      balls[i].draw();
      balls[i].update();
      balls[i].collisionDetect();
      _ballCount ++;
    }

  }

  evilCircle.draw();
  evilCircle.checkBounds();
  evilCircle.collisionDetect();
  showBallsCount(_ballCount);//显示分数
  showMainHP(evilCircle.hp);
  ANIMATION = requestAnimationFrame(loop);
}

function showBallsCount(val){
  document.getElementById('ballCount').innerHTML = 'Ball Count:' + val;
}
function showMainHP(val){
  document.getElementById('mainHP').innerHTML = 'HP:' + val;
  if(val <= 0){
    document.getElementById('result').innerHTML = 'GAME OVER'
    window.cancelAnimationFrame(ANIMATION);
    
    
  }
}

function setTimeout(){
  var _timeout = 30;
  var timer = setInterval(()=>{
    _timeout --;
    document.getElementById('timeout').innerHTML = _timeout;
    if(_timeout <= 0){
      window.cancelAnimationFrame(ANIMATION);
      clearInterval(timer);
    }
  },1000)

}

var evilCircle = new EvilCircle(random(0,width),random(0,height),true);
evilCircle.setControls();
