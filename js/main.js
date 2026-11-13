

import * as THREE from 'three';

import { VRButton } from 'three/addons/webxr/VRButton.js';

import { createLaboratoryScene } from './scene.js';

import { createHUD } from './hud.js';

import { createLaboratory } from './laboratory.js';

import { setupXRHands } from './xr.js';

import { createHandInteraction } from './interaction.js';

import { createAudioSystem } from './audio.js';

import { createEffects } from './effects.js';



// =============================================
// ELEMENTOS HTML
// =============================================

const container = document.getElementById('scene-container');

const loadingScreen = document.getElementById('loading-screen');

const compatibilityStatus = document.getElementById(
    'compatibility-status'
);

const errorMessage = document.getElementById('error-message');

const vrButtonContainer = document.getElementById(
    'vr-button-container'
);


// =============================================
// ESTADO PRINCIPAL
// =============================================

let renderer = null;

let laboratoryScene = null;

let hud = null;

let laboratoryLogic = null;

let xrHands = null;

let handInteraction = null;

let audio = null;

let effects = null;

let resizeObserver = null;

let previousFrameTime = 0;

let lastHandStatus = '';


// =============================================
// MENSAJES
// =============================================

function showStatus(message) {

    if (compatibilityStatus) {

        compatibilityStatus.textContent = message;

    }

}


function showError(message) {

    if (errorMessage) {

        errorMessage.textContent = message;

    }

    console.error('[Laboratorio VR]', message);

}


function hideLoading() {

    if (loadingScreen) {

        loadingScreen.classList.add('hidden');

    }

}


// =============================================
// ACTUALIZAR HUD
// =============================================

function updateInterface(state) {

    if (!hud) {
        return;
    }

    hud.updateHUD({

        progress: state.progress,

        total: state.total,

        time: state.time,

        status: state.status,

        message: state.message

    });

}


// =============================================
// ACTUALIZAR ESTADO DE LAS MANOS
// =============================================

function updateHandStatus() {

    if (!xrHands || !renderer.xr.isPresenting) {
        return;
    }

    const status = xrHands.getTrackingStatus();

    const signature = [

        status.leftHand,

        status.rightHand,

        status.totalDetected

    ].join('-');


    if (signature === lastHandStatus) {
        return;
    }

    lastHandStatus = signature;


    if (status.leftHand && status.rightHand) {

        showStatus(
            'Ambas manos detectadas. Puedes manipular las piezas.'
        );

    } else if (status.leftHand || status.rightHand) {

        showStatus(
            'Una mano detectada. Puedes comenzar a ensamblar.'
        );

    } else {

        showStatus(
            'VR activa. Esperando seguimiento de manos...'
        );

    }

}


// =============================================
// INICIALIZAR THREE.JS
// =============================================

function initializeThreeJS() {

    if (!container) {

        throw new Error(
            'No se encontró el contenedor scene-container.'
        );

    }


    if (!vrButtonContainer) {

        throw new Error(
            'No se encontró el contenedor vr-button-container.'
        );

    }


    // =================================
    // ESCENA PRINCIPAL
    // =================================

    laboratoryScene = createLaboratoryScene();


    // =================================
    // HUD TRIDIMENSIONAL
    // =================================

    hud = createHUD(
        laboratoryScene.scene
    );


    // =================================
    // SISTEMA DE AUDIO
    // =================================

    audio = createAudioSystem();


    // =================================
    // EFECTOS VISUALES
    // =================================

    effects = createEffects(
        laboratoryScene
    );


    // =================================
    // LÓGICA DEL LABORATORIO
    // =================================

    laboratoryLogic = createLaboratory(

        laboratoryScene,

        {

            // Actualización de progreso y cronómetro.
            onUpdate: updateInterface,


            // Error de colocación.
            onError: (message) => {

                console.warn(
                    '[Ensamblaje] Error:',
                    message
                );

                audio.playError();

            },


            // Pieza colocada correctamente.
            onSuccess: (piece) => {

                console.log(
                    `${piece.name} ensamblada correctamente.`
                );

                audio.playSuccess();

                effects.markSuccess(piece);

            },


            // Completar las cinco piezas.
            onComplete: (result) => {

                console.log(
                    'LABORATORIO COMPLETADO',
                    result
                );

                audio.playComplete();

                effects.showCompletion();

            },


            // Reiniciar laboratorio.
            onReset: () => {

                console.log(
                    'Laboratorio reiniciado.'
                );

                audio.playReset();

                effects.reset();

            }

        }

    );


    // Estado inicial.
    updateInterface(
        laboratoryLogic.getState()
    );


    // =================================
    // RENDERIZADOR WEBGL
    // =================================

    renderer = new THREE.WebGLRenderer({

        antialias: true,

        alpha: false,

        powerPreference: 'high-performance'

    });


    // Resolución moderada para dispositivos móviles.
    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio || 1,
            1.5
        )
    );


    renderer.setSize(

        container.clientWidth,

        container.clientHeight

    );


    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure = 1.1;


    // Habilitar WebXR.
    renderer.xr.enabled = true;

    // =================================
    // OPTIMIZACIÓN PARA META QUEST 3
    // =================================

    // Referencia espacial basada en el suelo.
    renderer.xr.setReferenceSpaceType('local-floor');

    // Reducir ligeramente la resolución del framebuffer XR.
    // Esto ayuda a equilibrar calidad y rendimiento.
    if (
        typeof renderer.xr.setFramebufferScaleFactor === 'function'
    ) {
        renderer.xr.setFramebufferScaleFactor(0.9);
    }

    // Foveated rendering: optimización de resolución periférica.
    if (
        typeof renderer.xr.setFoveation === 'function'
    ) {
        renderer.xr.setFoveation(0.5);
    }

    // Insertar canvas.
    container.appendChild(
        renderer.domElement
    );


    // =================================
    // CONFIGURAR SEGUIMIENTO DE MANOS
    // =================================

    xrHands = setupXRHands(

        renderer,

        laboratoryScene.scene

    );


    // =================================
    // CONFIGURAR INTERACCIÓN
    // =================================

    handInteraction = createHandInteraction({

        renderer,

        scene: laboratoryScene.scene,

        hands: xrHands.hands,

        pieces: laboratoryScene.pieces,

        selectableObjects:
            laboratoryScene.selectableObjects,

        hud,

        laboratory: laboratoryLogic,

        onHandStatus: (status) => {

            // Información disponible para futuras
            // indicaciones visuales de cada mano.

        }

    });


    // =================================
    // EVENTOS WEBXR
    // =================================

    renderer.xr.addEventListener(

        'sessionstart',

        handleSessionStart

    );


    renderer.xr.addEventListener(

        'sessionend',

        handleSessionEnd

    );


    // =================================
    // REDIMENSIONAMIENTO
    // =================================

    resizeObserver = new ResizeObserver(() => {

        resizeScene();

    });


    resizeObserver.observe(container);


    // =================================
    // CICLO DE ANIMACIÓN
    // =================================

    renderer.setAnimationLoop((time) => {

        // Calcular deltaTime.
        const deltaTime = previousFrameTime

            ? Math.min(
                (time - previousFrameTime) / 1000,
                0.05
            )

            : 0;


        previousFrameTime = time;


        // Actualizar interacción.
        if (handInteraction) {

            handInteraction.update();

        }


        // Actualizar estados del laboratorio.
        if (laboratoryLogic) {

            laboratoryLogic.update();

        }


        // Actualizar efectos visuales.
        if (effects) {

            effects.update(deltaTime);

        }


        // Actualizar seguimiento.
        updateHandStatus();


        // Renderizar escena.
        renderer.render(

            laboratoryScene.scene,

            laboratoryScene.camera

        );

    });


    hideLoading();


    console.log('====================================');

    console.log('LABORATORIO VR INICIALIZADO');

    console.log(
        'Piezas:',
        laboratoryScene.pieces.length
    );

    console.log(
        'Destinos:',
        laboratoryScene.targets.length
    );

    console.log(
        'Manos WebXR:',
        xrHands.hands.length
    );

    console.log(
        'Interacción por pinza: preparada'
    );

    console.log(
        'Audio: preparado'
    );

    console.log(
        'Efectos visuales: preparados'
    );

    console.log('====================================');

}


// =============================================
// REDIMENSIONAR ESCENA
// =============================================

function resizeScene() {

    if (
        !renderer ||
        !laboratoryScene ||
        !container
    ) {

        return;

    }


    const width = container.clientWidth;

    const height = container.clientHeight;


    if (!width || !height) {
        return;
    }


    laboratoryScene.camera.aspect =
        width / height;


    laboratoryScene.camera.updateProjectionMatrix();


    renderer.setSize(

        width,

        height,

        false

    );

}


// =============================================
// COMPROBAR COMPATIBILIDAD WEBXR
// =============================================

async function checkXRCompatibility() {

    showStatus(
        'Comprobando compatibilidad WebXR...'
    );


    // Verificar HTTPS o localhost.
    if (!window.isSecureContext) {

        showStatus(
            'Se requiere HTTPS o localhost.'
        );

        showError(
            'Abre la aplicación mediante Live Server o HTTPS.'
        );

        return;

    }


    // Comprobar WebXR.
    if (!navigator.xr) {

        showStatus(
            'Vista 3D disponible. WebXR no está disponible en este navegador.'
        );

        return;

    }


    try {

        const supported = await navigator.xr.isSessionSupported(

            'immersive-vr'

        );


        if (!supported) {

            showStatus(
                'Vista 3D disponible. Se requiere un visor compatible con immersive-vr.'
            );

            return;

        }


        // Evitar duplicar el botón.
        if (
            vrButtonContainer.querySelector('button')
        ) {

            return;

        }


        // Crear botón de entrada VR.
        const vrButton = VRButton.createButton(

            renderer,

            {

                optionalFeatures: [

                    'hand-tracking'

                ]

            }

        );


        vrButtonContainer.appendChild(
            vrButton
        );


        showStatus(
            'WebXR disponible. Preparado para Meta Quest 3.'
        );


        console.log(
            'Soporte immersive-vr disponible.'
        );


    } catch (error) {

        showStatus(
            'No fue posible comprobar la compatibilidad WebXR.'
        );

        showError(error.message);

    }

}


// =============================================
// INICIO DE SESIÓN VR
// =============================================

function handleSessionStart() {

    lastHandStatus = '';


    // Activar audio.
    if (audio) {

        audio.resume().catch(error => {

            console.warn(
                'No fue posible activar el audio:',
                error
            );

        });

    }


    showStatus(
        'Sesión VR activa. Inicializando seguimiento de manos...'
    );


    console.log(
        'Sesión WebXR iniciada.'
    );

}


// =============================================
// FINALIZAR SESIÓN VR
// =============================================

function handleSessionEnd() {

    // Cancelar cualquier manipulación pendiente.
    if (handInteraction) {

        handInteraction.cancelAll();

    }


    lastHandStatus = '';

    previousFrameTime = 0;


    showStatus(
        'Sesión VR finalizada. El laboratorio sigue disponible.'
    );


    console.log(
        'Sesión WebXR finalizada.'
    );

}


// =============================================
// INICIALIZACIÓN PRINCIPAL
// =============================================

async function startApplication() {

    try {

        initializeThreeJS();

        await checkXRCompatibility();

    } catch (error) {

        showStatus(
            'No fue posible iniciar el laboratorio.'
        );

        showError(error.message);

        hideLoading();

    }

}


// =============================================
// INICIAR APLICACIÓN
// =============================================

startApplication();


// =============================================
// LIMPIEZA DE RECURSOS
// =============================================

window.addEventListener('pagehide', () => {

    console.log(
        'Liberando recursos del Laboratorio VR...'
    );


    // Interacción.
    if (handInteraction) {

        handInteraction.dispose();

    }


    // Seguimiento de manos.
    if (xrHands) {

        xrHands.dispose();

    }


    // Lógica del laboratorio.
    if (laboratoryLogic) {

        laboratoryLogic.dispose();

    }


    // Efectos.
    if (effects) {

        effects.dispose();

    }


    // Audio.
    if (audio) {

        audio.dispose();

    }


    // HUD.
    if (hud) {

        hud.dispose();

    }


    // Observador de tamaño.
    if (resizeObserver) {

        resizeObserver.disconnect();

    }


    // Renderizador.
    if (renderer) {

        renderer.setAnimationLoop(null);

        renderer.dispose();

    }


    console.log(
        'Recursos liberados correctamente.'
    );

});
