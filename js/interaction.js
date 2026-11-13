
import * as THREE from 'three';

/**
 * Sistema de interacción mediante seguimiento de manos WebXR.
 *
 * Funciones:
 * - Raycasting.
 * - Detección de pinza.
 * - Selección de piezas.
 * - Arrastre tridimensional.
 * - Liberación y validación.
 * - Interacción con botones 3D.
 * - Control de ambas manos.
 * - Protección ante pérdida de seguimiento.
 */

export function createHandInteraction({
    renderer,
    scene,
    hands,
    pieces,
    selectableObjects,
    hud,
    laboratory,
    onHandStatus = () => {}
}) {

    // =====================================
    // CONFIGURACIÓN
    // =====================================

    const CONFIG = {

        pinchStart: 0.025,

        pinchEnd: 0.045,

        rayLength: 3.5,

        minX: -2.25,
        maxX: 2.25,

        minZ: -2.65,
        maxZ: -0.90,

        maxY: 2.5

    };


    // =====================================
    // RAYCASTING
    // =====================================

    const raycaster = new THREE.Raycaster();

    const rayOrigin = new THREE.Vector3();

    const rayDirection = new THREE.Vector3();

    const indexPosition = new THREE.Vector3();

    const thumbPosition = new THREE.Vector3();

    const indexIntermediatePosition = new THREE.Vector3();

    const grabOffset = new THREE.Vector3();

    const desiredPosition = new THREE.Vector3();

    const rayEnd = new THREE.Vector3();


    // =====================================
    // OBJETOS INTERACTIVOS
    // =====================================

    const interactiveObjects = [
        ...selectableObjects,
        ...(hud?.buttons ?? [])
    ];


    // =====================================
    // ESTADO DE LAS MANOS
    // =====================================

    let activeHandIndex = null;

    const handStates = hands.map(() => ({

        pinching: false,

        grab: null,

        hoveredObject: null,

        trackedLastFrame: false

    }));


    // =====================================
    // CREAR RAYOS
    // =====================================

    function createRay() {

        const geometry = new THREE.BufferGeometry();

        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(
                new Float32Array(6),
                3
            )
        );

        const material = new THREE.LineBasicMaterial({
            color: 0x00D4FF,
            transparent: true,
            opacity: 0.85
        });

        const line = new THREE.Line(
            geometry,
            material
        );

        line.frustumCulled = false;

        line.visible = false;

        scene.add(line);

        return line;

    }


    const rayLines = hands.map(() => createRay());


    // =====================================
    // CURSORES
    // =====================================

    function createCursor() {

        const cursor = new THREE.Mesh(
            new THREE.SphereGeometry(0.025, 12, 12),

            new THREE.MeshBasicMaterial({
                color: 0x00D4FF
            })
        );

        cursor.visible = false;

        scene.add(cursor);

        return cursor;

    }


    const cursors = hands.map(() => createCursor());


    // =====================================
    // RESALTAR OBJETOS
    // =====================================

    function setHover(object, active) {

        if (!object || !object.material) {
            return;
        }

        const material = object.material;

        if (!material.emissive) {
            return;
        }


        if (active) {

            if (
                object.userData.originalEmissive === undefined
            ) {

                object.userData.originalEmissive =
                    material.emissiveIntensity;

            }

            material.emissiveIntensity = 0.85;

        } else {

            if (
                object.userData.originalEmissive !== undefined
            ) {

                material.emissiveIntensity =
                    object.userData.originalEmissive;

            }

        }

    }


    // =====================================
    // OBTENER POSICIÓN DE ARTICULACIONES
    // =====================================

    function getJointPosition(hand, jointName, target) {

        const joint = hand.joints?.[jointName];

        if (!joint || !joint.visible) {
            return false;
        }

        joint.getWorldPosition(target);

        return (
            Number.isFinite(target.x) &&
            Number.isFinite(target.y) &&
            Number.isFinite(target.z)
        );

    }


    // =====================================
    // CANCELAR MANIPULACIÓN
    // =====================================

    function cancelHandGrab(handIndex) {

        const handState = handStates[handIndex];


        // Restaurar la pieza si estaba siendo arrastrada.
        if (handState.grab) {

            laboratory.cancelMove(
                handState.grab.pieceId
            );

            console.warn(
                'Manipulación cancelada por pérdida de seguimiento.'
            );

        }


        handState.grab = null;

        handState.pinching = false;

        handState.trackedLastFrame = false;


        // Liberar únicamente la mano propietaria.
        if (activeHandIndex === handIndex) {

            activeHandIndex = null;

        }


        // Restaurar resaltado.
        if (handState.hoveredObject) {

            setHover(
                handState.hoveredObject,
                false
            );

            handState.hoveredObject = null;

        }


        rayLines[handIndex].visible = false;

        cursors[handIndex].visible = false;

    }


    // =====================================
    // PROCESAR INICIO DE PINZA
    // =====================================

    function handlePinchStart(handIndex, handState, hit) {

        if (!hit) {
            return;
        }


        // Una sola mano puede controlar una pieza.
        if (
            activeHandIndex !== null &&
            activeHandIndex !== handIndex
        ) {

            return;

        }


        const object = hit.object;


        // =================================
        // BOTONES DEL HUD
        // =================================

        if (object.userData.type === 'hud-button') {

            const action = object.userData.action;


            if (action === 'restart') {

                laboratory.reset();

                console.log('Laboratorio reiniciado.');

            }


            if (action === 'exit') {

                const session = renderer.xr.getSession();

                if (session) {

                    session.end();

                }

            }

            return;

        }


        // =================================
        // IDENTIFICAR PIEZA
        // =================================

        if (object.userData.type !== 'piece') {
            return;
        }


        const pieceId = object.userData.id;

        const pieceData = pieces.find(
            item => item.id === pieceId
        );


        if (!pieceData) {
            return;
        }


        // No permitir manipular otra pieza
        // mientras exista una selección.
        const selectedId = laboratory.getState().selectedPieceId;

        if (
            selectedId !== null &&
            selectedId !== pieceId
        ) {

            return;

        }


        // =================================
        // SELECCIONAR
        // =================================

        if (!laboratory.selectPiece(pieceId)) {
            return;
        }


        // =================================
        // INICIAR MOVIMIENTO
        // =================================

        if (!laboratory.beginMove(pieceId)) {
            return;
        }


        // Obtener el grupo completo.
        const selectedPiece = pieceData.object;


        if (!selectedPiece) {

            laboratory.cancelMove(pieceId);

            return;

        }


        // =================================
        // GUARDAR PROPIETARIO
        // =================================

        activeHandIndex = handIndex;


        // =================================
        // COMPENSAR POSICIÓN
        // =================================

        selectedPiece.getWorldPosition(
            grabOffset
        );

        grabOffset.sub(indexPosition);


        handState.grab = {

            pieceId,

            object: selectedPiece,

            offset: grabOffset.clone()

        };


        console.log(
            `Pieza seleccionada: ${pieceId}`
        );

    }


    // =====================================
    // ACTUALIZAR ARRASTRE
    // =====================================

    function updateGrab(handState) {

        if (!handState.grab) {
            return;
        }


        const grab = handState.grab;

        const pieceData = pieces.find(
            item => item.id === grab.pieceId
        );


        if (!pieceData) {
            return;
        }


        // Seguir el dedo índice.
        desiredPosition
            .copy(indexPosition)
            .add(grab.offset);


        // Mantener la pieza sobre la mesa.
        const minimumY =
            0.98 + pieceData.halfHeight;


        // Limitar el espacio de movimiento.
        desiredPosition.x = THREE.MathUtils.clamp(
            desiredPosition.x,
            CONFIG.minX,
            CONFIG.maxX
        );


        desiredPosition.y = THREE.MathUtils.clamp(
            desiredPosition.y,
            minimumY,
            CONFIG.maxY
        );


        desiredPosition.z = THREE.MathUtils.clamp(
            desiredPosition.z,
            CONFIG.minZ,
            CONFIG.maxZ
        );


        // Aplicar posición mediante la lógica central.
        laboratory.movePiece(
            grab.pieceId,
            desiredPosition
        );

    }


    // =====================================
    // ACTUALIZAR RAYO
    // =====================================

    function updateRay(handIndex, handState) {

        rayOrigin.copy(indexPosition);


        // Dirección del dedo índice.
        rayDirection.subVectors(
            indexPosition,
            indexIntermediatePosition
        );


        if (rayDirection.lengthSq() < 0.000001) {
            return null;
        }


        rayDirection.normalize();


        raycaster.set(
            rayOrigin,
            rayDirection
        );

        raycaster.far = CONFIG.rayLength;


        // Detectar objetos interactivos.
        const intersections = raycaster.intersectObjects(
            interactiveObjects,
            false
        );


        const hit = intersections.length
            ? intersections[0]
            : null;


        // Calcular final del rayo.
        rayEnd
            .copy(rayOrigin)
            .addScaledVector(
                rayDirection,
                hit ? hit.distance : CONFIG.rayLength
            );


        // Actualizar línea.
        const line = rayLines[handIndex];

        const positions = line.geometry.attributes.position;


        positions.setXYZ(
            0,
            rayOrigin.x,
            rayOrigin.y,
            rayOrigin.z
        );


        positions.setXYZ(
            1,
            rayEnd.x,
            rayEnd.y,
            rayEnd.z
        );


        positions.needsUpdate = true;

        line.geometry.computeBoundingSphere();

        line.visible = true;


        // Actualizar cursor.
        const cursor = cursors[handIndex];

        cursor.visible = !!hit;


        if (hit) {

            cursor.position.copy(
                hit.point
            );

        }


        // =================================
        // RESALTAR OBJETO APUNTADO
        // =================================

        const nextHovered = hit?.object || null;


        if (handState.hoveredObject !== nextHovered) {

            setHover(
                handState.hoveredObject,
                false
            );

            setHover(
                nextHovered,
                true
            );

            handState.hoveredObject = nextHovered;

        }


        return hit;

    }


    // =====================================
    // ACTUALIZAR UNA MANO
    // =====================================

    function updateHand(handIndex) {

        const hand = hands[handIndex];

        const handState = handStates[handIndex];


        // Comprobar sesión y seguimiento.
        if (
            !renderer.xr.isPresenting ||
            !hand.visible
        ) {

            if (
                handState.trackedLastFrame ||
                handState.grab
            ) {

                cancelHandGrab(handIndex);

            }

            return;

        }


        // Obtener articulaciones.
        const hasIndex = getJointPosition(
            hand,
            'index-finger-tip',
            indexPosition
        );


        const hasThumb = getJointPosition(
            hand,
            'thumb-tip',
            thumbPosition
        );


        const hasIntermediate = getJointPosition(
            hand,
            'index-finger-phalanx-intermediate',
            indexIntermediatePosition
        );


        // Si falta tracking, cancelar manipulación.
        if (
            !hasIndex ||
            !hasThumb ||
            !hasIntermediate
        ) {

            cancelHandGrab(handIndex);

            return;

        }


        handState.trackedLastFrame = true;


        // Actualizar apuntado.
        const hit = updateRay(
            handIndex,
            handState
        );


        // =================================
        // DETECTAR GESTO DE PINZA
        // =================================

        const pinchDistance = indexPosition.distanceTo(
            thumbPosition
        );


        const pinchStarted =
            !handState.pinching &&
            pinchDistance <= CONFIG.pinchStart;


        const pinchReleased =
            handState.pinching &&
            pinchDistance >= CONFIG.pinchEnd;


        // =================================
        // COMENZAR PINZA
        // =================================

        if (pinchStarted) {

            handState.pinching = true;

            handlePinchStart(
                handIndex,
                handState,
                hit
            );

        }


        // =================================
        // MANTENER ARRASTRE
        // =================================

        if (
            handState.pinching &&
            handState.grab &&
            activeHandIndex === handIndex
        ) {

            updateGrab(handState);

        }


        // =================================
        // LIBERAR PIEZA
        // =================================

        if (pinchReleased) {

            if (handState.grab) {

                const result = laboratory.releasePiece(
                    handState.grab.pieceId
                );


                console.log(
                    '[Interacción]',
                    result.message
                );

            }


            handState.grab = null;

            handState.pinching = false;


            // Liberar el propietario.
            if (activeHandIndex === handIndex) {

                activeHandIndex = null;

            }

        }


        // Informar del estado de la mano.
        onHandStatus({

            index: handIndex,

            handedness: hand.userData.handedness,

            tracked: true,

            pinching: handState.pinching,

            grabbing: !!handState.grab

        });

    }


    // =====================================
    // ACTUALIZAR INTERACCIÓN
    // =====================================

    function update() {

        if (!renderer.xr.isPresenting) {
            return;
        }


        hands.forEach((hand, index) => {

            updateHand(index);

        });

    }


    // =====================================
    // CANCELAR TODAS LAS MANIPULACIONES
    // =====================================

    function cancelAll() {

        hands.forEach((hand, index) => {

            cancelHandGrab(index);

        });

        activeHandIndex = null;

    }


    // =====================================
    // LIBERAR RECURSOS
    // =====================================

    function dispose() {

        cancelAll();


        hands.forEach((hand, index) => {

            scene.remove(rayLines[index]);

            scene.remove(cursors[index]);


            rayLines[index].geometry.dispose();

            rayLines[index].material.dispose();


            cursors[index].geometry.dispose();

            cursors[index].material.dispose();

        });

    }


    // =====================================
    // API PÚBLICA
    // =====================================

    return {

        update,

        cancelAll,

        dispose

    };

}
