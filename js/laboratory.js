
/**
 * Sistema central de reglas del laboratorio.
 *
 * Estados:
 * available  = disponible
 * selected   = seleccionada
 * moving     = en movimiento
 * placed     = colocada
 */

export function createLaboratory(sceneData, callbacks = {}) {

    const {
        pieces,
        targets
    } = sceneData;


    // =====================================
    // CONFIGURACIÓN
    // =====================================

    const CONFIG = {
        totalPieces: 5,
        snapTolerance: 0.22,
        errorDuration: 1200
    };


    // =====================================
    // ESTADO CENTRAL
    // =====================================

    const state = {

        progress: 0,

        total: CONFIG.totalPieces,

        elapsedSeconds: 0,

        status: 'PREPARADO',

        message: 'Esperando inicio',

        started: false,

        completed: false,

        selectedPieceId: null,

        errorUntil: 0

    };


    let timerInterval = null;


    // =====================================
    // FUNCIONES DE BÚSQUEDA
    // =====================================

    function getPiece(id) {

        return pieces.find(piece => piece.id === id);

    }


    function getTarget(id) {

        return targets.find(target => target.id === id);

    }


    // =====================================
    // NOTIFICAR CAMBIOS
    // =====================================

    function notify() {

        if (typeof callbacks.onUpdate === 'function') {

            callbacks.onUpdate(getState());

        }

    }


    function notifyError(message) {

        if (typeof callbacks.onError === 'function') {

            callbacks.onError(message);

        }

    }


    function getState() {

        return {

            progress: state.progress,

            total: state.total,

            elapsedSeconds: state.elapsedSeconds,

            time: formatTime(state.elapsedSeconds),

            status: state.status,

            message: state.message,

            started: state.started,

            completed: state.completed,

            selectedPieceId: state.selectedPieceId

        };

    }


    // =====================================
    // CRONÓMETRO
    // =====================================

    function formatTime(seconds) {

        const minutes = Math.floor(seconds / 60);

        const remainingSeconds = seconds % 60;

        return (
            String(minutes).padStart(2, '0') +
            ':' +
            String(remainingSeconds).padStart(2, '0')
        );

    }


    function startTimer() {

        if (timerInterval !== null || state.completed) {
            return;
        }

        state.started = true;

        state.status = 'ACTIVO';

        state.message = 'Ensambla las cinco piezas';


        timerInterval = setInterval(() => {

            if (state.completed) {
                return;
            }

            state.elapsedSeconds++;

            notify();

        }, 1000);


        notify();

    }


    function stopTimer() {

        if (timerInterval !== null) {

            clearInterval(timerInterval);

            timerInterval = null;

        }

    }


    // =====================================
    // INICIAR RETO
    // =====================================

    function start() {

        if (state.started || state.completed) {
            return false;
        }

        startTimer();

        return true;

    }


    // =====================================
    // SELECCIONAR PIEZA
    // =====================================

    function selectPiece(id) {

        const piece = getPiece(id);

        if (!piece) {
            return false;
        }

        if (state.completed || piece.locked) {
            return false;
        }

        if (
            state.selectedPieceId !== null &&
            state.selectedPieceId !== id
        ) {
            return false;
        }


        if (piece.state === 'available') {

            piece.state = 'selected';

        }


        state.selectedPieceId = id;

        start();

        state.status = 'ACTIVO';

        state.message = `${piece.name} seleccionada`;

        notify();

        return true;

    }


    // =====================================
    // INICIAR MOVIMIENTO
    // =====================================

    function beginMove(id) {

        const piece = getPiece(id);

        if (!piece || piece.locked) {
            return false;
        }

        if (state.selectedPieceId !== id) {
            return false;
        }


        piece.state = 'moving';

        state.status = 'ACTIVO';

        state.message = `Moviendo ${piece.name}`;

        notify();

        return true;

    }


    // =====================================
    // ACTUALIZAR POSICIÓN
    // =====================================

    function movePiece(id, position) {

        const piece = getPiece(id);

        if (!piece || piece.locked) {
            return false;
        }

        if (
            piece.state !== 'moving' ||
            state.selectedPieceId !== id
        ) {
            return false;
        }

        piece.object.position.copy(position);

        return true;

    }


    // =====================================
    // IDENTIFICAR DESTINO MÁS CERCANO
    // =====================================

    function findNearestTarget(position) {

        let nearestTarget = null;

        let minimumDistance = Infinity;


        targets.forEach(target => {

            const distance = position.distanceTo(
                target.position
            );

            if (distance < minimumDistance) {

                minimumDistance = distance;

                nearestTarget = target;

            }

        });


        return {
            target: nearestTarget,
            distance: minimumDistance
        };

    }


    // =====================================
    // ERROR DE COLOCACIÓN
    // =====================================

    function rejectPlacement(piece, message) {

        piece.state = 'available';

        state.selectedPieceId = null;

        state.status = 'ERROR';

        state.message = message;

        state.errorUntil = Date.now() + CONFIG.errorDuration;


        notifyError(message);

        notify();

        return {
            success: false,
            message
        };

    }


    // =====================================
    // LIBERAR Y VALIDAR
    // =====================================

    function releasePiece(id) {

        const piece = getPiece(id);

        if (!piece || piece.locked) {

            return {
                success: false,
                message: 'Pieza no disponible'
            };

        }

        if (state.selectedPieceId !== id) {

            return {
                success: false,
                message: 'La pieza no está seleccionada'
            };

        }

        if (piece.state !== 'moving') {

            return {
                success: false,
                message: 'La pieza no estaba en movimiento'
            };

        }


        // Buscar destino más cercano
        const result = findNearestTarget(
            piece.object.position
        );

        const nearestTarget = result.target;

        const distance = result.distance;


        // =================================
        // VALIDAR IDENTIDAD
        // =================================

        if (nearestTarget.id !== piece.targetId) {

            return rejectPlacement(
                piece,
                `Destino incorrecto para ${piece.name}`
            );

        }


        // =================================
        // VALIDAR DISTANCIA
        // =================================

        if (distance > CONFIG.snapTolerance) {

            return rejectPlacement(
                piece,
                `Acércate más al destino de ${piece.name}`
            );

        }


        // =================================
        // COMPROBAR DESTINO LIBRE
        // =================================

        if (nearestTarget.occupied) {

            return rejectPlacement(
                piece,
                'Este destino ya está ocupado'
            );

        }


        // =================================
        // SNAP TO TARGET
        // =================================

        piece.object.position.copy(
            nearestTarget.position
        );


        // Restaurar orientación original
        piece.object.quaternion.copy(
            piece.initialQuaternion
        );


        // Bloquear pieza
        piece.state = 'placed';

        piece.locked = true;

        nearestTarget.occupied = true;


        // =================================
        // ACTUALIZAR PROGRESO
        // =================================

        state.progress++;

        state.selectedPieceId = null;

        state.status = 'ACTIVO';

        state.message = `${piece.name} ensamblada correctamente`;


        // =================================
        // COMPLETAR RETO
        // =================================

        if (state.progress === state.total) {

            state.completed = true;

            state.status = 'COMPLETADO';

            state.message = '¡Laboratorio completado!';

            stopTimer();

            if (typeof callbacks.onComplete === 'function') {

                callbacks.onComplete({
                    progress: state.progress,
                    time: formatTime(state.elapsedSeconds),
                    elapsedSeconds: state.elapsedSeconds
                });

            }

        }


        // Sonido de confirmación
        if (typeof callbacks.onSuccess === 'function') {

            callbacks.onSuccess(piece);

        }


        notify();


        return {
            success: true,
            message: state.message,
            progress: state.progress,
            time: formatTime(state.elapsedSeconds)
        };

    }


    // =====================================
    // CANCELAR ARRASTRE
    // =====================================

    function cancelMove(id) {

        const piece = getPiece(id);

        if (!piece || piece.locked) {
            return false;
        }

        if (state.selectedPieceId !== id) {
            return false;
        }

        // Restaurar posición original
        piece.object.position.copy(
            piece.initialPosition
        );

        piece.object.quaternion.copy(
            piece.initialQuaternion
        );

        piece.state = 'available';

        state.selectedPieceId = null;

        state.status = state.started
            ? 'ACTIVO'
            : 'PREPARADO';

        state.message = 'Movimiento cancelado. Intenta nuevamente';

        notify();

        return true;

    }

    // =====================================
    // REINICIAR LABORATORIO
    // =====================================

    function reset() {

        stopTimer();


        // Restaurar piezas
        pieces.forEach(piece => {

            piece.object.position.copy(
                piece.initialPosition
            );

            piece.object.quaternion.copy(
                piece.initialQuaternion
            );

            piece.state = 'available';

            piece.locked = false;

        });


        // Liberar destinos
        targets.forEach(target => {

            target.occupied = false;

        });


        // Restaurar estado general
        state.progress = 0;

        state.elapsedSeconds = 0;

        state.status = 'PREPARADO';

        state.message = 'Laboratorio reiniciado';

        state.started = false;

        state.completed = false;

        state.selectedPieceId = null;

        state.errorUntil = 0;


        if (typeof callbacks.onReset === 'function') {

            callbacks.onReset();

        }


        notify();

        return true;

    }


    // =====================================
    // ACTUALIZACIÓN DE ESTADOS TEMPORALES
    // =====================================

    function update() {

        if (
            state.status === 'ERROR' &&
            Date.now() >= state.errorUntil
        ) {

            state.status = state.started
                ? 'ACTIVO'
                : 'PREPARADO';

            state.message = state.started
                ? 'Continúa con el ensamblaje'
                : 'Esperando inicio';

            notify();

        }

    }


    // =====================================
    // API PÚBLICA
    // =====================================

   return {
    start,
    selectPiece,
    beginMove,
    movePiece,
    releasePiece,
    cancelMove,
    reset,
    update,
    getState,
    formatTime,
    dispose() {
        stopTimer();
    }
};

}
