// PROTOTYPES

const v_mult = p5.Vector.mult;
const v_sub = p5.Vector.sub;
const v_add = p5.Vector.add;

Array.prototype.onPred = function(callback, predicate){
    var i = this.length;
    while (i--){
        if(predicate(this[i], i)){
            callback(this, this[i], i);
        }
    }
}


// smoothed particle hydrodynamics
//

// a = height of peak
// b = position of the center
// c = std deviation (width)
function gaussian(x, a, b, c){
    const num = (x - b) * (x - b);
    const den = 2 * c * c;
    return a * Math.exp( -1 * (num / den) ); 
}

function accel(a, b){
    const m_j = 1; // 
    const gradient_wij = 1; // ?? 
    const pressure_i = 1;
    const pressure_j = 1;

    const density_i2 = a.density * a.density;
    const density_j2 = b.density * b.density;
    const den_iterp = (
        ( pressure_i / density_i2) + 
        ( pressure_j / density_j2)
    );
    return -1 * (m_j * den_iterp * gradient_wij);
}

function calculate_accel(){
    for(let i =0 ; i<particles.length; i++){
        const a = particles[i]
        a.acc.y = GRAVITY;
        a.acc.x = 0;
        for(let j = 0 ; j<particles.length; j++){
            const b = particles[j]
            const a_I = accel(a, b);
        }
    }
}

const GRAVITY = 1
const PRESSURE = 4
const VISCOSITY = 8 
const MAX_DENSITY = 9


function for_all_others(a, callback ) {
    for(let j = 1 ; j<particles.length; j++){
        const b = particles[j]
        const x_dist = a.pos.x - b.pos.x
        const y_dist = a.pos.y - b.pos.y
        const distV = createVector(x_dist, y_dist)
        const interaction = Math.abs( distV.mag() ) / 2.0 - 1.0
        if( interaction < 1){
            callback(b, distV.copy(), interaction);
        }
    }
}

function calculate_densities(){
    for(let i =0 ; i< particles.length; i++){
        const a = particles[i]
        a.density = a.fixed? MAX_DENSITY : 0
        if(a.fixed){continue}
        for_all_others(
            a, 
            (b, distV, interaction) => {
                a.density += interaction * interaction;
            }
        );
    }
}

function calculate_forces(){
    for(let i =0 ; i< particles.length; i++){
        const a = particles[i]
        a.acc.set(0, GRAVITY);
        if(a.fixed){continue}
        for_all_others(
            a, 
            (b, distV, interaction) => {
    
                const dv = v_mult(distV, 3-a.density-b.density);
                const v_pressure = v_mult(dv, PRESSURE)
                const v_vel = (
                    v_sub( 
                        v_mult(a.vel, VISCOSITY),
                        v_mult(b.vel, VISCOSITY)
                    )
                );

                a.acc.add(
                    v_add( v_pressure, v_vel)
                    .mult(interaction)
                    .div(a.density)
                );
            }
        );
    }
}


function tick(){
    // remove dead particles
    particles.onPred(
        (array, item, index) => {
            item.emitter.myp -= 1;
            array.splice(index, 1);
        },
        (item, _) => item === undefined || item.life < 0 || item.pos.y > height || item.pos.y < 0
    );

    calculate_densities()
    calculate_forces()

    particles.onPred(
        (_a, item, _b) => item.update(),
        () => true
    );

    emitters.onPred(
        (_a, item, _b) => { item.update() },
        () => {return true;}
    )
}

// TOC
const PSIZE = 10
let emitters = []
let particles = []

class Particle {
    constructor(e, x, y, max_life, dies, fixed){
        this.emitter = e;
        this.pos = createVector(x, y)
        this.vel = createVector(0, 0)
        this.acc = createVector(0, 0)
        this.density = 1.0;
        this.max_life = max_life
        this.life = max_life;
        this.dies = dies;
        this.fixed = fixed;
    }

    update(){
        if(this.fixed){ return; }
        this.vel.add(this.acc.copy().div(10))
        this.pos.add(this.vel)
    }

    draw(){
        this.life -= this.dies? 1 : 0
        push()
        let alpha = map(this.density, 0, 10, 100, 255);
        //map(this.life, 0, this.max_life, 0, 255)
        fill(255, 255, 255, alpha);
        translate(this.pos.x, this.pos.y)
        rect(0, 0, PSIZE, PSIZE)
        pop()
    }
}

function new_particle(emitter, pos, type){
    let p, new_pos;
    switch(type){
        case "wall":
            new_pos = pos.copy()
            
            p = new Particle(emitter, new_pos.x, new_pos.y, 100, false, true);
            break
        case "sand":
        default:
            new_pos = pos.add( createVector(5*random(), 5*random() ))
            p = new Particle(emitter, new_pos.x, new_pos.y, 100, false, false);
            break;
    }
    particles.push(p)
}

class Emitter {
    constructor(x, y, type){
        this.pos = createVector(x, y);
        this.type = type;
        this.dir = 1
        this.myp = 0
    }
    update(){
        let maxp = 0, speed = PSIZE 
        if(this.type === "wall"){ speed = PSIZE ; maxp = 200/speed }

        if(this.myp > maxp){ return} 
        this.myp += 1
        new_particle(this, createVector(this.pos.x, this.pos.y), this.type)
        this.pos.x += this.dir * speed
        if(this.pos.x < 50 || this.pos.x > 250){
            this.dir *= -1
        }
    }
}

function setup() {
  createCanvas(400, 450);
  emitters = []
  emitters.push( new Emitter(100, 100, "sand"))
  emitters.push( new Emitter(100, 200, "wall"))
  emitters.push( new Emitter(100, 50, "wall"))
}

function keyStuff() {
  let x = 0;
  let y = 0;

  if (keyIsDown(LEFT_ARROW)) {
    x = -1
  } else if (keyIsDown(RIGHT_ARROW)) {
    x = 1;
  }
  if (keyIsDown(UP_ARROW)) {
    y = -1;
  }
  return [x, y];
}

function draw() {
    frameRate(30)
    background(0);
    tick()
    for(const p of particles){
        p.draw()
    }
    if(mouseIsPressed){
        const a = new Particle(null, mouseX, mouseY, 100, false, true)
        particles.push(a)
    }
}
