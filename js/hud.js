
import * as THREE from 'three';

/**
 * HUD tridimensional del laboratorio.
 * Los paneles son objetos reales dentro de la escena Three.js.
 */

export function createHUD(scene) {

    const group = new THREE.Group();

    group.name = 'LaboratoryHUD';

    const buttons = [];


    // =====================================
    // FUNCIONES PARA DIBUJAR TEXTURAS
    // =====================================

    function createCanvasTexture(drawFunction, width = 1024, height = 512) {

        const canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');

        drawFunction(context, width, height);

        const texture = new THREE.CanvasTexture(canvas);

        texture.colorSpace = THREE.SRGBColorSpace;

        texture.anisotropy = 4;

        return { canvas, context, texture };

    }


    function drawRoundedRect(ctx, x, y, width, height, radius, color) {

        ctx.beginPath();

        ctx.roundRect(x, y, width, height, radius);

        ctx.fillStyle = color;

        ctx.fill();

    }


    // =====================================
    // PANEL PRINCIPAL
    // =====================================

    const panelData = createCanvasTexture((ctx, width, height) => {

        drawRoundedRect(
            ctx,
            5,
            5,
            width - 10,
            height - 10,
            35,
            '#101A35'
        );

        // Borde
        ctx.strokeStyle = '#7865FF';

        ctx.lineWidth = 5;

        ctx.strokeRect(8, 8, width - 16, height - 16);


        // Título
        ctx.fillStyle = '#00D4FF';

        ctx.font = 'bold 43px Arial';

        ctx.fillText(
            'LABORATORIO VR',
            45,
            75
        );


        ctx.fillStyle = '#FFFFFF';

        ctx.font = 'bold 30px Arial';

        ctx.fillText(
            'ENSAMBLAJE 3D',
            45,
            120
        );

        ctx.strokeStyle = '#34466D';

        ctx.lineWidth = 2;

        ctx.beginPath();

        ctx.moveTo(45, 150);

        ctx.lineTo(975, 150);

        ctx.stroke();

    });


    const panelMaterial = new THREE.MeshBasicMaterial({
        map: panelData.texture,
        transparent: true,
        side: THREE.DoubleSide
    });


    const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 1.4),
        panelMaterial
    );

    panel.position.set(0, 0, 0);

    group.add(panel);


    // =====================================
    // ÁREA DINÁMICA DEL HUD
    // =====================================

    const statusData = createCanvasTexture((ctx, width, height) => {

        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#FFFFFF';

        ctx.font = 'bold 37px Arial';

        ctx.fillText('PROGRESO', 40, 75);

        ctx.fillText('TIEMPO', 550, 75);

        ctx.fillStyle = '#00D4FF';

        ctx.font = 'bold 65px Arial';

        ctx.fillText('0 / 5', 40, 165);

        ctx.fillText('00:00', 550, 165);

        ctx.fillStyle = '#24E6A3';

        ctx.font = '28px Arial';

        ctx.fillText('ESTADO: PREPARADO', 40, 235);

    }, 1024, 280);


    const statusMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.65, 0.72),
        new THREE.MeshBasicMaterial({
            map: statusData.texture,
            transparent: true,
            side: THREE.DoubleSide
        })
    );

    statusMesh.position.set(0, -0.28, 0.01);

    group.add(statusMesh);


    // =====================================
    // BOTONES 3D
    // =====================================

    function createButton(label, color, action, positionX) {

        const buttonData = createCanvasTexture((ctx, width, height) => {

            drawRoundedRect(
                ctx,
                5,
                5,
                width - 10,
                height - 10,
                25,
                color
            );

            ctx.fillStyle = '#FFFFFF';

            ctx.font = 'bold 40px Arial';

            ctx.textAlign = 'center';

            ctx.textBaseline = 'middle';

            ctx.fillText(
                label,
                width / 2,
                height / 2
            );

        }, 512, 160);


        const material = new THREE.MeshBasicMaterial({
            map: buttonData.texture,
            transparent: true,
            side: THREE.DoubleSide
        });


        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.95, 0.30),
            material
        );


        mesh.position.set(
            positionX,
            -0.79,
            0.025
        );


        mesh.userData = {
            type: 'hud-button',
            action,
            label
        };


        group.add(mesh);

        buttons.push(mesh);

        return mesh;

    }


    const restartButton = createButton(
        'REINICIAR',
        '#5746B8',
        'restart',
        -0.57
    );


    const exitButton = createButton(
        'SALIR DE VR',
        '#146C89',
        'exit',
        0.57
    );


    // =====================================
    // POSICIÓN DEL HUD
    // =====================================

    group.position.set(
        0,
        2.65,
        -3.8
    );

    group.scale.setScalar(1);

    scene.add(group);


    // =====================================
    // ACTUALIZAR INFORMACIÓN
    // =====================================

    function updateHUD({
        progress = 0,
        total = 5,
        time = '00:00',
        status = 'PREPARADO',
        message = ''
    } = {}) {

        const ctx = statusData.context;

        const width = statusData.canvas.width;
        const height = statusData.canvas.height;

        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#FFFFFF';

        ctx.font = 'bold 37px Arial';

        ctx.fillText('PROGRESO', 40, 75);

        ctx.fillText('TIEMPO', 550, 75);


        // Progreso
        ctx.fillStyle = '#00D4FF';

        ctx.font = 'bold 65px Arial';

        ctx.fillText(
            `${progress} / ${total}`,
            40,
            165
        );


        // Tiempo
        ctx.fillText(
            time,
            550,
            165
        );


        // Estado
        let statusColor = '#24E6A3';

        if (status === 'ERROR') {
            statusColor = '#FF5577';
        }

        if (status === 'COMPLETADO') {
            statusColor = '#24E6A3';
        }

        ctx.fillStyle = statusColor;

        ctx.font = 'bold 28px Arial';

        ctx.fillText(
            `ESTADO: ${status}`,
            40,
            235
        );


        // Mensaje
        if (message) {

            ctx.fillStyle = '#FFFFFF';

            ctx.font = '25px Arial';

            ctx.fillText(
                message.substring(0, 55),
                550,
                235
            );

        }


        statusData.texture.needsUpdate = true;

    }


    // =====================================
    // RESULTADO DEL MÓDULO
    // =====================================

    return {

        group,

        buttons,

        restartButton,

        exitButton,

        updateHUD,

        dispose() {

            scene.remove(group);

            panel.geometry.dispose();

            panel.material.dispose();

            statusMesh.geometry.dispose();

            statusMesh.material.dispose();

            buttons.forEach(button => {

                button.geometry.dispose();

                button.material.dispose();

            });

            panelData.texture.dispose();

            statusData.texture.dispose();

            buttons.forEach(button => {

                button.material.map.dispose();

            });

        }

    };

}
