/******************** CONSTANTS ********************/
const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 220;
const INTERVAL_MS = 10;
const DISPLAY_SECONDS = 20;
const MAX_POINTS = DISPLAY_SECONDS * (1000 / INTERVAL_MS);
const STEP = VIEW_WIDTH / MAX_POINTS;

/******************** GLOBAL VARIABLES ********************/
let selectedPoint = null;
let dragPoint = null;
let dragging = false;
let running = false;
let canStart = false;
let dataPoints = [];
let intervalId = null;

/******************** DOM ELEMENTS ********************/
const codeEditor = document.getElementById('codeEditor');
const startSimBtn = document.getElementById('startSim');
const resetSimBtn = document.getElementById('resetSim');
const downloadGraphBtn = document.getElementById('downloadGraph');
const checkCodeBtn = document.getElementById('checkCode');
const downloadCodeBtn = document.getElementById('downloadCode');
const dataInfo = document.getElementById('dataInfo');
const dacGraph = document.getElementById('dacGraph');

// Popups
const instructionsBtn = document.getElementById('instructionsBtn');
const instructionsPopup = document.getElementById('instructionsPopup');
const closeInstructions = document.getElementById('closeInstructions');

const viewCodeBtn = document.getElementById('viewCode');
const codePopup = document.getElementById('codePopup');
const closeCodeBtn = document.getElementById('closeCode');
const useCodeBtn = document.getElementById('useCode');

const viewCircuitBtn = document.getElementById('viewCircuit');
const circuitPopup = document.getElementById('circuitPopup');
const closeCircuitBtn = document.getElementById('closeCircuit');
const toggleDiagramBtn = document.getElementById('toggleDiagram');
const circuitImg = document.getElementById('circuitImg');
const diagramLabel = document.getElementById('diagramLabel');

// Sample code
const sampleCode = `CLR P0.7
LOOP:
    MOV P1, A
    ADD A, #4
    JMP LOOP
`;
document.getElementById('sampleCode').textContent = sampleCode;

let showBlockDiagram = false;

/******************** INITIAL STATE ********************/
startSimBtn.disabled = true;
downloadCodeBtn.disabled = true;

/******************** ENABLE CODE DOWNLOAD WHEN TYPING ********************/
codeEditor.addEventListener('input', () => {
    downloadCodeBtn.disabled = codeEditor.value.trim().length === 0;
});

/******************** POPUP HANDLERS ********************/
instructionsBtn.onclick = () => instructionsPopup.style.display = 'flex';
closeInstructions.onclick = () => instructionsPopup.style.display = 'none';

viewCodeBtn.onclick = () => codePopup.style.display = 'flex';
closeCodeBtn.onclick = () => codePopup.style.display = 'none';

useCodeBtn.onclick = () => {
    codeEditor.value = sampleCode;
    downloadCodeBtn.disabled = false;
    codePopup.style.display = 'none';
};

viewCircuitBtn.onclick = () => circuitPopup.style.display = 'flex';
closeCircuitBtn.onclick = () => circuitPopup.style.display = 'none';

toggleDiagramBtn.onclick = () => {
    showBlockDiagram = !showBlockDiagram;
    if (showBlockDiagram) {
        circuitImg.src = 'images/img3.png';
        diagramLabel.textContent = 'Figure : Block Diagram';
        toggleDiagramBtn.textContent = 'View Logic Diagram';
    } else {
        circuitImg.src = 'images/image1.png';
        diagramLabel.textContent = 'Figure : Logic Diagram';
        toggleDiagramBtn.textContent = 'View Block Diagram';
    }
};

/******************** CODE VALIDATION ********************/
function normalizeCode(code) {
    return code.split("\n")
        .map(l => l.replace(/,\s*/g, ",").trim())
        .filter(Boolean)
        .join("\n")
        .toUpperCase();
}

checkCodeBtn.onclick = () => {
    if (normalizeCode(codeEditor.value) === normalizeCode(sampleCode)) {
        alert("Your code is correct! You can proceed to the next step.");
        canStart = true;
        startSimBtn.disabled = false;
    } else {
        alert("Your code is incorrect! Please review and try again.");
        canStart = false;
        startSimBtn.disabled = true;
    }
};

/******************** GRAPH DRAWING ********************/
function drawGraph() {
    dacGraph.innerHTML = '';

    // Polyline
    const points = dataPoints.map((v, idx) => {
        const t = idx * (INTERVAL_MS / 1000);
        const x = 40 + (t / DISPLAY_SECONDS) * VIEW_WIDTH;
        const y = VIEW_HEIGHT - 20 - (v / 5) * (VIEW_HEIGHT - 40);
        return `${x},${y}`;
    }).join(' ');

    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', 'blue');
    poly.setAttribute('stroke-width', '2');
    poly.setAttribute('points', points);
    dacGraph.appendChild(poly);

    // Axes
    const axes = [
        { x1: 40, y1: 0, x2: 40, y2: VIEW_HEIGHT - 20 },
        { x1: 40, y1: VIEW_HEIGHT - 20, x2: VIEW_WIDTH + 40, y2: VIEW_HEIGHT - 20 }
    ];

    axes.forEach(a => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        for (let key in a) line.setAttribute(key, a[key]);
        line.setAttribute('stroke', 'black');
        dacGraph.appendChild(line);
    });

    // X-axis ticks
    for (let v = 0; v <= DISPLAY_SECONDS; v++) {
        const x = 40 + (v * 1000 / INTERVAL_MS) * STEP;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', VIEW_HEIGHT - 20);
        line.setAttribute('x2', x);
        line.setAttribute('y2', VIEW_HEIGHT - 15);
        line.setAttribute('stroke', 'black');
        dacGraph.appendChild(line);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x - 5);
        text.setAttribute('y', VIEW_HEIGHT - 2);
        text.setAttribute('font-size', '10');
        text.textContent = v + "s";
        dacGraph.appendChild(text);
    }

    // Y-axis ticks
    for (let v = 0; v <= 5; v++) {
        const y = VIEW_HEIGHT - 20 - (v / 5) * (VIEW_HEIGHT - 40);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', 35);
        line.setAttribute('y1', y);
        line.setAttribute('x2', 40);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', 'black');
        dacGraph.appendChild(line);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', 20);
        text.setAttribute('y', y + 3);
        text.setAttribute('font-size', '10');
        text.textContent = v + "V";
        dacGraph.appendChild(text);
    }
}

/******************** SIMULATION ********************/
startSimBtn.onclick = () => {
    if (running || !canStart) return;

    running = true;
    dataPoints = [];
    dataInfo.textContent = '';

    let step = 0;
    const totalSteps = DISPLAY_SECONDS * (1000 / INTERVAL_MS);
    const rampSteps = 5 * (1000 / INTERVAL_MS);

    intervalId = setInterval(() => {
        if (step >= totalSteps) {
            clearInterval(intervalId);
            running = false;
            drawGraph();
            return;
        }

        let rampStep = step % rampSteps;
        let p1Value = Math.floor((rampStep / (rampSteps - 1)) * 255);

        let analogV = ((p1Value + 0.2) / 255) * 5;
        dataPoints.push(analogV);

        drawGraph();

        step++;
    }, INTERVAL_MS);
};

/******************** RESET ********************/
resetSimBtn.onclick = () => {
    clearInterval(intervalId);
    running = false;
    dataPoints = [];
    dataInfo.textContent = '';
    codeEditor.value = '';
    startSimBtn.disabled = true;
    downloadCodeBtn.disabled = true;
    canStart = false;

    drawGraph();
};

/******************** DOWNLOAD ASSEMBLY CODE (FIXED) ********************/
downloadCodeBtn.onclick = () => {
    const code = codeEditor.value.trim();
    if (!code) return;

    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = "dac_code.asm";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);
};

/******************** DOWNLOAD GRAPH ********************/
downloadGraphBtn.onclick = () => {
    import('https://html2canvas.hertzen.com/dist/html2canvas.min.js')
        .then(() => html2canvas(document.querySelector('.graph-container')))
        .then(canvas => {
            const link = document.createElement('a');
            link.download = 'dac_waveform.png';
            link.href = canvas.toDataURL();
            link.click();
        });
};

/******************** CLICK RED DOT INFO ********************/
dacGraph.onclick = function (e) {
    const pt = dacGraph.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;

    const cursor = pt.matrixTransform(dacGraph.getScreenCTM().inverse());
    const time = ((cursor.x - 40) / VIEW_WIDTH) * DISPLAY_SECONDS;
    const idx = Math.round(time / (INTERVAL_MS / 1000));

    if (idx >= 0 && idx < dataPoints.length) {
        selectedPoint = idx;

        const voltage = dataPoints[idx];
        const digital = Math.round((voltage / 5) * 255);
        const t = idx * (INTERVAL_MS / 1000);

        const x = 40 + (t / DISPLAY_SECONDS) * VIEW_WIDTH;
        const y = VIEW_HEIGHT - 20 - (voltage / 5) * (VIEW_HEIGHT - 40);

        placeRedDot(x, y);
        dataInfo.textContent =
            `Time: ${t.toFixed(2)}s | P1: ${digital} | Analog Voltage: ${voltage.toFixed(2)}V`;
    }
};

/******************** DRAGGABLE RED DOT ********************/
dacGraph.addEventListener('mousedown', e => {
    const pt = dacGraph.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursor = pt.matrixTransform(dacGraph.getScreenCTM().inverse());

    const time = ((cursor.x - 40) / VIEW_WIDTH) * DISPLAY_SECONDS;
    const idx = Math.round(time / (INTERVAL_MS / 1000));

    if (idx >= 0 && idx < dataPoints.length) {
        dragging = true;
        dragPoint = idx;
    }
});

dacGraph.addEventListener('mousemove', e => {
    if (!dragging || dragPoint === null) return;

    const pt = dacGraph.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursor = pt.matrixTransform(dacGraph.getScreenCTM().inverse());

    let y = Math.min(Math.max(cursor.y, 20), VIEW_HEIGHT - 20);
    let voltage = 5 * (VIEW_HEIGHT - 20 - y) / (VIEW_HEIGHT - 40);

    dataPoints[dragPoint] = voltage;

    drawGraph();
    placeRedDot(
        40 + (dragPoint * (INTERVAL_MS / 1000) / DISPLAY_SECONDS) * VIEW_WIDTH,
        y
    );
});

dacGraph.addEventListener('mouseup', () => { dragging = false; dragPoint = null; });
dacGraph.addEventListener('mouseleave', () => { dragging = false; dragPoint = null; });

/******************** RED DOT DRAW ********************/
function placeRedDot(x, y) {
    const oldDot = dacGraph.querySelector('.red-dot');
    if (oldDot) oldDot.remove();

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
    dot.setAttribute('r', 4);
    dot.setAttribute('fill', 'red');
    dot.classList.add('red-dot');
    dacGraph.appendChild(dot);
}

/******************** INITIAL GRAPH ********************/
drawGraph();
