function createPassScene(material){
    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera( -1, 1, -1, 1, 1, 10 );

    scene.background = new THREE.Color(.1, 0, 0);

    var geometry = new THREE.PlaneBufferGeometry( 2, 8, 1, 4 );

    var plane = new THREE.Mesh( geometry, material );
    scene.add( plane );

    camera.position.z = 5;

    return {scene, camera, material};
}