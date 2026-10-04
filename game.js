/* ==========================================================================
   SUBWAY SURFERS: CITY RUNNER - CORE 3D GAME ENGINE
   Features: Classic Subway Track, Red/Blue Trains, Jake Runner, Inspector & Dog, Gold Coins
   ========================================================================== */

// --- Game Configuration & Constants ---
const CONFIG = {
    LANES: [-3.2, 0, 3.2],       // Left, Middle, Right lane X positions
    LANE_CHANGE_SPEED: 22,        // Speed of sliding between lanes
    BASE_SPEED: 28,               // Initial forward running speed
    MAX_SPEED: 85,                // Maximum speed cap
    SPEED_ACCEL: 0.35,            // Acceleration per second
    GRAVITY: -44,                 // Gravity pull
    JUMP_FORCE: 17.0,             // Jump initial velocity
    SUPER_JUMP_FORCE: 25.0,       // Super sneakers jump velocity
    SLIDE_DURATION: 0.8,          // Slide duration in seconds
    CHUNK_LENGTH: 80,             // Length of track segment
    VISIBLE_CHUNKS: 6,            // Number of track chunks in memory
    COIN_ROTATION_SPEED: 4.5,     // Gold coin spin speed
    JETPACK_ALTITUDE: 9.5,        // Y altitude during jetpack flight
    POWERUP_DURATION: 8.0,        // Seconds powerups last
    TRAIN_OPPOSITE_SPEED: 20      // Head-on speed of incoming subway trains
};

const GameState = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
};

class Game {
    constructor() {
        this.state = GameState.MENU;

        // Stats & Scoring
        this.score = 0;
        this.coins = 0;
        this.totalCoins = parseInt(localStorage.getItem('subway_total_coins') || '0');
        this.highScore = parseInt(localStorage.getItem('subway_highscore') || '0');
        this.multiplier = 1;
        this.hoverboardCount = parseInt(localStorage.getItem('subway_hoverboards') || '3');

        // Selected Character Skin
        this.equippedSkin = localStorage.getItem('subway_skin') || 'default';

        // Speed & Physics
        this.currentSpeed = CONFIG.BASE_SPEED;
        this.distanceRun = 0;

        // Player State
        this.currentLane = 1;
        this.playerPos = new THREE.Vector3(CONFIG.LANES[1], 0, 0);
        this.playerVelocityY = 0;
        this.isGrounded = true;
        this.isSliding = false;
        this.slideTimer = 0;
        this.hasHoverboard = false;
        this.hoverboardTimer = 0;
        this.stumbleState = false;
        this.stumbleTimer = 0;

        // Active Skills System
        this.skills = {
            dash: { charge: 1, cooldown: 0, duration: 0, maxDuration: 4.5 },
            timewarp: { charge: 1, cooldown: 0, duration: 0, maxDuration: 6.0 }
        };

        // Active Powerups
        this.activePowerups = {
            magnet: 0,
            jetpack: 0,
            sneakers: 0,
            multiplier: 0
        };

        // World Pools
        this.trackChunks = [];
        this.obstacles = [];
        this.coinsPool = [];
        this.powerupItems = [];
        this.skillOrbsPool = [];
        this.particles = [];
        this.speedLines = [];

        // Input Setup
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.spaceLastPressed = 0;
        this.mouseControlEnabled = true;

        // Clock
        this.clock = new THREE.Clock();

        this.initThree();
        this.buildWorld();
        this.buildPlayer();  // Jake Character Model
        this.buildChaser();  // Inspector & Pitbull Dog
        this.initParticleSystems();
        this.bindEvents();
        this.updateUI();

        this.animate();
    }

    // --------------------------------------------------------------------------
    // THREE.JS SCENE INITIALIZATION (CLASSIC SUBWAY DAYLIGHT)
    // --------------------------------------------------------------------------
    initThree() {
        this.container = document.getElementById('game-container');

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Bright Sunny Sky Blue
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.007);

        this.camera = new THREE.PerspectiveCamera(
            68,
            window.innerWidth / window.innerHeight,
            0.1,
            300
        );
        this.camera.position.set(0, 5, 8);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Ambient Sunlight
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
        this.scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.45);
        hemiLight.position.set(0, 50, 0);
        this.scene.add(hemiLight);

        // Directional Sun Light with Soft Shadows
        this.dirLight = new THREE.DirectionalLight(0xfffaed, 0.95);
        this.dirLight.position.set(20, 50, -20);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 1024;
        this.dirLight.shadow.mapSize.height = 1024;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 160;
        const d = 35;
        this.dirLight.shadow.camera.left = -d;
        this.dirLight.shadow.camera.right = d;
        this.dirLight.shadow.camera.top = d;
        this.dirLight.shadow.camera.bottom = -d;
        this.scene.add(this.dirLight);
    }

    // --------------------------------------------------------------------------
    // PARTICLE & GRAPHICS SYSTEMS
    // --------------------------------------------------------------------------
    initParticleSystems() {
        const lineGeo = new THREE.BufferGeometry();
        const lineCount = 60;
        const posArray = new Float32Array(lineCount * 6);

        for (let i = 0; i < lineCount; i++) {
            const x = (Math.random() - 0.5) * 30;
            const y = Math.random() * 12;
            const z = -Math.random() * 100;

            posArray[i * 6] = x;
            posArray[i * 6 + 1] = y;
            posArray[i * 6 + 2] = z;

            posArray[i * 6 + 3] = x;
            posArray[i * 6 + 4] = y;
            posArray[i * 6 + 5] = z - 6.0;
        }

        lineGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const lineMat = new THREE.LineBasicMaterial({
            color: 0xffd166,
            transparent: true,
            opacity: 0.65
        });

        this.speedLineMesh = new THREE.LineSegments(lineGeo, lineMat);
        this.scene.add(this.speedLineMesh);
    }

    spawnSparkParticles(pos, colorHex) {
        for (let i = 0; i < 12; i++) {
            const pGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
            const pMat = new THREE.MeshBasicMaterial({ color: colorHex });
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.copy(pos);
            
            p.userData = {
                vel: new THREE.Vector3(
                    (Math.random() - 0.5) * 8,
                    Math.random() * 6 + 2,
                    (Math.random() - 0.5) * 8
                ),
                life: 0.4
            };
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    updateParticles(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.position.addScaledVector(p.userData.vel, delta);
            p.userData.life -= delta;
            p.scale.multiplyScalar(0.92);

            if (p.userData.life <= 0) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
            }
        }

        if (this.speedLineMesh) {
            const positions = this.speedLineMesh.geometry.attributes.position.array;
            const lineCount = positions.length / 6;

            for (let i = 0; i < lineCount; i++) {
                positions[i * 6 + 2] += this.currentSpeed * 1.5 * delta;
                positions[i * 6 + 5] += this.currentSpeed * 1.5 * delta;

                if (positions[i * 6 + 2] > 10) {
                    const newZ = -Math.random() * 90 - 40;
                    positions[i * 6 + 2] = newZ;
                    positions[i * 6 + 5] = newZ - 6.0;
                }
            }
            this.speedLineMesh.geometry.attributes.position.needsUpdate = true;
        }
    }

    // --------------------------------------------------------------------------
    // CLASSIC SUBWAY ENVIRONMENT BUILDER
    // --------------------------------------------------------------------------
    buildWorld() {
        this.trackGroup = new THREE.Group();
        this.scene.add(this.trackGroup);

        for (let i = 0; i < CONFIG.VISIBLE_CHUNKS; i++) {
            this.spawnTrackChunk(i * -CONFIG.CHUNK_LENGTH);
        }
    }

    spawnTrackChunk(zPos) {
        const chunk = new THREE.Group();
        chunk.position.z = zPos;

        // Gravel Track Bed Ballast
        const groundGeo = new THREE.BoxGeometry(14, 0.4, CONFIG.CHUNK_LENGTH);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.95 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.position.y = -0.2;
        ground.receiveShadow = true;
        chunk.add(ground);

        // Red Brick Subway Corridor Side Walls
        const wallGeo = new THREE.BoxGeometry(1, 5, CONFIG.CHUNK_LENGTH);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b3a2b, roughness: 0.8 });
        
        const leftWall = new THREE.Mesh(wallGeo, wallMat);
        leftWall.position.set(-7.5, 2.3, 0);
        chunk.add(leftWall);

        const rightWall = new THREE.Mesh(wallGeo, wallMat);
        rightWall.position.set(7.5, 2.3, 0);
        chunk.add(rightWall);

        // Spray-Painted Graffiti Art Murals on Walls
        const stripeGeo = new THREE.BoxGeometry(0.12, 0.8, 12);
        const graffitiColors = [0xff4757, 0x2ed573, 0xffa502, 0x1e90ff, 0x9b59b6];
        for (let s = -30; s < 30; s += 18) {
            const gMat = new THREE.MeshBasicMaterial({ color: graffitiColors[Math.floor(Math.random() * graffitiColors.length)] });
            
            const stripeL = new THREE.Mesh(stripeGeo, gMat);
            stripeL.position.set(-6.9, 2.3, s);
            chunk.add(stripeL);

            const stripeR = new THREE.Mesh(stripeGeo, gMat);
            stripeR.position.set(6.9, 2.3, s);
            chunk.add(stripeR);
        }

        // Overhead Railway Cable Signal Gantry spanning across track
        const gantryGroup = new THREE.Group();
        gantryGroup.position.set(0, 0, -CONFIG.CHUNK_LENGTH / 2);

        const gantryPostGeo = new THREE.CylinderGeometry(0.15, 0.15, 6);
        const gantryMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.7 });

        const pL = new THREE.Mesh(gantryPostGeo, gantryMat);
        pL.position.set(-6.5, 3, 0);
        gantryGroup.add(pL);

        const pR = new THREE.Mesh(gantryPostGeo, gantryMat);
        pR.position.set(6.5, 3, 0);
        gantryGroup.add(pR);

        const beamGeo = new THREE.BoxGeometry(13.5, 0.3, 0.3);
        const beam = new THREE.Mesh(beamGeo, gantryMat);
        beam.position.set(0, 5.8, 0);
        gantryGroup.add(beam);

        chunk.add(gantryGroup);

        // 3 Sets of Steel Rails & Wooden Cross Ties
        CONFIG.LANES.forEach(x => {
            const railGeo = new THREE.BoxGeometry(0.12, 0.18, CONFIG.CHUNK_LENGTH);
            const railMat = new THREE.MeshStandardMaterial({ color: 0xc8d6e5, metalness: 0.85, roughness: 0.2 });

            const railL = new THREE.Mesh(railGeo, railMat);
            railL.position.set(x - 0.7, 0.09, 0);
            chunk.add(railL);

            const railR = new THREE.Mesh(railGeo, railMat);
            railR.position.set(x + 0.7, 0.09, 0);
            chunk.add(railR);

            const tieGeo = new THREE.BoxGeometry(1.8, 0.08, 0.4);
            const tieMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });

            for (let t = -CONFIG.CHUNK_LENGTH / 2; t < CONFIG.CHUNK_LENGTH / 2; t += 2.5) {
                const tie = new THREE.Mesh(tieGeo, tieMat);
                tie.position.set(x, 0.04, t);
                chunk.add(tie);
            }
        });

        this.trackGroup.add(chunk);
        this.trackChunks.push(chunk);

        if (zPos < -CONFIG.CHUNK_LENGTH * 1.2) {
            this.populateChunkContent(zPos);
        }
    }

    populateChunkContent(zPos) {
        const laneIndices = [0, 1, 2];
        const numObstacles = Math.floor(Math.random() * 2) + 2;

        for (let i = 0; i < numObstacles; i++) {
            const relZ = zPos - (i * 24 + Math.random() * 8);
            const laneIdx = laneIndices[Math.floor(Math.random() * laneIndices.length)];
            const laneX = CONFIG.LANES[laneIdx];

            const randType = Math.random();
            if (randType < 0.50) {
                // Classic Red/Blue Subway Passenger Train
                this.createClassicSubwayTrain(laneX, relZ - 40);
                this.spawnCoinsOnTrain(laneX, relZ - 40);
            } else if (randType < 0.78) {
                // Low Jumpable Wooden Hurdle or High Overhead Caution Sign
                const isHigh = Math.random() > 0.5;
                this.createHurdle(laneX, relZ, isHigh);
                this.spawnCoinsLine(laneX, relZ - 6, 4);
            } else {
                // Spinning Gold Coins + Powerup / Skill Orb
                this.spawnCoinsLine(laneX, relZ, 6);
                if (Math.random() < 0.35) {
                    this.spawnSkillOrb(laneX, relZ - 14);
                } else if (Math.random() < 0.3) {
                    this.spawnPowerup(laneX, relZ - 12);
                }
            }
        }
    }

    // --------------------------------------------------------------------------
    // CLASSIC SUBWAY TRAIN (RED & BLUE PASSENGER CAR WITH FRONT RAMP)
    // --------------------------------------------------------------------------
    createClassicSubwayTrain(x, z) {
        const train = new THREE.Group();
        train.position.set(x, 0, z);

        const trainLength = 15;
        const trainHeight = 3.4;
        const trainWidth = 2.4;

        // Classic Subway Train Red/Blue Metallic Body
        const isRed = x === 0 || Math.random() > 0.5;
        const trainColor = isRed ? 0xe74c3c : 0x2980b9;

        const bodyGeo = new THREE.BoxGeometry(trainWidth, trainHeight, trainLength);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: trainColor,
            roughness: 0.4,
            metalness: 0.3
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = trainHeight / 2 + 0.3;
        body.castShadow = true;
        body.receiveShadow = true;
        train.add(body);

        // Yellow Bumper Grill & Headlights at front (Facing Player)
        const grillGeo = new THREE.BoxGeometry(2.0, 1.2, 0.1);
        const grillMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.6 });
        const grill = new THREE.Mesh(grillGeo, grillMat);
        grill.position.set(0, 1.2, trainLength / 2 + 0.06);
        train.add(grill);

        const lightGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff200 });
        
        const lightL = new THREE.Mesh(lightGeo, lightMat);
        lightL.rotation.x = Math.PI / 2;
        lightL.position.set(-0.7, 2.2, trainLength / 2 + 0.07);
        train.add(lightL);

        const lightR = lightL.clone();
        lightR.position.x = 0.7;
        train.add(lightR);

        // Corrugated Gray Roof Surface
        const roofGeo = new THREE.BoxGeometry(trainWidth - 0.2, 0.1, trainLength - 0.2);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = trainHeight + 0.35;
        train.add(roof);

        // Front Wooden Climbing Ramp leading onto roof!
        const rampGeo = new THREE.BoxGeometry(2.0, 0.2, 4.0);
        const rampMat = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.8 });
        const ramp = new THREE.Mesh(rampGeo, rampMat);
        ramp.rotation.x = -0.6;
        ramp.position.set(0, 1.1, trainLength / 2 + 1.8);
        train.add(ramp);

        train.userData = {
            type: 'train',
            isMoving: true,
            box: new THREE.Box3(),
            width: trainWidth,
            height: trainHeight,
            length: trainLength,
            speed: CONFIG.TRAIN_OPPOSITE_SPEED
        };

        this.scene.add(train);
        this.obstacles.push(train);
    }

    createHurdle(x, z, isHigh) {
        const hurdle = new THREE.Group();
        hurdle.position.set(x, 0, z);

        if (!isHigh) {
            // Low Wooden Construction Barrier (Jump over)
            const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2);
            const postMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
            
            const postL = new THREE.Mesh(postGeo, postMat);
            postL.position.set(-1.1, 0.6, 0);
            hurdle.add(postL);

            const postR = new THREE.Mesh(postGeo, postMat);
            postR.position.set(1.1, 0.6, 0);
            hurdle.add(postR);

            const boardGeo = new THREE.BoxGeometry(2.4, 0.5, 0.15);
            const boardMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
            const board = new THREE.Mesh(boardGeo, boardMat);
            board.position.set(0, 0.9, 0);
            hurdle.add(board);

            // Yellow Stripe Overlay
            const stripeGeo = new THREE.BoxGeometry(0.4, 0.52, 0.17);
            const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
            for (let s = -0.8; s <= 0.8; s += 0.8) {
                const stripe = new THREE.Mesh(stripeGeo, stripeMat);
                stripe.position.set(s, 0.9, 0);
                hurdle.add(stripe);
            }

            hurdle.userData = { type: 'hurdle_low', height: 1.15, width: 2.4, length: 0.4 };
        } else {
            // High Overhead Caution Sign (Slide under)
            const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.8);
            const postMat = new THREE.MeshStandardMaterial({ color: 0x34495e });

            const postL = new THREE.Mesh(postGeo, postMat);
            postL.position.set(-1.2, 1.9, 0);
            hurdle.add(postL);

            const postR = new THREE.Mesh(postGeo, postMat);
            postR.position.set(1.2, 1.9, 0);
            hurdle.add(postR);

            const signGeo = new THREE.BoxGeometry(2.6, 1.8, 0.15);
            const signMat = new THREE.MeshStandardMaterial({ color: 0xe67e22 });
            const sign = new THREE.Mesh(signGeo, signMat);
            sign.position.set(0, 2.9, 0);
            hurdle.add(sign);

            hurdle.userData = { type: 'hurdle_high', minY: 1.6, height: 3.8, width: 2.6, length: 0.4 };
        }

        this.scene.add(hurdle);
        this.obstacles.push(hurdle);
    }

    spawnCoinsLine(x, startZ, count) {
        for (let c = 0; c < count; c++) {
            this.createCoin(x, 1.1, startZ - c * 2.2);
        }
    }

    spawnCoinsOnTrain(x, trainZ) {
        for (let c = -5; c <= 5; c += 2.2) {
            this.createCoin(x, 3.9, trainZ + c);
        }
    }

    // Classic 3D Spinning Gold Coin
    createCoin(x, y, z) {
        const coinGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.12, 16);
        const coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.9,
            roughness: 0.1
        });
        const coin = new THREE.Mesh(coinGeo, coinMat);
        coin.rotation.x = Math.PI / 2;
        coin.position.set(x, y, z);
        coin.castShadow = true;

        this.scene.add(coin);
        this.coinsPool.push(coin);
    }

    spawnSkillOrb(x, z) {
        const skillTypes = ['dash', 'timewarp'];
        const type = skillTypes[Math.floor(Math.random() * skillTypes.length)];

        const orbGroup = new THREE.Group();
        orbGroup.position.set(x, 1.5, z);

        const orbGeo = new THREE.TorusKnotGeometry(0.4, 0.12, 32, 8);
        const color = type === 'dash' ? 0xffd166 : 0xff4757;
        const orbMat = new THREE.MeshBasicMaterial({ color: color });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orbGroup.add(orb);

        orbGroup.userData = { skillType: type };

        this.scene.add(orbGroup);
        this.skillOrbsPool.push(orbGroup);
    }

    spawnPowerup(x, z) {
        const types = ['magnet', 'jetpack', 'sneakers', 'multiplier'];
        const type = types[Math.floor(Math.random() * types.length)];

        const pGroup = new THREE.Group();
        pGroup.position.set(x, 1.4, z);

        const ringGeo = new THREE.TorusGeometry(0.65, 0.08, 12, 24);
        const colorMap = { magnet: 0x1e90ff, jetpack: 0xff4757, sneakers: 0x2ed573, multiplier: 0xffd166 };
        const ringMat = new THREE.MeshBasicMaterial({ color: colorMap[type] });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        pGroup.add(ring);

        const centerGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const centerMat = new THREE.MeshStandardMaterial({ color: colorMap[type] });
        const center = new THREE.Mesh(centerGeo, centerMat);
        pGroup.add(center);

        pGroup.userData = { type: type };

        this.scene.add(pGroup);
        this.powerupItems.push(pGroup);
    }

    // --------------------------------------------------------------------------
    // CLASSIC SUBWAY SURFERS JAKE & INSPECTOR POLICE MODELS
    // --------------------------------------------------------------------------
    buildPlayer() {
        this.playerGroup = new THREE.Group();

        let hoodieColor = 0xff4757; // Classic Red Hoodie
        let capColor = 0x2ed573;   // Green Cap

        if (this.equippedSkin === 'cyber') {
            hoodieColor = 0x1e90ff;
            capColor = 0xffd166;
        } else if (this.equippedSkin === 'ninja') {
            hoodieColor = 0x2c3e50;
            capColor = 0xe74c3c;
        }

        // Torso / White Hoodie & Denim Vest
        const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.5);
        const torsoMat = new THREE.MeshStandardMaterial({ color: hoodieColor, roughness: 0.6 });
        this.playerTorso = new THREE.Mesh(torsoGeo, torsoMat);
        this.playerTorso.position.y = 1.1;
        this.playerTorso.castShadow = true;
        this.playerGroup.add(this.playerTorso);

        // Denim Vest Front Stripe
        const vestGeo = new THREE.BoxGeometry(0.82, 0.9, 0.52);
        const vestMat = new THREE.MeshStandardMaterial({ color: 0x2980b9, roughness: 0.7 });
        const vest = new THREE.Mesh(vestGeo, vestMat);
        vest.position.y = 1.1;
        this.playerGroup.add(vest);

        // Head & Backwards Baseball Cap
        const headGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.8 });
        this.playerHead = new THREE.Mesh(headGeo, headMat);
        this.playerHead.position.set(0, 1.85, 0);
        this.playerHead.castShadow = true;
        this.playerGroup.add(this.playerHead);

        const capGeo = new THREE.BoxGeometry(0.6, 0.15, 0.7);
        const capMat = new THREE.MeshStandardMaterial({ color: capColor });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(0, 2.15, 0.05);
        this.playerGroup.add(cap);

        // Legs (Blue Jeans)
        const legGeo = new THREE.BoxGeometry(0.3, 0.7, 0.35);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.7 });

        this.legL = new THREE.Mesh(legGeo, legMat);
        this.legL.position.set(-0.25, 0.35, 0);
        this.legL.castShadow = true;
        this.playerGroup.add(this.legL);

        this.legR = new THREE.Mesh(legGeo, legMat);
        this.legR.position.set(0.25, 0.35, 0);
        this.legR.castShadow = true;
        this.playerGroup.add(this.legR);

        // Red Sneakers
        const shoeGeo = new THREE.BoxGeometry(0.32, 0.22, 0.5);
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
        shoeL.position.set(-0.25, 0.1, -0.08);
        this.playerGroup.add(shoeL);

        const shoeR = shoeL.clone();
        shoeR.position.x = 0.25;
        this.playerGroup.add(shoeR);

        // Hoverboard Skateboard Shield
        const boardGeo = new THREE.BoxGeometry(1.2, 0.12, 2.2);
        const boardMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff, metalness: 0.8 });
        this.hoverboardMesh = new THREE.Mesh(boardGeo, boardMat);
        this.hoverboardMesh.position.set(0, 0.06, 0);
        this.hoverboardMesh.visible = false;
        this.playerGroup.add(this.hoverboardMesh);

        // Jetpack Rocket Back Object
        const jetGeo = new THREE.BoxGeometry(0.6, 0.7, 0.3);
        const jetMat = new THREE.MeshStandardMaterial({ color: 0xff4757 });
        this.jetpackMesh = new THREE.Mesh(jetGeo, jetMat);
        this.jetpackMesh.position.set(0, 1.2, 0.35);
        this.jetpackMesh.visible = false;
        this.playerGroup.add(this.jetpackMesh);

        this.playerGroup.position.copy(this.playerPos);
        this.scene.add(this.playerGroup);
    }

    // Classic Police Inspector & Pitbull Dog
    buildChaser() {
        this.chaserGroup = new THREE.Group();

        // Inspector Chubby Torso & Navy Uniform
        const torsoGeo = new THREE.BoxGeometry(0.95, 1.15, 0.6);
        const torsoMat = new THREE.MeshStandardMaterial({ color: 0x1e3799, roughness: 0.6 });
        this.copTorso = new THREE.Mesh(torsoGeo, torsoMat);
        this.copTorso.position.y = 1.2;
        this.copTorso.castShadow = true;
        this.chaserGroup.add(this.copTorso);

        // Gold Police Badge
        const badgeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.62);
        const badgeMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
        const badge = new THREE.Mesh(badgeGeo, badgeMat);
        badge.position.set(-0.25, 1.4, 0);
        this.chaserGroup.add(badge);

        // Inspector Head & Cap
        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
        this.copHead = new THREE.Mesh(headGeo, headMat);
        this.copHead.position.set(0, 1.95, 0);
        this.chaserGroup.add(this.copHead);

        const hatGeo = new THREE.BoxGeometry(0.7, 0.25, 0.75);
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x0c2461 });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.set(0, 2.3, 0);
        this.chaserGroup.add(hat);

        // Articulated Legs
        const legGeo = new THREE.BoxGeometry(0.32, 0.75, 0.35);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x0c2461 });

        this.copLegL = new THREE.Mesh(legGeo, legMat);
        this.copLegL.position.set(-0.26, 0.4, 0);
        this.chaserGroup.add(this.copLegL);

        this.copLegR = new THREE.Mesh(legGeo, legMat);
        this.copLegR.position.set(0.26, 0.4, 0);
        this.chaserGroup.add(this.copLegR);

        // Pitbull Guard Dog
        const dogGroup = new THREE.Group();
        dogGroup.position.set(1.1, 0, 0.4);

        const dogBodyGeo = new THREE.BoxGeometry(0.55, 0.5, 0.95);
        const dogMat = new THREE.MeshStandardMaterial({ color: 0x78e08f });
        const dogBody = new THREE.Mesh(dogBodyGeo, dogMat);
        dogBody.position.y = 0.45;
        dogGroup.add(dogBody);

        const dogHeadGeo = new THREE.BoxGeometry(0.4, 0.4, 0.45);
        const dogHead = new THREE.Mesh(dogHeadGeo, dogMat);
        dogHead.position.set(0, 0.75, -0.35);
        dogGroup.add(dogHead);

        this.chaserGroup.add(dogGroup);

        this.chaserGroup.position.set(CONFIG.LANES[1], 0, 4.5);
        this.scene.add(this.chaserGroup);
    }

    // --------------------------------------------------------------------------
    // CONTROLS & EVENT BINDINGS
    // --------------------------------------------------------------------------
    bindEvents() {
        document.getElementById('btn-skill-dash').addEventListener('click', () => this.triggerSkill('dash'));
        document.getElementById('btn-skill-timewarp').addEventListener('click', () => this.triggerSkill('timewarp'));

        window.addEventListener('mousemove', (e) => {
            if (this.state !== GameState.PLAYING || !this.mouseControlEnabled) return;

            const screenWidth = window.innerWidth;
            const mouseX = e.clientX;

            let targetLane = 1;
            if (mouseX < screenWidth * 0.33) {
                targetLane = 0;
            } else if (mouseX > screenWidth * 0.66) {
                targetLane = 2;
            } else {
                targetLane = 1;
            }

            if (targetLane !== this.currentLane) {
                this.currentLane = targetLane;
                sounds.playLaneSwitch();
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (this.state !== GameState.PLAYING) return;
            if (e.button === 0) this.jump();
            else if (e.button === 2) this.slide();
        });

        window.addEventListener('contextmenu', (e) => {
            if (this.state === GameState.PLAYING) e.preventDefault();
        });

        window.addEventListener('wheel', (e) => {
            if (this.state !== GameState.PLAYING) return;
            if (e.deltaY < 0) this.jump();
            else if (e.deltaY > 0) this.slide();
        }, { passive: true });

        window.addEventListener('keydown', (e) => {
            if (this.state !== GameState.PLAYING) return;

            switch (e.code) {
                case 'KeyQ': this.triggerSkill('dash'); break;
                case 'KeyE': this.triggerSkill('timewarp'); break;
                case 'ArrowLeft': case 'KeyA': this.moveLane(-1); break;
                case 'ArrowRight': case 'KeyD': this.moveLane(1); break;
                case 'ArrowUp': case 'KeyW': this.jump(); break;
                case 'ArrowDown': case 'KeyS': this.slide(); break;
                case 'Space':
                    const now = performance.now();
                    if (now - this.spaceLastPressed < 350) this.activateHoverboard();
                    else this.jump();
                    this.spaceLastPressed = now;
                    break;
                case 'KeyP': case 'Escape': this.togglePause(); break;
            }
        });

        window.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            if (this.state !== GameState.PLAYING || !e.changedTouches.length) return;
            const deltaX = e.changedTouches[0].clientX - this.touchStartX;
            const deltaY = e.changedTouches[0].clientY - this.touchStartY;
            const threshold = 35;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX < -threshold) this.moveLane(-1);
                else if (deltaX > threshold) this.moveLane(1);
            } else {
                if (deltaY < -threshold) this.jump();
                else if (deltaY > threshold) this.slide();
            }
        }, { passive: true });

        document.getElementById('zone-left').addEventListener('click', () => this.moveLane(-1));
        document.getElementById('zone-right').addEventListener('click', () => this.moveLane(1));
        document.getElementById('zone-up').addEventListener('click', () => this.jump());
        document.getElementById('zone-down').addEventListener('click', () => this.slide());

        document.getElementById('btn-play').addEventListener('click', () => this.startGame());
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-restart').addEventListener('click', () => this.startGame());
        document.getElementById('btn-quit').addEventListener('click', () => this.showMenu());
        document.getElementById('btn-retry').addEventListener('click', () => this.startGame());
        document.getElementById('btn-go-home').addEventListener('click', () => this.showMenu());
        document.getElementById('btn-hoverboard').addEventListener('click', () => this.activateHoverboard());

        document.getElementById('btn-controls').addEventListener('click', () => {
            document.getElementById('modal-controls').classList.remove('hidden');
        });
        document.getElementById('btn-controls-close').addEventListener('click', () => {
            document.getElementById('modal-controls').classList.add('hidden');
        });

        document.getElementById('btn-shop').addEventListener('click', () => {
            this.updateShopUI();
            document.getElementById('menu-shop').classList.remove('hidden');
        });
        document.getElementById('btn-shop-back').addEventListener('click', () => {
            document.getElementById('menu-shop').classList.add('hidden');
        });

        document.querySelectorAll('.shop-item').forEach(item => {
            item.addEventListener('click', () => {
                const skin = item.dataset.skin;
                const cost = parseInt(item.dataset.cost || '0');

                if (item.classList.contains('active')) return;

                if (cost > 0) {
                    if (this.totalCoins >= cost) {
                        this.totalCoins -= cost;
                        localStorage.setItem('subway_total_coins', this.totalCoins);
                        item.removeAttribute('data-cost');
                        this.equipSkin(skin);
                    } else {
                        alert('Not enough Gold Coins to unlock this character outfit!');
                    }
                } else {
                    this.equipSkin(skin);
                }
            });
        });

        document.getElementById('btn-sound-toggle').addEventListener('click', () => {
            const enabled = sounds.toggleSound();
            const icon = document.getElementById('sound-icon');
            icon.className = enabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    triggerSkill(type) {
        if (this.state !== GameState.PLAYING) return;
        const s = this.skills[type];
        if (s && s.charge >= 1 && s.duration <= 0) {
            s.charge = 0;
            s.duration = s.maxDuration;
            sounds.playHoverboard();
            this.spawnSparkParticles(this.playerPos, 0xffd166);
        }
    }

    equipSkin(skin) {
        this.equippedSkin = skin;
        localStorage.setItem('subway_skin', skin);
        this.scene.remove(this.playerGroup);
        this.buildPlayer();
        this.updateShopUI();
    }

    updateShopUI() {
        document.getElementById('shop-coins').innerText = this.totalCoins;
        document.querySelectorAll('.shop-item').forEach(item => {
            const skin = item.dataset.skin;
            if (skin === this.equippedSkin) {
                item.classList.add('active');
                item.querySelector('.item-status, .item-price').outerHTML = '<div class="item-status">EQUIPPED</div>';
            } else {
                item.classList.remove('active');
            }
        });
    }

    // --------------------------------------------------------------------------
    // ACTION MECHANICS
    // --------------------------------------------------------------------------
    moveLane(direction) {
        const nextLane = this.currentLane + direction;
        if (nextLane >= 0 && nextLane <= 2) {
            this.currentLane = nextLane;
            sounds.playLaneSwitch();
        }
    }

    jump() {
        if (this.isGrounded && !this.isSliding) {
            const force = this.activePowerups.sneakers > 0 ? CONFIG.SUPER_JUMP_FORCE : CONFIG.JUMP_FORCE;
            this.playerVelocityY = force;
            this.isGrounded = false;
            sounds.playJump();
            this.spawnSparkParticles(this.playerPos, 0xffd166);
        }
    }

    slide() {
        if (!this.isSliding && this.activePowerups.jetpack <= 0) {
            this.isSliding = true;
            this.slideTimer = CONFIG.SLIDE_DURATION;
            
            if (!this.isGrounded) {
                this.playerVelocityY = -28;
            }

            sounds.playSlide();
        }
    }

    activateHoverboard() {
        if (!this.hasHoverboard && this.hoverboardCount > 0 && this.state === GameState.PLAYING) {
            this.hasHoverboard = true;
            this.hoverboardTimer = 10.0;
            this.hoverboardCount--;
            localStorage.setItem('subway_hoverboards', this.hoverboardCount);
            this.hoverboardMesh.visible = true;
            document.getElementById('hoverboard-count').innerText = this.hoverboardCount;
            sounds.playHoverboard();
        }
    }

    // --------------------------------------------------------------------------
    // GAME LOOP
    // --------------------------------------------------------------------------
    startGame() {
        this.state = GameState.PLAYING;
        this.score = 0;
        this.coins = 0;
        this.currentSpeed = CONFIG.BASE_SPEED;
        this.distanceRun = 0;
        this.currentLane = 1;
        this.playerPos.set(CONFIG.LANES[1], 0, 0);
        this.playerVelocityY = 0;
        this.isGrounded = true;
        this.isSliding = false;
        this.hasHoverboard = false;
        this.hoverboardMesh.visible = false;
        this.stumbleState = false;

        this.skills.dash.charge = 1;
        this.skills.dash.duration = 0;
        this.skills.timewarp.charge = 1;
        this.skills.timewarp.duration = 0;

        Object.keys(this.activePowerups).forEach(p => this.activePowerups[p] = 0);

        this.obstacles.forEach(o => this.scene.remove(o));
        this.coinsPool.forEach(c => this.scene.remove(c));
        this.powerupItems.forEach(p => this.scene.remove(p));
        this.skillOrbsPool.forEach(s => this.scene.remove(s));
        this.obstacles = [];
        this.coinsPool = [];
        this.powerupItems = [];
        this.skillOrbsPool = [];

        this.trackChunks.forEach(c => this.trackGroup.remove(c));
        this.trackChunks = [];
        for (let i = 0; i < CONFIG.VISIBLE_CHUNKS; i++) {
            this.spawnTrackChunk(i * -CONFIG.CHUNK_LENGTH);
        }

        document.querySelectorAll('.screen-overlay').forEach(el => el.classList.add('hidden'));
        document.getElementById('hud').classList.remove('hidden');

        sounds.playWhistle();
        sounds.startMusic();
    }

    togglePause() {
        if (this.state === GameState.PLAYING) {
            this.state = GameState.PAUSED;
            document.getElementById('menu-pause').classList.remove('hidden');
            sounds.stopMusic();
        } else if (this.state === GameState.PAUSED) {
            this.state = GameState.PLAYING;
            document.getElementById('menu-pause').classList.add('hidden');
            sounds.startMusic();
        }
    }

    showMenu() {
        this.state = GameState.MENU;
        document.querySelectorAll('.screen-overlay').forEach(el => el.classList.add('hidden'));
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('menu-start').classList.remove('hidden');

        this.updateUI();
        sounds.stopMusic();
    }

    triggerGameOver() {
        this.state = GameState.GAMEOVER;
        sounds.playHit();
        sounds.stopMusic();

        let isNewHigh = false;
        if (Math.floor(this.score) > this.highScore) {
            this.highScore = Math.floor(this.score);
            localStorage.setItem('subway_highscore', this.highScore);
            isNewHigh = true;
        }

        this.totalCoins += this.coins;
        localStorage.setItem('subway_total_coins', this.totalCoins);

        document.getElementById('go-score').innerText = Math.floor(this.score);
        document.getElementById('go-coins').innerText = '+' + this.coins;
        document.getElementById('go-highscore').innerText = this.highScore;

        const badge = document.getElementById('new-highscore-badge');
        if (isNewHigh) badge.classList.remove('hidden');
        else badge.classList.add('hidden');

        document.getElementById('hud').classList.add('hidden');
        document.getElementById('menu-gameover').classList.remove('hidden');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = Math.min(this.clock.getDelta(), 0.1);

        if (this.state === GameState.PLAYING) {
            this.updateGameplay(delta);
        } else if (this.state === GameState.MENU) {
            const time = Date.now() * 0.0008;
            this.camera.position.x = Math.sin(time) * 4;
            this.camera.position.z = 7 + Math.cos(time) * 2;
            this.camera.lookAt(0, 1.2, 0);
        }

        this.renderer.render(this.scene, this.camera);
    }

    updateGameplay(delta) {
        const scoreSpeedBonus = Math.sqrt(this.score) * 0.42 + (this.distanceRun / 350);
        const dashBoost = this.skills.dash.duration > 0 ? 25.0 : 0;
        this.currentSpeed = Math.min(CONFIG.MAX_SPEED, CONFIG.BASE_SPEED + scoreSpeedBonus + dashBoost);
        this.distanceRun += this.currentSpeed * delta;

        const multFactor = this.activePowerups.multiplier > 0 ? 2 : 1;
        this.score += this.currentSpeed * delta * multFactor;

        Object.keys(this.skills).forEach(sk => {
            const s = this.skills[sk];
            if (s.duration > 0) {
                s.duration -= delta;
            }
        });

        Object.keys(this.activePowerups).forEach(p => {
            if (this.activePowerups[p] > 0) {
                this.activePowerups[p] -= delta;
            }
        });

        if (this.hasHoverboard) {
            this.hoverboardTimer -= delta;
            if (this.hoverboardTimer <= 0) {
                this.hasHoverboard = false;
                this.hoverboardMesh.visible = false;
            }
        }

        const isJetpack = this.activePowerups.jetpack > 0;
        this.jetpackMesh.visible = isJetpack;
        const targetY = isJetpack ? CONFIG.JETPACK_ALTITUDE : 0;

        const targetX = CONFIG.LANES[this.currentLane];
        this.playerPos.x += (targetX - this.playerPos.x) * CONFIG.LANE_CHANGE_SPEED * delta;

        if (!isJetpack) {
            if (!this.isGrounded) {
                this.playerVelocityY += CONFIG.GRAVITY * delta;
                this.playerPos.y += this.playerVelocityY * delta;

                if (this.playerPos.y <= 0) {
                    this.playerPos.y = 0;
                    this.playerVelocityY = 0;
                    this.isGrounded = true;
                }
            } else {
                this.playerPos.y = 0;
            }
        } else {
            this.playerPos.y += (targetY - this.playerPos.y) * 5.0 * delta;
            this.playerVelocityY = 0;
            this.isGrounded = false;
        }

        if (this.isSliding) {
            this.slideTimer -= delta;
            this.playerTorso.scale.set(1, 0.5, 1);
            this.playerHead.position.y = 1.3;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
                this.playerTorso.scale.set(1, 1, 1);
                this.playerHead.position.y = 1.85;
            }
        }

        this.playerGroup.position.copy(this.playerPos);

        if (this.isGrounded && !this.isSliding) {
            const runCycle = Math.sin(Date.now() * 0.018 * (this.currentSpeed / 20));
            this.legL.rotation.x = runCycle * 0.7;
            this.legR.rotation.x = -runCycle * 0.7;
        } else {
            this.legL.rotation.x = 0;
            this.legR.rotation.x = 0;
        }

        // Inspector & Dog Chaser Position & Animation
        const chaserDistance = this.stumbleState ? 1.8 : 4.5;
        this.chaserGroup.position.x += (this.playerPos.x - this.chaserGroup.position.x) * 10 * delta;
        this.chaserGroup.position.z = this.playerPos.z + chaserDistance;
        this.chaserGroup.position.y = this.playerPos.y;

        const copRunCycle = Math.sin(Date.now() * 0.02 * (this.currentSpeed / 20));
        this.copLegL.rotation.x = copRunCycle * 0.8;
        this.copLegR.rotation.x = -copRunCycle * 0.8;

        if (this.stumbleState) {
            this.stumbleTimer -= delta;
            if (this.stumbleTimer <= 0) {
                this.stumbleState = false;
            }
        }

        const moveDist = this.currentSpeed * delta;
        this.trackChunks.forEach(chunk => {
            chunk.position.z += moveDist;
        });

        if (this.trackChunks[0].position.z > CONFIG.CHUNK_LENGTH) {
            const oldChunk = this.trackChunks.shift();
            this.trackGroup.remove(oldChunk);

            const lastZ = this.trackChunks[this.trackChunks.length - 1].position.z;
            this.spawnTrackChunk(lastZ - CONFIG.CHUNK_LENGTH);
        }

        this.updateParticles(delta);

        this.updateObstacles(moveDist, delta);
        this.updateSkillOrbs(moveDist, delta);
        this.updateCoins(moveDist, delta);
        this.updatePowerups(moveDist, delta);

        this.camera.position.x = this.playerPos.x * 0.4;
        this.camera.position.y = this.playerPos.y + 4.8;
        this.camera.position.z = this.playerPos.z + 7.5;
        this.camera.lookAt(this.playerPos.x * 0.5, this.playerPos.y + 1.6, this.playerPos.z - 10);

        this.updateUI();
    }

    // --------------------------------------------------------------------------
    // OBSTACLES & COLLISIONS
    // --------------------------------------------------------------------------
    updateObstacles(moveDist, delta) {
        const timeFactor = this.skills.timewarp.duration > 0 ? 0.3 : 1.0;
        const isDashActive = this.skills.dash.duration > 0;

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            
            obs.position.z += moveDist;
            if (obs.userData.isMoving) {
                obs.position.z += obs.userData.speed * timeFactor * delta;
            }

            if (obs.position.z > 15) {
                this.scene.remove(obs);
                this.obstacles.splice(i, 1);
                continue;
            }

            if (this.activePowerups.jetpack > 0 || isDashActive) continue;

            const px = this.playerPos.x;
            const py = this.playerPos.y;
            const pz = this.playerPos.z;

            const ox = obs.position.x;
            const oz = obs.position.z;
            const type = obs.userData.type;

            if (Math.abs(px - ox) < (obs.userData.width / 2 + 0.45)) {
                if (Math.abs(pz - oz) < (obs.userData.length / 2 + 0.4)) {
                    let collided = false;

                    if (type === 'train') {
                        const trainTopY = obs.userData.height + 0.3;
                        if (py >= trainTopY - 0.5 && this.playerVelocityY <= 0) {
                            this.playerPos.y = trainTopY;
                            this.playerVelocityY = 0;
                            this.isGrounded = true;
                        } else {
                            collided = true;
                        }
                    } else if (type === 'hurdle_low') {
                        if (py < obs.userData.height) {
                            collided = true;
                        }
                    } else if (type === 'hurdle_high') {
                        if (!this.isSliding || py > 0.2) {
                            collided = true;
                        }
                    }

                    if (collided) {
                        this.handleCollision(obs);
                    }
                }
            }
        }
    }

    updateSkillOrbs(moveDist, delta) {
        for (let i = this.skillOrbsPool.length - 1; i >= 0; i--) {
            const orb = this.skillOrbsPool[i];
            orb.position.z += moveDist;
            orb.rotation.x += 3.0 * delta;
            orb.rotation.y += 3.0 * delta;

            const dist = orb.position.distanceTo(this.playerPos);
            if (dist < 1.6) {
                const type = orb.userData.skillType;
                this.skills[type].charge = 1;
                sounds.playPowerup();
                this.spawnSparkParticles(orb.position, 0xffd166);

                this.scene.remove(orb);
                this.skillOrbsPool.splice(i, 1);
                continue;
            }

            if (orb.position.z > 15) {
                this.scene.remove(orb);
                this.skillOrbsPool.splice(i, 1);
            }
        }
    }

    handleCollision(obstacle) {
        this.spawnSparkParticles(this.playerPos, 0xff4757);

        if (this.hasHoverboard) {
            this.hasHoverboard = false;
            this.hoverboardMesh.visible = false;
            this.scene.remove(obstacle);
            sounds.playHit();
            return;
        }

        if (this.stumbleState) {
            this.triggerGameOver();
        } else {
            this.stumbleState = true;
            this.stumbleTimer = 5.0;
            sounds.playWhistle();
            sounds.playHit();
            this.scene.remove(obstacle);
        }
    }

    updateCoins(moveDist, delta) {
        const isMagnet = this.activePowerups.magnet > 0;

        for (let i = this.coinsPool.length - 1; i >= 0; i--) {
            const coin = this.coinsPool[i];
            coin.position.z += moveDist;
            coin.rotation.y += CONFIG.COIN_ROTATION_SPEED * delta;

            if (isMagnet) {
                const distToPlayer = coin.position.distanceTo(this.playerPos);
                if (distToPlayer < 14) {
                    coin.position.lerp(this.playerPos, 14 * delta);
                }
            }

            const dist = coin.position.distanceTo(this.playerPos);
            if (dist < 1.4) {
                this.coins++;
                sounds.playCoin();
                this.spawnSparkParticles(coin.position, 0xffd700);
                this.scene.remove(coin);
                this.coinsPool.splice(i, 1);
                continue;
            }

            if (coin.position.z > 15) {
                this.scene.remove(coin);
                this.coinsPool.splice(i, 1);
            }
        }
    }

    updatePowerups(moveDist, delta) {
        for (let i = this.powerupItems.length - 1; i >= 0; i--) {
            const item = this.powerupItems[i];
            item.position.z += moveDist;
            item.rotation.y += 2.0 * delta;

            const dist = item.position.distanceTo(this.playerPos);
            if (dist < 1.6) {
                const type = item.userData.type;
                this.activePowerups[type] = CONFIG.POWERUP_DURATION;
                sounds.playPowerup();
                this.spawnSparkParticles(item.position, 0xffd166);

                this.scene.remove(item);
                this.powerupItems.splice(i, 1);
                continue;
            }

            if (item.position.z > 15) {
                this.scene.remove(item);
                this.powerupItems.splice(i, 1);
            }
        }
    }

    // --------------------------------------------------------------------------
    // UI REFRESH
    // --------------------------------------------------------------------------
    updateUI() {
        document.getElementById('hud-score').innerText = Math.floor(this.score).toString().padStart(6, '0');
        document.getElementById('hud-coins').innerText = this.coins;
        document.getElementById('start-highscore').innerText = this.highScore;
        document.getElementById('start-totalcoins').innerText = this.totalCoins;
        document.getElementById('hoverboard-count').innerText = this.hoverboardCount;

        document.getElementById('hud-speed').innerText = Math.floor(this.currentSpeed) + ' MPH';

        const btnDash = document.getElementById('btn-skill-dash');
        const btnWarp = document.getElementById('btn-skill-timewarp');

        if (this.skills.dash.charge >= 1) btnDash.classList.add('ready');
        else btnDash.classList.remove('ready');

        if (this.skills.timewarp.charge >= 1) btnWarp.classList.add('ready');
        else btnWarp.classList.remove('ready');

        const multBadge = document.getElementById('hud-multiplier');
        if (this.activePowerups.multiplier > 0) {
            multBadge.innerText = '2x';
            multBadge.style.background = '#ffd166';
            multBadge.style.color = '#5c3d00';
        } else {
            multBadge.innerText = '1x';
            multBadge.style.background = '#ff4757';
            multBadge.style.color = '#ffffff';
        }

        const pContainer = document.getElementById('powerup-bars');
        pContainer.innerHTML = '';

        const iconMap = {
            magnet: 'fa-magnet',
            jetpack: 'fa-rocket',
            sneakers: 'fa-shoe-prints',
            multiplier: 'fa-bolt'
        };

        Object.keys(this.activePowerups).forEach(p => {
            const timeLeft = this.activePowerups[p];
            if (timeLeft > 0) {
                const pct = (timeLeft / CONFIG.POWERUP_DURATION) * 100;
                const div = document.createElement('div');
                div.className = 'powerup-meter';
                div.innerHTML = `
                    <i class="fa-solid ${iconMap[p]}"></i>
                    <div class="powerup-bar-track">
                        <div class="powerup-bar-fill" style="width: ${pct}%"></div>
                    </div>
                `;
                pContainer.appendChild(div);
            }
        });
    }
}

window.addEventListener('load', () => {
    window.game = new Game();
});
