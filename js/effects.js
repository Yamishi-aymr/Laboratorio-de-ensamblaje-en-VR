
import * as THREE from 'three';

/**
 * Efectos visuales del laboratorio.
 */

export function createEffects(sceneData) {

    const { scene, targets, pieces } = sceneData;

    const activeEffects = [];

    let completed = false;


    // =====================================
    // PARTÍCULAS DE ÉXITO
    // =====================================

    function createParticles(position, color) {

        const count = 35;

        const positions = new Float32Array(count * 3);

        const velocities = [];

        for (let i = 0; i < count; i++) {

            positions[i * 3] = position.x;

            positions[i * 3 + 1] = position.y;

            positions[i * 3 + 2] = position.z;


            velocities.push(
                new THREE.Vector3(
                    (Math.random() - 0.5) * 1.8,
                    Math.random() * 2.2,
                    (Math.random() - 0.5) * 1.8
                )
            );

        }


        const geometry = new THREE.BufferGeometry();

        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3)
        );


        const material = new THREE.PointsMaterial({

            color,

            size: 0.045,

            transparent: true,

            opacity: 1,

            depthWrite: false

        });


        const particles = new THREE.Points(
            geometry,
            material
        );

        scene.add(particles);


        activeEffects.push({

            type: 'particles',

            object: particles,

            velocities,

            age: 0,

            duration: 1.1

        });

    }


    // =====================================
    // MARCAR PIEZA CORRECTA
    // =====================================

    function markSuccess(piece) {

        const target = targets.find(
            item => item.id === piece.id
        );

        if (!target) {
            return;
        }


        // Cambiar color del destino.
        target.ring.material.color.set(0x24E6A3);

        target.base.material.color.set(0x24E6A3);

        target.base.material.emissive.set(0x24E6A3);

        target.base.material.emissiveIntensity = 1.5;


        // Animación de expansión.
        activeEffects.push({

            type: 'ring',

            object: target.ring,

            age: 0,

            duration: 0.65

        });


        // Partículas.
        createParticles(
            target.position,
            0x24E6A3
        );


        // Resaltar pieza.
        piece.mesh.material.emissiveIntensity = 0.55;

    }


    // =====================================
    // EFECTO DE ERROR
    // =====================================

    function showError(position) {

        const geometry = new THREE.TorusGeometry(
            0.32,
            0.025,
            8,
            32
        );

        const material = new THREE.MeshBasicMaterial({

            color: 0xFF5577,

            transparent: true,

            opacity: 1

        });


        const ring = new THREE.Mesh(
            geometry,
            material
        );

        ring.position.copy(position);

        ring.rotation.x = Math.PI / 2;

        scene.add(ring);


        activeEffects.push({

            type: 'error',

            object: ring,

            age: 0,

            duration: 0.65

        });

    }


    // =====================================
    // CELEBRACIÓN FINAL
    // =====================================

    function showCompletion() {

        if (completed) {
            return;
        }

        completed = true;


        pieces.forEach(piece => {

            createParticles(
                piece.object.position,
                0x24E6A3
            );

        });


        console.log(
            '¡Todos los objetos han sido ensamblados!'
        );

    }


    // =====================================
    // ACTUALIZAR ANIMACIONES
    // =====================================

    function update(deltaTime) {

        for (
            let i = activeEffects.length - 1;
            i >= 0;
            i--
        ) {

            const effect = activeEffects[i];

            effect.age += deltaTime;

            const progress = Math.min(
                effect.age / effect.duration,
                1
            );


            // =================================
            // PARTÍCULAS
            // =================================

            if (effect.type === 'particles') {

                const positions =
                    effect.object.geometry.attributes.position;

                for (
                    let j = 0;
                    j < effect.velocities.length;
                    j++
                ) {

                    const velocity = effect.velocities[j];

                    velocity.y -= 2.5 * deltaTime;


                    positions.array[j * 3] +=
                        velocity.x * deltaTime;

                    positions.array[j * 3 + 1] +=
                        velocity.y * deltaTime;

                    positions.array[j * 3 + 2] +=
                        velocity.z * deltaTime;

                }

                positions.needsUpdate = true;

                effect.object.material.opacity = 1 - progress;

            }


            // =================================
            // ARO
            // =================================

            if (effect.type === 'ring') {

                const scale = 1 + progress * 0.65;

                effect.object.scale.set(
                    scale,
                    scale,
                    scale
                );

                effect.object.material.opacity =
                    1 - progress;

            }


            // =================================
            // ERROR
            // =================================

            if (effect.type === 'error') {

                const scale = 1 + progress * 0.5;

                effect.object.scale.set(
                    scale,
                    scale,
                    scale
                );

                effect.object.material.opacity =
                    1 - progress;

            }


            // =================================
            // ELIMINAR EFECTOS TERMINADOS
            // =================================

            if (progress >= 1) {

                scene.remove(effect.object);

                effect.object.geometry.dispose();

                effect.object.material.dispose();

                activeEffects.splice(i, 1);

            }

        }

    }


    // =====================================
    // REINICIAR EFECTOS
    // =====================================

    function reset() {

        activeEffects.forEach(effect => {

            scene.remove(effect.object);

            effect.object.geometry.dispose();

            effect.object.material.dispose();

        });

        activeEffects.length = 0;

        completed = false;


        targets.forEach(target => {

            target.ring.material.color.set(
                target.object.children[0].material.color
            );

            target.ring.scale.set(1, 1, 1);

            target.ring.material.opacity = 0.95;


            target.base.material.emissiveIntensity = 0.45;

        });


        pieces.forEach(piece => {

            piece.mesh.material.emissiveIntensity = 0.12;

        });

    }


    // =====================================
    // LIBERAR RECURSOS
    // =====================================

    function dispose() {

        reset();

    }


    return {

        markSuccess,

        showError,

        showCompletion,

        update,

        reset,

        dispose

    };

}
