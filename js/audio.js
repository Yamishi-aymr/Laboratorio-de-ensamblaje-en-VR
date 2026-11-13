
/**
 * Sistema de audio del Laboratorio VR.
 * Genera sonidos mediante Web Audio API.
 */

export function createAudioSystem() {

    let audioContext = null;

    let masterVolume = 0.25;

    let enabled = true;


    // =====================================
    // INICIALIZAR AUDIO
    // =====================================

    function initialize() {

        if (audioContext) {
            return audioContext;
        }

        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) {

            console.warn(
                'Web Audio API no disponible.'
            );

            return null;

        }

        audioContext = new AudioContextClass();

        return audioContext;

    }


    // =====================================
    // ACTIVAR AUDIO
    // =====================================

    async function resume() {

        const context = initialize();

        if (!context) {
            return false;
        }

        if (context.state === 'suspended') {

            await context.resume();

        }

        return true;

    }


    // =====================================
    // GENERAR TONO
    // =====================================

    function playTone({
        frequency = 440,
        endFrequency = frequency,
        duration = 0.15,
        volume = 0.3,
        type = 'sine',
        delay = 0
    } = {}) {

        if (!enabled) {
            return;
        }

        const context = initialize();

        if (!context || context.state !== 'running') {
            return;
        }

        const oscillator = context.createOscillator();

        const gain = context.createGain();

        const startTime = context.currentTime + delay;

        const endTime = startTime + duration;


        oscillator.type = type;

        oscillator.frequency.setValueAtTime(
            frequency,
            startTime
        );

        oscillator.frequency.exponentialRampToValueAtTime(
            Math.max(1, endFrequency),
            endTime
        );


        gain.gain.setValueAtTime(
            0.0001,
            startTime
        );

        gain.gain.linearRampToValueAtTime(
            volume * masterVolume,
            startTime + 0.015
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            endTime
        );


        oscillator.connect(gain);

        gain.connect(context.destination);


        oscillator.start(startTime);

        oscillator.stop(endTime + 0.02);

    }


    // =====================================
    // SONIDO DE SELECCIÓN
    // =====================================

    function playSelect() {

        playTone({
            frequency: 650,
            endFrequency: 850,
            duration: 0.09,
            volume: 0.2,
            type: 'sine'
        });

    }


    // =====================================
    // SONIDO DE ÉXITO
    // =====================================

    function playSuccess() {

        playTone({
            frequency: 520,
            endFrequency: 720,
            duration: 0.16,
            volume: 0.4,
            type: 'sine'
        });

        playTone({
            frequency: 780,
            endFrequency: 1050,
            duration: 0.22,
            volume: 0.4,
            type: 'sine',
            delay: 0.13
        });

        playTone({
            frequency: 1040,
            endFrequency: 1250,
            duration: 0.28,
            volume: 0.35,
            type: 'sine',
            delay: 0.28
        });

    }


    // =====================================
    // SONIDO DE ERROR
    // =====================================

    function playError() {

        playTone({
            frequency: 260,
            endFrequency: 170,
            duration: 0.22,
            volume: 0.4,
            type: 'triangle'
        });

        playTone({
            frequency: 180,
            endFrequency: 120,
            duration: 0.20,
            volume: 0.25,
            type: 'triangle',
            delay: 0.16
        });

    }


    // =====================================
    // SONIDO DE FINALIZACIÓN
    // =====================================

    function playComplete() {

        const notes = [
            523,
            659,
            784,
            1047,
            1319
        ];

        notes.forEach((frequency, index) => {

            playTone({
                frequency,
                endFrequency: frequency * 1.12,
                duration: 0.35,
                volume: 0.35,
                type: 'sine',
                delay: index * 0.15
            });

        });

    }


    // =====================================
    // SONIDO DE REINICIO
    // =====================================

    function playReset() {

        playTone({
            frequency: 600,
            endFrequency: 300,
            duration: 0.25,
            volume: 0.25,
            type: 'sine'
        });

    }


    // =====================================
    // CONTROL DE VOLUMEN
    // =====================================

    function setVolume(value) {

        masterVolume = Math.max(
            0,
            Math.min(1, value)
        );

    }


    function setEnabled(value) {

        enabled = Boolean(value);

    }


    // =====================================
    // LIBERAR RECURSOS
    // =====================================

    function dispose() {

        if (audioContext) {

            audioContext.close();

            audioContext = null;

        }

    }


    return {

        initialize,

        resume,

        playSelect,

        playSuccess,

        playError,

        playComplete,

        playReset,

        setVolume,

        setEnabled,

        dispose

    };

}
