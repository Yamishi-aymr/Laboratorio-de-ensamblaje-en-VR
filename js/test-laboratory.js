
import { createLaboratory } from './laboratory.js';

/**
 * Pruebas automatizadas del sistema de ensamblaje.
 *
 * IMPORTANTE:
 * Este módulo es temporal y solo se utiliza
 * durante el desarrollo.
 */

export async function runLaboratoryIntegrationTests(sceneData) {

    console.log('====================================');

    console.log('INICIANDO PRUEBAS DE INTEGRACIÓN');

    console.log('====================================');


    const testLaboratory = createLaboratory(sceneData);

    const results = [];


    // =====================================
    // UTILIDAD DE PRUEBAS
    // =====================================

    function assertTest(name, condition) {

        results.push({

            prueba: name,

            resultado: condition ? 'CORRECTO' : 'ERROR'

        });

        if (!condition) {

            console.error('[TEST FALLIDO]', name);

            throw new Error(
                `Falló la prueba: ${name}`
            );

        }

        console.log('[TEST CORRECTO]', name);

    }


    // =====================================
    // EJECUTAR PRUEBAS
    // =====================================

    try {

        // ---------------------------------
        // PRUEBA 1: CINCO PIEZAS
        // ---------------------------------

        assertTest(
            'Existen cinco piezas',
            sceneData.pieces.length === 5
        );


        // ---------------------------------
        // PRUEBA 2: CINCO DESTINOS
        // ---------------------------------

        assertTest(
            'Existen cinco destinos',
            sceneData.targets.length === 5
        );


        // ---------------------------------
        // PRUEBA 3: ESTADO INICIAL
        // ---------------------------------

        assertTest(
            'El progreso comienza en 0/5',
            testLaboratory.getState().progress === 0
        );


        // ---------------------------------
        // PRUEBA 4: DESTINO INCORRECTO
        // ---------------------------------

        const firstPiece = sceneData.pieces[0];

        const wrongTarget = sceneData.targets[1];


        testLaboratory.selectPiece(firstPiece.id);

        testLaboratory.beginMove(firstPiece.id);


        testLaboratory.movePiece(
            firstPiece.id,
            wrongTarget.position
        );


        const wrongResult = testLaboratory.releasePiece(
            firstPiece.id
        );


        assertTest(
            'Rechaza un destino incorrecto',
            wrongResult.success === false
        );


        assertTest(
            'El destino incorrecto no aumenta el progreso',
            testLaboratory.getState().progress === 0
        );


        // ---------------------------------
        // PRUEBA 5: DESTINO CORRECTO
        // ---------------------------------

        testLaboratory.selectPiece(firstPiece.id);

        testLaboratory.beginMove(firstPiece.id);


        const firstTarget = sceneData.targets.find(
            target => target.id === firstPiece.targetId
        );


        testLaboratory.movePiece(
            firstPiece.id,
            firstTarget.position
        );


        const correctResult = testLaboratory.releasePiece(
            firstPiece.id
        );


        assertTest(
            'Acepta el destino correcto',
            correctResult.success === true
        );


        assertTest(
            'El progreso aumenta a 1/5',
            testLaboratory.getState().progress === 1
        );


        // ---------------------------------
        // PRUEBA 6: PIEZA BLOQUEADA
        // ---------------------------------

        assertTest(
            'La pieza colocada queda bloqueada',
            firstPiece.locked === true
        );


        // ---------------------------------
        // PRUEBA 7: CRONÓMETRO
        // ---------------------------------

        await new Promise(resolve => setTimeout(resolve, 1100));


        assertTest(
            'El cronómetro está funcionando',
            testLaboratory.getState().elapsedSeconds >= 1
        );


        assertTest(
            'El formato del cronómetro es correcto',
            testLaboratory.formatTime(125) === '02:05'
        );


        // ---------------------------------
        // PRUEBA 8: ENSAMBLAR LAS RESTANTES
        // ---------------------------------

        const remainingPieces = sceneData.pieces.slice(1);


        remainingPieces.forEach(piece => {

            const selected = testLaboratory.selectPiece(
                piece.id
            );

            const moving = testLaboratory.beginMove(
                piece.id
            );

            const target = sceneData.targets.find(
                item => item.id === piece.targetId
            );


            testLaboratory.movePiece(
                piece.id,
                target.position
            );


            const result = testLaboratory.releasePiece(
                piece.id
            );


            if (
                !selected ||
                !moving ||
                !result.success
            ) {

                throw new Error(
                    `No se pudo ensamblar ${piece.name}`
                );

            }

        });


        // ---------------------------------
        // PRUEBA 9: COMPLETAR EL RETO
        // ---------------------------------

        const finalState = testLaboratory.getState();


        assertTest(
            'Las cinco piezas fueron ensambladas',
            finalState.progress === 5
        );


        assertTest(
            'El laboratorio aparece como completado',
            finalState.completed === true
        );


        assertTest(
            'El estado final es COMPLETADO',
            finalState.status === 'COMPLETADO'
        );


        // ---------------------------------
        // PRUEBA 10: REINICIAR
        // ---------------------------------

        testLaboratory.reset();


        const resetState = testLaboratory.getState();


        assertTest(
            'El reinicio devuelve el progreso a 0',
            resetState.progress === 0
        );


        assertTest(
            'El reinicio restaura el cronómetro',
            resetState.elapsedSeconds === 0
        );


        assertTest(
            'El reinicio devuelve el estado a PREPARADO',
            resetState.status === 'PREPARADO'
        );


        assertTest(
            'Todas las piezas vuelven a estar disponibles',
            sceneData.pieces.every(
                piece =>
                    piece.state === 'available' &&
                    piece.locked === false
            )
        );


        assertTest(
            'Todos los destinos vuelven a estar libres',
            sceneData.targets.every(
                target => target.occupied === false
            )
        );


        // ---------------------------------
        // RESULTADO FINAL
        // ---------------------------------

        console.log('====================================');

        console.table(results);

        console.log(
            `PRUEBAS SUPERADAS: ${results.length}/${results.length}`
        );

        console.log(
            'TODAS LAS PRUEBAS FINALIZARON CORRECTAMENTE'
        );

        console.log('====================================');


        return {

            success: true,

            total: results.length,

            results

        };


    } catch (error) {

        console.error(
            'ERROR EN LAS PRUEBAS:',
            error
        );


        console.table(results);


        return {

            success: false,

            total: results.length,

            results,

            error: error.message

        };


    } finally {

        // Restaurar siempre la escena.
        testLaboratory.reset();

        testLaboratory.dispose();

    }

}
