
import * as THREE from 'three';

/**
 * Escena principal del Laboratorio VR.
 * Contiene cinco piezas y cinco destinos identificables.
 */

export function createLaboratoryScene() {

    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x080D1B);

    scene.fog = new THREE.Fog(0x080D1B, 10, 25);


    // =====================================
    // CÁMARA
    // =====================================

    const camera = new THREE.PerspectiveCamera(
        65,
        1,
        0.1,
        100
    );

    camera.position.set(0, 2.8, 5.5);

    camera.lookAt(0, 1.1, -1.8);


    // =====================================
    // ILUMINACIÓN
    // =====================================

    scene.add(
        new THREE.HemisphereLight(
            0xC5D5FF,
            0x10152C,
            2
        )
    );

    const mainLight = new THREE.DirectionalLight(
        0xFFFFFF,
        2.5
    );

    mainLight.position.set(3, 7, 5);

    scene.add(mainLight);


    const blueLight = new THREE.PointLight(
        0x00CFFF,
        30,
        10
    );

    blueLight.position.set(-3, 3, -2);

    scene.add(blueLight);


    const purpleLight = new THREE.PointLight(
        0x7865FF,
        25,
        10
    );

    purpleLight.position.set(3, 3, -3);

    scene.add(purpleLight);


    // =====================================
    // PISO
    // =====================================

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.MeshStandardMaterial({
            color: 0x111A32,
            roughness: 0.8,
            metalness: 0.2
        })
    );

    floor.rotation.x = -Math.PI / 2;

    floor.position.y = 0;

    scene.add(floor);


    const grid = new THREE.GridHelper(
        30,
        30,
        0x263B70,
        0x172342
    );

    grid.position.y = 0.015;

    scene.add(grid);


    // =====================================
    // MESA
    // =====================================

    const table = new THREE.Group();

    const tableMaterial = new THREE.MeshStandardMaterial({
        color: 0x192747,
        metalness: 0.65,
        roughness: 0.35
    });

    const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 0.16, 2.5),
        tableMaterial
    );

    tableTop.position.set(0, 0.9, -1.8);

    table.add(tableTop);


    const legGeometry = new THREE.BoxGeometry(
        0.15,
        0.85,
        0.15
    );

    const legPositions = [
        [-2.35, 0.425, -2.85],
        [2.35, 0.425, -2.85],
        [-2.35, 0.425, -0.75],
        [2.35, 0.425, -0.75]
    ];

    legPositions.forEach(position => {

        const leg = new THREE.Mesh(
            legGeometry,
            tableMaterial
        );

        leg.position.set(...position);

        table.add(leg);

    });


    const tableBorder = new THREE.Mesh(
        new THREE.BoxGeometry(5.25, 0.035, 2.55),
        new THREE.MeshStandardMaterial({
            color: 0x00D4FF,
            emissive: 0x007799,
            emissiveIntensity: 1.5
        })
    );

    tableBorder.position.set(0, 0.82, -1.8);

    table.add(tableBorder);

    scene.add(table);


    // Superficie de trabajo: parte superior de la mesa.
    const TABLE_SURFACE_Y = 0.98;


    // =====================================
    // CONFIGURACIÓN DE LAS PIEZAS
    // =====================================

    const definitions = [
        {
            id: 'cubo',
            name: 'CUBO',
            color: 0x00CFFF,
            geometry: () => new THREE.BoxGeometry(
                0.48, 0.48, 0.48
            ),
            halfHeight: 0.24,
            x: -1.8
        },
        {
            id: 'esfera',
            name: 'ESFERA',
            color: 0xFF9D43,
            geometry: () => new THREE.SphereGeometry(
                0.27, 32, 24
            ),
            halfHeight: 0.27,
            x: -0.9
        },
        {
            id: 'cono',
            name: 'CONO',
            color: 0x24E6A3,
            geometry: () => new THREE.ConeGeometry(
                0.28, 0.55, 32
            ),
            halfHeight: 0.275,
            x: 0
        },
        {
            id: 'cilindro',
            name: 'CILINDRO',
            color: 0xB65CFF,
            geometry: () => new THREE.CylinderGeometry(
                0.25, 0.25, 0.5, 32
            ),
            halfHeight: 0.25,
            x: 0.9
        },
        {
            id: 'prisma',
            name: 'PRISMA',
            color: 0xFF5577,
            geometry: () => new THREE.CylinderGeometry(
                0.29, 0.29, 0.5, 3
            ),
            halfHeight: 0.25,
            x: 1.8
        }
    ];


    // =====================================
    // FUNCIONES AUXILIARES
    // =====================================

    function createLabel(text, color) {

        const canvas = document.createElement('canvas');

        canvas.width = 512;
        canvas.height = 128;

        const context = canvas.getContext('2d');

        context.clearRect(0, 0, 512, 128);

        context.fillStyle = '#FFFFFF';

        context.font = 'bold 48px Arial';

        context.textAlign = 'center';

        context.textBaseline = 'middle';

        context.shadowColor = `#${color.toString(16).padStart(6, '0')}`;

        context.shadowBlur = 18;

        context.fillText(text, 256, 64);


        const texture = new THREE.CanvasTexture(canvas);

        texture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const label = new THREE.Mesh(
            new THREE.PlaneGeometry(0.85, 0.21),
            material
        );

        label.userData.isDecoration = true;

        return label;

    }


    function createTargetShape(id, color) {

        let geometry;

        if (id === 'cubo') {
            geometry = new THREE.BoxGeometry(0.53, 0.035, 0.53);
        }

        if (id === 'esfera') {
            geometry = new THREE.CylinderGeometry(
                0.31, 0.31, 0.035, 40
            );
        }

        if (id === 'cono') {
            geometry = new THREE.ConeGeometry(
                0.34, 0.035, 3
            );
        }

        if (id === 'cilindro') {
            geometry = new THREE.CylinderGeometry(
                0.30, 0.30, 0.035, 32
            );
        }

        if (id === 'prisma') {
            geometry = new THREE.CylinderGeometry(
                0.34, 0.34, 0.035, 3
            );
        }

        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.45,
            metalness: 0.45,
            roughness: 0.35
        });

        return new THREE.Mesh(geometry, material);

    }


    // =====================================
    // CREACIÓN DE PIEZAS Y DESTINOS
    // =====================================

    const pieces = [];

    const targets = [];

    const selectableObjects = [];


    definitions.forEach((definition, index) => {

        const pieceGroup = new THREE.Group();

        pieceGroup.name = `piece-${definition.id}`;


        // Pieza manipulable
        const pieceMaterial = new THREE.MeshStandardMaterial({
            color: definition.color,
            metalness: 0.4,
            roughness: 0.28,
            emissive: definition.color,
            emissiveIntensity: 0.12
        });

        const mesh = new THREE.Mesh(
            definition.geometry(),
            pieceMaterial
        );

        mesh.castShadow = true;

        mesh.receiveShadow = true;

        mesh.userData = {
            id: definition.id,
            name: definition.name,
            type: 'piece',
            selectable: true
        };

        pieceGroup.add(mesh);


        // Posición inicial de la pieza
        pieceGroup.position.set(
            definition.x,
            TABLE_SURFACE_Y + definition.halfHeight,
            -1.15
        );

        scene.add(pieceGroup);


        // Etiqueta de la pieza
        const pieceLabel = createLabel(
            definition.name,
            definition.color
        );

        pieceLabel.position.set(
            0,
            definition.halfHeight + 0.19,
            0
        );

        pieceGroup.add(pieceLabel);


        // Información inicial
        const initialPosition = pieceGroup.position.clone();

        const initialQuaternion = pieceGroup.quaternion.clone();


        const piece = {
            id: definition.id,
            name: definition.name,
            object: pieceGroup,
            mesh,
            color: definition.color,
            halfHeight: definition.halfHeight,
            targetId: definition.id,
            initialPosition,
            initialQuaternion,
            state: 'available',
            locked: false
        };


        pieces.push(piece);

        selectableObjects.push(mesh);


        // =================================
        // DESTINO DE ENSAMBLAJE
        // =================================

        const targetGroup = new THREE.Group();

        targetGroup.name = `target-${definition.id}`;


        // Base
        const base = createTargetShape(
            definition.id,
            definition.color
        );

        base.position.y = 0.025;

        targetGroup.add(base);


        // Aro luminoso
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.34, 0.025, 12, 48),
            new THREE.MeshBasicMaterial({
                color: definition.color,
                transparent: true,
                opacity: 0.95
            })
        );

        ring.rotation.x = -Math.PI / 2;

        ring.position.y = 0.055;

        targetGroup.add(ring);


        // Etiqueta del destino
        const targetLabel = createLabel(
            `DESTINO ${String(index + 1).padStart(2, '0')}`,
            definition.color
        );

        targetLabel.position.set(
            0,
            0.27,
            0
        );

        targetGroup.add(targetLabel);


        // Posición del destino
        targetGroup.position.set(
            definition.x,
            TABLE_SURFACE_Y,
            -2.45
        );

        scene.add(targetGroup);


        const target = {
            id: definition.id,
            name: definition.name,
            object: targetGroup,
            ring,
            base,
            position: new THREE.Vector3(
                definition.x,
                TABLE_SURFACE_Y + definition.halfHeight,
                -2.45
            ),
            occupied: false
        };


        targets.push(target);

    });


    // =====================================
    // FONDO DEL LABORATORIO
    // =====================================

    const backWall = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 7),
        new THREE.MeshStandardMaterial({
            color: 0x101A35,
            roughness: 1
        })
    );

    backWall.position.set(0, 3.2, -5);

    scene.add(backWall);


    // =====================================
    // DEVOLVER ELEMENTOS
    // =====================================

    return {

        scene,

        camera,

        pieces,

        targets,

        selectableObjects,

        tableSurfaceY: TABLE_SURFACE_Y

    };

}
