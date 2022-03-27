var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");

var width = (canvas.width = window.innerWidth);
var height = (canvas.height = window.innerHeight);
var MOVE_MIN_WIDTH = width * 0.1;
var MOVE_MIN_HEIGHT = height * 0.1;
var MOVE_MAX_WIDTH = width * 0.9;
var MOVE_MAX_HEIGHT = height * 0.9;
var ANIMATION = null;

// function to generate random number
function random(min, max) {
  var num = Math.floor(Math.random() * (max - min)) + min;
  return num;
}

//系统变量
function GameParams() {
  this.time = 10;
  this.chapter = 1;
  this.ballCount = 10;
  this.start = false;
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
  this.color = "white";
  this.size = 10;
  this.velX = 10;
  this.velY = 10;
  this.hp = 50; // 生命值
}

EvilCircle.prototype.draw = function () {
  var img = document.querySelector("#avatar");
  // ctx.beginPath();
  ctx.strokeStyle = this.color;

  ctx.drawImage(img, this.x - 10, this.y - 10, 20, 20);
  // ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
  // ctx.stroke();
};

EvilCircle.prototype.checkBounds = function () {
  if (this.x + this.size >= MOVE_MAX_WIDTH) {
    this.x -= this.size;
  }

  if (this.x - this.size <= MOVE_MIN_WIDTH) {
    this.x += this.size;
  }

  if (this.y + this.size >= MOVE_MAX_HEIGHT) {
    this.y -= this.size;
  }

  if (this.y - this.size <= MOVE_MIN_HEIGHT) {
    this.y += this.size;
  }
};

EvilCircle.prototype.setControls = function () {
  var _this = this;
  var _keyPressed = {};

  window.onkeyup = function (e) {
    _keyPressed[e.keyCode] = false;
    if (e.keyCode === 16) {
      _this.velX = 10;
      _this.velY = 10;
    }
  };
  window.onkeydown = function (e) {
    _keyPressed[e.keyCode] = true;
    if (e.keyCode === 16) {
      _this.velX = 15;
      _this.velY = 15;
    }
  };
  setInterval(function () {
    for (var key in _keyPressed) {
      if (_keyPressed[key]) {
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
  }, 50);
};

//碰撞判断
EvilCircle.prototype.collisionDetect = function () {
  for (var j = 0; j < balls.length; j++) {
    var dx = this.x - balls[j].x;
    var dy = this.y - balls[j].y;
    var distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.size + balls[j].size) {
      this.hp--; //扣分
      this.color =
        "rgb(" +
        random(0, 255) +
        "," +
        random(0, 255) +
        "," +
        random(0, 255) +
        ")";
      showMainHP(this.hp);
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

Ball.prototype.draw = function () {
  ctx.beginPath();
  ctx.fillStyle = this.color;
  ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
  ctx.fill();
};

// define ball update method

Ball.prototype.update = function () {
  if (this.x + this.size >= width) {
    this.velX = -this.velX;
  }

  if (this.x - this.size <= 0) {
    this.velX = -this.velX;
  }

  if (this.y + this.size >= height) {
    this.velY = -this.velY;
  }

  if (this.y - this.size <= 0) {
    this.velY = -this.velY;
  }

  this.x += this.velX;
  this.y += this.velY;
};

// define ball collision detection

Ball.prototype.collisionDetect = function () {
  for (var j = 0; j < balls.length; j++) {
    if (!(this === balls[j])) {
      var dx = this.x - balls[j].x;
      var dy = this.y - balls[j].y;
      var distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.size + balls[j].size) {
        balls[j].color = this.color =
          "rgb(" +
          random(0, 255) +
          "," +
          random(0, 255) +
          "," +
          random(0, 255) +
          ")";
      }
    }
  }
};

// define array to store balls

var balls = [];

// define loop that keeps drawing the scene constantly

function loop() {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, 0, width, height);
  ctx.lineWidth = 5;
  ctx.strokeRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8); //绘制矩形边框

  while (balls.length < gameParams.ballCount) {
    var size = random(10, 20);
    var ball = new Ball(
      // ball position always drawn at least one ball width
      // away from the adge of the canvas, to avoid drawing errors
      random(0 + size, width - size),
      random(0 + size, height - size),
      random(-5, 5),
      random(-5, 5),
      true,
      "rgb(" +
        random(0, 255) +
        "," +
        random(0, 255) +
        "," +
        random(0, 255) +
        ")",
      size
    );
    balls.push(ball);
  }

  for (var i = 0; i < balls.length; i++) {
    if (balls[i].exists) {
      balls[i].draw();
      if (gameParams.start) {
        balls[i].update();
        balls[i].collisionDetect();
      }
    }
  }

  evilCircle.draw();
  evilCircle.checkBounds();
  evilCircle.collisionDetect();

  ANIMATION = requestAnimationFrame(loop);
}

function updateHtml() {
  document.getElementById("ballCount").innerHTML = gameParams.ballCount;
  document.getElementById("chapter").innerHTML = gameParams.chapter;
}
function showMainHP(val) {
  document.getElementById("mainHP").innerHTML = val;
  if (val <= 0) {
    document.getElementById("result").innerHTML = "GAME OVER";
    window.cancelAnimationFrame(ANIMATION);
    clearInterval(timer); //停止定时器

    var historyChapter = localStorage.getItem("gameParams.chapter") || 0;
    if (gameParams.chapter > historyChapter) {
      localStorage.setItem("gameParams.chapter", gameParams.chapter);
      document.getElementById("best-chapter").innerHTML = gameParams.chapter;
    }
  }
}
//增加球速度
function promoteVel() {
  for (var itm of balls) {
    console.log(itm);
    itm.velX < 0
      ? (itm.velX -= random(1, 9) / 10)
      : (itm.velX += random(1, 9) / 10);
    itm.velY < 0
      ? (itm.velY -= random(1, 9) / 10)
      : (itm.velY += random(1, 9) / 10);
  }
}

function successAction() {
  clearInterval(timer); //停止定时器
  gameParams.start = false;
  //延时一秒增加
  if (gameParams.ballCount < 20) {
    gameParams.ballCount += 2;
  } else if (gameParams.ballCount < 30) {
    promoteVel(); //提升速度
    gameParams.ballCount += 1;
  } else {
    promoteVel(); //提升速度
  }
  gameParams.time = 10;
  gameParams.chapter++;
  updateHtml();

  setTimeout(() => {
    //延时3秒启动
    gameParams.start = true;

    timer = setInterval(() => {
      document.getElementById("timeout").innerHTML = gameParams.time;
      if (gameParams.time <= 0) {
        successAction();
      }
      gameParams.time--;
    }, 1000);
  }, 3000);
}

alert("开始游戏？");

// 历史最高分
document.getElementById("best-chapter").innerHTML =
  localStorage.getItem("gameParams.chapter") || 0;

//定时器
var timer = setInterval(() => {
  gameParams.time--;
  document.getElementById("timeout").innerHTML = gameParams.time;
  if (gameParams.time <= 0) {
    successAction();
  }
}, 1000);

//初始化系统变量
var gameParams = new GameParams();

//初始化目标
var evilCircle = new EvilCircle(
  random(MOVE_MIN_WIDTH, MOVE_MAX_WIDTH),
  random(MOVE_MIN_HEIGHT, MOVE_MAX_HEIGHT),
  true
);
evilCircle.setControls();

window.onload = function () {
  updateHtml();
  showMainHP(evilCircle.hp);
  setTimeout(() => {
    gameParams.start = true;
  }, 1000);
  loop();
};
