var NUM_PLAYERS = 150,
    GRAVITY = 6.67e-11,
    MAX_MASS = 1e10;

function Player(maxWidth, maxHeight, opts) {
    opts = opts || {};
    this.id = generateId();
    this.m = opts.m || generateMass();
    this.x = opts.x || generatePosition(maxWidth);
    this.y = opts.y || generatePosition(maxHeight);
    this.radius = opts.radius || generateRadius(this.m);
    this.a = opts.a || new Vector();
    this.v = opts.v || new Vector(Math.random(), Math.random() * Math.PI);
    this.color = opts.color || generateColor();
    this.dead = false;
    this.update = true;
}

function Vector(magnitude, theta) {
    this.magnitude = magnitude || 0;
    this.theta = theta || 0;
}

Vector.prototype.getYComponent = function() {
    return this.magnitude * Math.sin(this.theta);
};

Vector.prototype.getXComponent = function() {
    return this.magnitude * Math.cos(this.theta);
};

var uniqueId = 0;
function generateId() {
    return uniqueId++;
}

function generateMass() {
    return Math.random() * MAX_MASS;
}

function maybeNegative() {
    return Math.random() - 0.5 > 0 ? 1 : -1;
}

function generatePosition(max) {
    return (max / 2 ) + (Math.random() * 355 * maybeNegative());
}

function generateRadius(mass) {
    return 5 + mass / MAX_MASS * 10;
}

function generateAcceleration() {
    return Math.random() * 5;
}

function generateNumber(max) {
    return Math.random() * max;
}

function generateColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

function Game() {
    this.canvas = document.getElementById('game-mount');
    this.ctx = this.canvas.getContext('2d');
    this.players = [];
}

Game.prototype.resize = function() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.style.width = this.width;
    this.canvas.style.height = this.height;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.canvas.width = this.width;
    this.ctx.canvas.height = this.height;
};

Game.prototype.generatePlayers = function(numPlayers) {
    // this.players.push(new Player(this.width, this.height, {
    //     m: 1e10,
    //     radius: 50,
    //     x: 700,
    //     y: 300,
    //     v: new Vector()
    // }));

    for(var i = 0; i < numPlayers; i++) {
        this.players.push(new Player(this.width, this.height));
    }
};

Game.prototype.drawPlayer = buildDrawMethod.call(this, function(player) {
    var radius = player.radius;
    this.ctx.fillStyle = player.color;
    this.ctx.beginPath();
    this.ctx.arc(player.x, player.y, radius, 0, 2 * Math.PI, false);
    this.ctx.fill();
});

function calculateFg(p1, p2) {
    var d = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    return GRAVITY * p1.m * p2.m / d;
}

function calculateTheta(p1, p2) {
    var y = p2.y - p1.y,
        x = p2.x - p1.x;

    return Math.atan2(y, x);
}

function calculateAcceleration(p1, p2) {
    var force = calculateFg(p1, p2);
    return {
        vx: force / p1.m,
        vy: 0
    };
}

function addVectors(v1, v2) {
    var vx = v1.getXComponent() + v2.getXComponent(),
        vy = v1.getYComponent() + v2.getYComponent();

    return new Vector(
        Math.sqrt(Math.pow(vx, 2) + Math.pow(vy, 2)),
        Math.atan2(vy, vx)
    );
}

Game.prototype.isOutOfBounds = function(dimension, max) {
    if (dimension < 0) {
        return -1;
    } else if (dimension > max) {
        return 1;
    } else {
        return 0;
    }
};

Game.prototype.updatePlayer = function(p1, players) {
    var vg = players.reduce(function(v, p2) {
        if (p1.id === p2.id) { return v; }

        if (this.killOutOfBounds && p2.dead) { return v; }

        var fg = calculateFg(p1, p2),
            ag = new Vector(
                fg / p1.m,
                calculateTheta(p1, p2)
            );

        return addVectors(v, ag);
    }.bind(this), new Vector());

    var vf = addVectors(p1.v, vg);

    p1.v = vf;
    var x = p1.x + vf.getXComponent(),
        y = p1.y + vf.getYComponent(),
        kill = false;

    var dimensions = [{
        dimension: x,
        max: this.width + p1.radius
    }, {
        dimension: y,
        max: this.height + p1.radius
    }].map(function(d) {
        var sign = this.isOutOfBounds(d.dimension, d.max),
            adjustedDimension;

        if (!this.flipOutOfBounds) {
            adjustedDimension = d.dimension;
        } else if (sign === -1) {
            adjustedDimension = d.max + d.dimension;
        } else if (sign === 1) {
            adjustedDimension = d.max % d.dimension;
        } else {
            adjustedDimension = d.dimension;
        }

        if (sign !== 0) {
            kill = true;
        }

        return adjustedDimension;
    }.bind(this));

    if (kill) {
        p1.dead = true;
    }

    p1.x = dimensions[0];
    p1.y = dimensions[1];

    return p1;
};

Game.prototype.clearCanvas = function() {
    this.ctx.clearRect(0, 0, this.width, this.height);
};

Game.prototype.drawFrame = function() {
    this.clearCanvas();

    this.players = this.players.map(function(player) {
        if (this.killOutOfBounds && player.dead) { return player; }

        this.drawPlayer(player);

        return player.update && this.updatePlayer(player, this.players);
    }.bind(this));

    if (!this.stop) {
        window.requestAnimationFrame(this.drawFrame.bind(this));
    }
};

function buildDrawMethod(method) {
    return function() {
        this.ctx.save();
        method.apply(this, arguments);
        this.ctx.restore();
    };
}

Game.prototype.start = function() {
    window.requestAnimationFrame(this.drawFrame.bind(this));
};

var game = new Game();

game.resize();
game.killOutOfBounds = false;
game.flipOutOfBounds = true;
game.generatePlayers(NUM_PLAYERS);
game.start();

// Game controls
window.addEventListener('keydown', function(e) {
    if (e.keyCode === 27) {
        if (game.stop) {
            game.stop = false;
            game.start();
        } else {
            game.stop = true;
        }
    } else if (e.keyCode === 32) {
        if (game.stop) {
            game.drawFrame();
        }
    }
});

var cursorMass = 1e5;
var cursorRadius = 5 + cursorMass / MAX_MASS * 10;

Game.prototype.updateWithCursorPosition = function(cursorX, cursorY) {
    var cursor = {
        m: cursorMass,
        x: cursorX,
        y: cursorY,
        radius: cursorRadius // not really needed for calculations, but added for completeness
    };

    this.players.forEach(function(player) {
        if (this.killOutOfBounds && player.dead) { return; }

        var fg = calculateFg(player, cursor),
            ag = new Vector(
                fg / player.m,
                calculateTheta(player, cursor)
            );

        player.a = addVectors(player.a, ag);
    }.bind(this));
};

window.addEventListener('mousemove', function(e) {
    var rect = game.canvas.getBoundingClientRect();
    var cursorX = e.clientX - rect.left;
    var cursorY = e.clientY - rect.top;
    game.updateWithCursorPosition(cursorX, cursorY);
});
