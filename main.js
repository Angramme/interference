//helper functions
function randf(min, max){
    return Math.random()*(max-min)+min;
}


//setup
var height = window.innerHeight / window.innerWidth;
var scene = new THREE.Scene();
// var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
var camera = new THREE.OrthographicCamera( -1, 1, -height, height, 1, 10 );


const CAN = document.getElementById('CAN');
const CAN2 = document.getElementById('CAN2');
CAN2.width = window.innerWidth;
CAN2.height = window.innerHeight;

var renderer = new THREE.WebGLRenderer({
    canvas: CAN,
});
renderer.setSize( window.innerWidth, window.innerHeight );

const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

let ResMultiplier = 1.;
const RESIZE = e=>{
    let WW = window.innerWidth * ResMultiplier;
    let WH = window.innerHeight * ResMultiplier;

    height = WH / WW;
    camera.top = -height;
    camera.bottom = height;
    camera.updateProjectionMatrix();

    renderer.setSize(WW, WH);
    // composer.setSize(canvas.width, canvas.height);
    renderTarget.setSize(WW, WH);

    CAN.style.width = '100%';
    CAN.style.height = '100%';

    //overlay
    CAN2.width = window.innerWidth;
    CAN2.height = window.innerHeight;
}
window.addEventListener("resize", RESIZE);


//scene
scene.background = new THREE.Color(.1, 0, 0);


var pointers = [];
for(let i=0; i<10; i++){
    pointers.push(new THREE.Vector2(randf(-.8,.8),randf(-.8,.8)));
}
pointers[0].set(-.25, 0);
pointers[1].set(.25, 0);
pointers[2].set(0, 0);

var pointerCount = 0;


var geometry = new THREE.PlaneBufferGeometry( 2, 8, 1, 4 );
var material = new THREE.RawShaderMaterial( {
    uniforms: {
        time: { value: 1.0 },
        pointers: { type: 'vec2', value: pointers },
        pointerCount: { type:'int', value: 2, },
        propagation_speed: { value: .2 },
        wave_frequency: { value: .2 },
    },
    vertexShader: document.getElementById( 'vertexShader' ).textContent,
    fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
    side: THREE.DoubleSide,
    //transparent: true
} );


var plane = new THREE.Mesh( geometry, material );
scene.add( plane );


camera.position.z = 5;


//WATER EFFECT
const waterpass = createPassScene(new THREE.RawShaderMaterial( {
    uniforms: {
        time: { value: 1.0 },
        tPrevious: { value: renderTarget.texture },
        tRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    },
    vertexShader: document.getElementById( 'waterVS' ).textContent,
    fragmentShader: document.getElementById( 'waterFS' ).textContent,
    side: THREE.DoubleSide,
    //transparent: true
} ));
//No-water
const nowaterpass = createPassScene(new THREE.RawShaderMaterial( {
    uniforms: {
        time: { value: 1.0 },
        tPrevious: { value: renderTarget.texture },
        tRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    },
    vertexShader: document.getElementById( 'waterVS' ).textContent,
    fragmentShader: document.getElementById( 'nowaterFS' ).textContent,
    side: THREE.DoubleSide,
    //transparent: true
} ));
const RESIZE2 = e=>{
    waterpass.material.uniforms.tRes.value.set(window.innerWidth * ResMultiplier, window.innerHeight * ResMultiplier);
    nowaterpass.material.uniforms.tRes.value.set(window.innerWidth * ResMultiplier, window.innerHeight * ResMultiplier);
};
window.addEventListener('resize', RESIZE2);



//GUI
let  gui = new dat.GUI();

let visible_sources = [];

let opts = gui.addFolder("options");
opts.open();
let opts_v = {
    "propagation speed": .5,
    "wave frequency": 223.,
    "water shader": false,
    "resolution": 1,
};
opts.add(opts_v, "propagation speed", .05, 5.).name('vitesse');
opts.add(opts_v, "wave frequency", 20, 400).name("frequence d'onde");
opts.add(opts_v, "water shader").name("graphisme");
opts.add(opts_v, "resolution", 1/8, 1).name("resolution").onFinishChange(()=>{
    ResMultiplier = opts_v.resolution;
    RESIZE();
    RESIZE2();
});

let ptrs = gui.addFolder("sources");
ptrs.open();

ptrs.add({add:()=>{
    let ns = {
        index: visible_sources.reduce((prev, curr, i, arr)=>prev==curr.index? prev+1 : prev, 0),
        folder: null,
    };
    ns.folder = addPosition(pointers[ns.index], "position "+ns.index);
    
    visible_sources.push(ns);
    pointerCount++;
}}, 'add').name("ajouter");

ptrs.add({delete:()=>{
    if(pointerCount <= 0)return;
    let ns = visible_sources.pop();

    ptrs.removeFolder(ns.folder);
    pointerCount--;
}}, 'delete').name("supprimer");

function addPosition(vec3, name){
    let f = ptrs.addFolder(name);

    f.add(vec3, 'x', -1, 1).listen();
    f.add(vec3, 'y', -1, 1).listen();

    f.open();

    return f;
}


let receptor = new THREE.Vector2(-.75, 0);

//moving with mouse
let selected_source = null;
CAN2.addEventListener("mousedown", e=>{
    let x = e.clientX / window.innerWidth;
    let y = e.clientY / window.innerWidth  + .5*(1. - window.innerHeight / window.innerWidth);
    let m = new THREE.Vector2(x*2.-1., y*2.-1.);

    if(receptor.distanceToSquared(m) < .01){
        selected_source = receptor;
        return;
    }

    for(let i=0; i<pointerCount; i++){
        let p = pointers[i];
        let d = p.distanceToSquared(m);
        if(d < .01){
            selected_source = p;
            return;
        }
    }
});
CAN2.addEventListener('mouseup', e=>{
    selected_source = null;
})

CAN2.addEventListener("mousemove", e=>{
    if(selected_source){
        let x = e.clientX / window.innerWidth;
        let y = e.clientY / window.innerWidth + .5*(1. - window.innerHeight / window.innerWidth);
        selected_source.x = x*2. - 1.;
        selected_source.y = y*2. - 1.;
    }
});


//overlays
let CTX2 = CAN2.getContext('2d');
function ovrl_etiquette(txt, p, color='red'){
    let x= (p.x*.5+.5)*CAN2.width;
    let y= (p.y*.5+.5)*CAN2.width + .5*(CAN2.height-CAN2.width);

    CTX2.fillStyle = 'rgba(255,255,255,.8)';
    CTX2.fillRect(x,y-13., CTX2.measureText(txt).width, 15.);
    CTX2.fillStyle = color;
    CTX2.fillText(txt, x, y);
}
function draw_overlay(time){
    CTX2.clearRect(0,0, CAN2.width, CAN2.height);
    CTX2.font = '15px Consolas';
    CTX2.fontWeight = 'bold';
    for(let i=0; i<pointerCount; i++){
        let p = pointers[i];
        ovrl_etiquette('P'+i, p);
    }

    //receptor
    ovrl_etiquette('R0', receptor, 'green')

    //graphs
    let gh = .01;

    let sum = 0.;
    CTX2.fillStyle = 'yellow';
    for(let i=0; i<pointerCount; i++){
        let p = pointers[i];
        let d = p.distanceTo(receptor);
        let v = Math.sin(d*opts_v['wave frequency'] - time*opts_v['propagation speed']) /(d*5.+1.);

        sum += v;

        CTX2.fillRect(
            .1*CAN2.width,
            CAN2.height*(.05 + i*gh),
            v*.1*CAN2.width,
            gh*CAN2.height,
            );
    }
    CTX2.fillStyle = 'red';
    CTX2.fillRect(
        .1*CAN2.width,
        CAN2.height*(.05 + (pointerCount)*gh),
        sum*.1*CAN2.width,
        gh*CAN2.height,
        );

    let H = (pointerCount+1) * gh;
    CTX2.fillStyle = 'black';
    CTX2.fillRect(
        .1*CAN2.width,
        .05*CAN2.height,
        3,
        H*CAN2.height,
        );
}

//animate
let last_time = 0.;
function animate() {
    var time = performance.now();
    let deltaTime = time - last_time;
    last_time = time;

    plane.material.uniforms.time.value = time * 0.005;
    plane.material.uniforms.propagation_speed.value = opts_v['propagation speed'];
    plane.material.uniforms.wave_frequency.value = opts_v['wave frequency'];
    plane.material.uniforms.pointerCount.value = pointerCount;

    
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    if(opts_v['water shader']){
        waterpass.material.uniforms.tPrevious.value = renderTarget.texture;
        renderer.render(waterpass.scene, waterpass.camera)
    }else{
        nowaterpass.material.uniforms.tPrevious.value = renderTarget.texture;
        renderer.render(nowaterpass.scene, nowaterpass.camera)
    }

    //overlay
    draw_overlay(time * 0.005);

	requestAnimationFrame( animate );
}
animate();