
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

/**
 * Seguimiento de manos para Meta Quest 3.
 * Utiliza las articulaciones reales de WebXR.
 */

export function setupXRHands(renderer, scene) {

    const handModelFactory = new XRHandModelFactory();

    const hands = [];

    let session = null;

    let inputSourcesHandler = null;


    // =====================================
    // CREAR AMBAS MANOS
    // =====================================

    for (let index = 0; index < 2; index++) {

        const hand = renderer.xr.getHand(index);

        hand.name = index === 0
            ? 'XR-Hand-Left'
            : 'XR-Hand-Right';

        hand.userData.handIndex = index;

        hand.visible = false;


        const handModel = handModelFactory.createHandModel(
            hand,
            'spheres'
        );

        hand.add(handModel);

        scene.add(hand);

        hands.push(hand);

    }


    // =====================================
    // ACTUALIZAR FUENTES DE ENTRADA
    // =====================================

    function updateInputSources() {

        if (!session) {
            return;
        }

        const sources = Array.from(
            session.inputSources
        );


        // Limpiar estados anteriores.
        hands.forEach(hand => {

            hand.visible = false;

            hand.userData.trackingAvailable = false;

            hand.userData.handedness = null;

        });


        // Relacionar cada fuente con su XRHand.
        // El índice corresponde al índice de entrada de Three.js.
        sources.forEach((source, index) => {

            const hand = hands[index];

            if (!hand || !source.hand) {
                return;
            }

            hand.userData.handedness = source.handedness;

            hand.userData.trackingAvailable = true;

            hand.visible = true;

        });


        const detected = hands.filter(
            hand => hand.userData.trackingAvailable
        ).length;


        console.log(
            `[WebXR] Manos disponibles: ${detected}/2`
        );

    }


    // =====================================
    // INICIO DE SESIÓN
    // =====================================

    function handleSessionStart() {

        session = renderer.xr.getSession();

        if (!session) {
            return;
        }

        inputSourcesHandler = updateInputSources;

        session.addEventListener(
            'inputsourceschange',
            inputSourcesHandler
        );

        updateInputSources();

        console.log(
            '[WebXR] Seguimiento de manos inicializado.'
        );

    }


    // =====================================
    // FINALIZAR SESIÓN
    // =====================================

    function handleSessionEnd() {

        if (session && inputSourcesHandler) {

            session.removeEventListener(
                'inputsourceschange',
                inputSourcesHandler
            );

        }

        session = null;

        inputSourcesHandler = null;


        hands.forEach(hand => {

            hand.visible = false;

            hand.userData.trackingAvailable = false;

            hand.userData.handedness = null;

        });


        console.log(
            '[WebXR] Seguimiento de manos finalizado.'
        );

    }


    // =====================================
    // EVENTOS DEL RENDERIZADOR
    // =====================================

    renderer.xr.addEventListener(
        'sessionstart',
        handleSessionStart
    );

    renderer.xr.addEventListener(
        'sessionend',
        handleSessionEnd
    );


    // =====================================
    // COMPROBAR ARTICULACIONES
    // =====================================

    function isHandTracked(hand) {

        const indexTip =
            hand.joints?.['index-finger-tip'];

        const thumbTip =
            hand.joints?.['thumb-tip'];


        return Boolean(

            hand.visible &&

            hand.userData.trackingAvailable &&

            indexTip?.visible &&

            thumbTip?.visible

        );

    }


    // =====================================
    // CONSULTAR ESTADO
    // =====================================

    function getTrackingStatus() {

        return {

            sessionActive: renderer.xr.isPresenting,

            leftHand: hands.some(
                hand =>
                    hand.userData.handedness === 'left' &&
                    isHandTracked(hand)
            ),

            rightHand: hands.some(
                hand =>
                    hand.userData.handedness === 'right' &&
                    isHandTracked(hand)
            ),

            totalDetected: hands.filter(
                isHandTracked
            ).length

        };

    }


    // =====================================
    // LIBERAR RECURSOS
    // =====================================

    function dispose() {

        handleSessionEnd();


        renderer.xr.removeEventListener(
            'sessionstart',
            handleSessionStart
        );

        renderer.xr.removeEventListener(
            'sessionend',
            handleSessionEnd
        );


        hands.forEach(hand => {

            scene.remove(hand);

        });


        hands.length = 0;

        console.log(
            '[WebXR] Recursos de seguimiento liberados.'
        );

    }


    // =====================================
    // API PÚBLICA
    // =====================================

    return {

        hands,

        getTrackingStatus,

        dispose

    };

}
