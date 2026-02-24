// Инициализация сцены, камеры, рендерера
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false; // тени не требуются
document.body.appendChild(renderer.domElement);

// Освещение
// Добавляем точечный источник света в позицию Солнца
const sunLight = new THREE.PointLight(0xffffff, 2, 0, 0);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);
// Добавляем фоновый свет, чтобы тёмные стороны планет были видны
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);

// Загрузчик текстур
const loader = new THREE.TextureLoader();

// ========== Функции создания объектов ==========

// Создание звёздного неба (большая сфера с внутренней текстурой)
function createStarfield() {
    const geometry = new THREE.SphereGeometry(500, 64, 64);
    const texture = loader.load('imgs/stars.jpg');
    texture.minFilter = THREE.NearestFilter;
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide // чтобы камера была внутри
    });
    const sphere = new THREE.Mesh(geometry, material);
    return sphere;
}

// Создание Солнца (излучает свет, текстура)
function createSun() {
    const geometry = new THREE.SphereGeometry(5, 64, 64);
    const texture = loader.load('imgs/sunmap.jpg');
    texture.minFilter = THREE.NearestFilter;
    const material = new THREE.MeshPhongMaterial({
        map: texture,
        emissive: 0x444400 // лёгкое свечение
    });
    const sphere = new THREE.Mesh(geometry, material);
    return sphere;
}

// Создание планеты
function createPlanet(radius, textureFile) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const texture = loader.load(textureFile);
    texture.minFilter = THREE.NearestFilter;
    const material = new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 5
    });
    const sphere = new THREE.Mesh(geometry, material);
    return sphere;
}

// Создание пунктирной орбиты
function createOrbit(radius, color = 0xcccc00, dashSize = 0.5, gapSize = 0.3) {
    const points = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        points.push(new THREE.Vector3(x, 0, z));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
        color: color,
        dashSize: dashSize,
        gapSize: gapSize
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
}

// ========== Создание объектов сцены ==========

// Звёздное небо
const starfield = createStarfield();
scene.add(starfield);

// Солнце
const sun = createSun();
scene.add(sun);

// Данные планет: имя, радиус, расстояние от Солнца, угловая скорость орбиты (рад/сек),
// угловая скорость вращения (рад/сек), файл текстуры.
const planetsData = [
    { name: 'mercury', radius: 0.4, distance: 10, orbitSpeed: 0.04, rotSpeed: 0.01, tex: 'imgs/mercury.jpg' },
    { name: 'venus',   radius: 0.6, distance: 15, orbitSpeed: 0.016, rotSpeed: 0.005, tex: 'imgs/venus.jpg' },
    { name: 'earth',   radius: 0.65, distance: 20, orbitSpeed: 0.01, rotSpeed: 0.01, tex: 'imgs/earth.jpg' },
    { name: 'mars',    radius: 0.55, distance: 25, orbitSpeed: 0.0053, rotSpeed: 0.0097, tex: 'imgs/mars.jpg' }
];

// Массив для хранения планет с их параметрами
const planets = [];

planetsData.forEach((data, index) => {
    // Создаём сферу планеты
    const sphere = createPlanet(data.radius, data.tex);
    // Начальный угол (случайный)
    const angle = Math.random() * Math.PI * 2;
    // Сохраняем всё в объекте
    planets.push({
        sphere: sphere,
        distance: data.distance,
        orbitSpeed: data.orbitSpeed,
        rotSpeed: data.rotSpeed,
        angle: angle,
        name: data.name
    });
    // Добавляем на сцену
    scene.add(sphere);
    // Создаём орбиту
    const orbit = createOrbit(data.distance);
    scene.add(orbit);
});

// Луна (специальный объект, вращается вокруг Земли)
const moonRadius = 0.2;
const moonDistance = 3; 
const moonOrbitSpeed = 0.13; 
const moonRotSpeed = 0.13; 
const moonTex = loader.load('imgs/moon.jpg');
moonTex.minFilter = THREE.NearestFilter;
const moonMaterial = new THREE.MeshPhongMaterial({ map: moonTex });
const moonGeometry = new THREE.SphereGeometry(moonRadius, 32, 32);
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moon);
// Для Луны храним угол отдельно
let moonAngle = Math.random() * Math.PI * 2;

// ========== Управление камерой ==========
const keyboard = new THREEx.KeyboardState();

// Режимы камеры: null - общий вид, иначе индекс планеты (0-Меркурий,1-Венера,2-Земля,3-Марс)
let currentTargetIndex = null;

// Позиция камеры по умолчанию (общий вид)
function setOverviewCamera() {
    camera.position.set(0, 30, 50);
    camera.lookAt(0, 0, 0);
}
setOverviewCamera();

// ========== Часы для независимости от FPS ==========
const clock = new THREE.Clock();

// ========== Анимация ==========
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Обновление позиций планет
    planets.forEach(planet => {
        // Обновляем угол орбиты
        planet.angle += planet.orbitSpeed * delta;
        // Вычисляем позицию
        const x = planet.distance * Math.cos(planet.angle);
        const z = planet.distance * Math.sin(planet.angle);
        planet.sphere.position.set(x, 0, z);

        // Вращение вокруг своей оси
        planet.sphere.rotation.y += planet.rotSpeed * delta;
    });

    // Обновление позиции Луны (вращается вокруг Земли)
    // Находим Землю (индекс 2)
    const earth = planets[2].sphere;
    moonAngle += moonOrbitSpeed * delta;
    const moonX = earth.position.x + moonDistance * Math.cos(moonAngle);
    const moonZ = earth.position.z + moonDistance * Math.sin(moonAngle);
    moon.position.set(moonX, 0, moonZ);
    // Вращение Луны (синхронное, можно вращать, но не обязательно)
    moon.rotation.y += moonRotSpeed * delta;

    // Обновление позиции источника света (следует за Солнцем)
    sunLight.position.copy(sun.position);

    // Обработка клавиш для переключения камеры
    if (keyboard.pressed('0')) {
        currentTargetIndex = null;
        setOverviewCamera();
    }
    if (keyboard.pressed('1')) {
        currentTargetIndex = 0; // Меркурий
    }
    if (keyboard.pressed('2')) {
        currentTargetIndex = 1; // Венера
    }
    if (keyboard.pressed('3')) {
        currentTargetIndex = 2; // Земля
    }
    if (keyboard.pressed('4')) {
        currentTargetIndex = 3; // Марс
    }

    // Режим слежения
    if (currentTargetIndex !== null && planets[currentTargetIndex]) {
        const targetPlanet = planets[currentTargetIndex].sphere;
        // Позиция камеры: немного сверху и сбоку от планеты
        const offset = new THREE.Vector3(0, 5, 15); // смещение в локальных координатах
        // Чтобы камера всегда была направлена на планету, помещаем её в точку планета + смещение
        camera.position.copy(targetPlanet.position.clone().add(offset));
        camera.lookAt(targetPlanet.position);
    }

    renderer.render(scene, camera);
}

animate();

// Обработка изменения размера окна
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});