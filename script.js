const $ = (id) => document.getElementById(id);
let mode = "bed";

const stageColors = {
  rem: "#c7d2fe",
  light: "#93c5fd",
  deep: "#2563eb"
};

function parseTime(value) {
  if (!value) return 23 * 60;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}분`;
  return remainder ? `${hours}시간 ${remainder}분` : `${hours}시간`;
}

function getInputs() {
  const enteredTime = parseTime($("mainTime").value);
  const latency = Math.max(0, Math.min(120, Number($("latency").value) || 0));
  const cycle = Number($("cycleLength").value);

  if (mode === "bed") {
    return {
      sleepStart: enteredTime + latency,
      cycle,
      latency,
      enteredTime
    };
  }

  // In wake-time mode, the displayed timeline is anchored six cycles before the selected wake time.
  return {
    sleepStart: enteredTime - 6 * cycle,
    cycle,
    latency: 0,
    enteredTime
  };
}

function createHypnogram(sleepStart, cycle) {
  const svg = $("hypnogram");
  const width = 760;
  const height = 310;
  const left = 75;
  const right = 18;
  const top = 30;
  const bottom = 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const totalDuration = 6 * cycle;

  const y = {
    rem: top + plotHeight * 0.30,
    light: top + plotHeight * 0.54,
    deep: top + plotHeight * 0.82
  };

  const patterns = [
    [["light", 8], ["deep", 48], ["light", 19], ["rem", 15]],
    [["light", 12], ["deep", 34], ["light", 22], ["rem", 22]],
    [["light", 15], ["deep", 25], ["light", 22], ["rem", 28]],
    [["light", 16], ["deep", 17], ["light", 24], ["rem", 33]],
    [["light", 18], ["deep", 10], ["light", 24], ["rem", 38]],
    [["light", 18], ["deep", 7], ["light", 22], ["rem", 43]]
  ];

  const x = (minute) => left + (minute / totalDuration) * plotWidth;
  const labels = [
    ["렘수면", y.rem],
    ["얕은 수면", y.light],
    ["깊은 수면", y.deep]
  ];

  let output = `
    <rect x="${left}" y="${top}" width="${plotWidth}" height="${plotHeight}"
      rx="8" fill="#fbfcff" stroke="#e5eaf2"/>
  `;

  labels.forEach(([label, position]) => {
    output += `
      <line x1="${left}" y1="${position}" x2="${width - right}" y2="${position}"
        stroke="#e9edf4" stroke-dasharray="3 5"/>
      <text x="${left - 10}" y="${position + 4}" text-anchor="end"
        font-size="12" fill="#667085">${label}</text>
    `;
  });

  for (let index = 0; index <= 6; index += 1) {
    const position = x(index * cycle);
    output += `
      <line x1="${position}" y1="${top}" x2="${position}" y2="${top + plotHeight}"
        stroke="#d8dfeb" stroke-dasharray="4 5"/>
      <text x="${position}" y="${height - 20}" text-anchor="middle"
        font-size="12" fill="#667085">${index === 0 ? "잠듦" : `${index}주기`}</text>
    `;
  }

  let cursor = 0;
  const segments = [];
  patterns.forEach((pattern) => {
    pattern.forEach(([stage, nominalMinutes]) => {
      const segmentLength = nominalMinutes * (cycle / 90);
      segments.push({ stage, start: cursor, end: cursor + segmentLength });
      cursor += segmentLength;
    });
  });

  let path = "";
  segments.forEach((segment, index) => {
    const startX = x(segment.start);
    const endX = x(segment.end);
    const level = y[segment.stage];
    if (index === 0) path += `M ${startX} ${level}`;
    else path += ` L ${startX} ${y[segments[index - 1].stage]} L ${startX} ${level}`;
    path += ` L ${endX} ${level}`;
  });

  output += `<path d="${path}" fill="none" stroke="#2563eb"
    stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;

  segments.forEach((segment) => {
    const segmentX = x(segment.start);
    const segmentWidth = x(segment.end) - segmentX;
    output += `<rect x="${segmentX}" y="${top + plotHeight + 5}"
      width="${Math.max(1, segmentWidth)}" height="7"
      fill="${stageColors[segment.stage]}"/>`;
  });

  for (let index = 1; index <= 6; index += 1) {
    const position = x(index * cycle);
    output += `
      <circle cx="${position}" cy="${top + plotHeight + 5}" r="4" fill="#0f9d9a"/>
      <text x="${position}" y="${top - 9}" text-anchor="middle"
        font-size="11" font-weight="700" fill="#0f817e">
        ${formatTime(sleepStart + index * cycle)}
      </text>
    `;
  }

  svg.innerHTML = output;
}

function renderRows(cycle, enteredTime, latency) {
  const rows = [];
  for (let count = 1; count <= 6; count += 1) {
    const candidateTime = mode === "bed"
      ? enteredTime + latency + count * cycle
      : enteredTime - (6 - count) * cycle;

    const periodLabel = count <= 2
      ? "초반 수면 모형"
      : count <= 4
        ? "중간 수면 모형"
        : "후반 수면 모형";

    rows.push(`
      <tr>
        <td><span class="tag">${count}주기</span></td>
        <td><strong>${formatTime(candidateTime)}</strong></td>
        <td>${formatDuration(count * cycle)}</td>
        <td>${periodLabel}</td>
      </tr>
    `);
  }
  $("cycleRows").innerHTML = rows.join("");
}

function render() {
  const { sleepStart, cycle, latency, enteredTime } = getInputs();

  $("cycleOutput").textContent = `${cycle}분`;
  $("cycleSummary").textContent = `${cycle}분`;
  $("sleepStart").textContent = formatTime(sleepStart);
  $("sixDuration").textContent = formatDuration(6 * cycle);

  $("resultTimeHead").textContent = mode === "bed"
    ? "예상 기상 시각"
    : "예상 취침 시각";

  $("inputHint").textContent = mode === "bed"
    ? "입면 시간을 더한 수면 시작 추정 시각부터 주기별 기상 후보를 계산합니다."
    : "선택한 기상 시각에서 여섯 주기를 역산하고, 각 주기 수에 해당하는 취침 후보를 표시합니다.";

  renderRows(cycle, enteredTime, latency);
  createHypnogram(sleepStart, cycle);
}

function setMode(nextMode) {
  mode = nextMode;
  const isBedMode = mode === "bed";

  $("bedMode").classList.toggle("active", isBedMode);
  $("wakeMode").classList.toggle("active", !isBedMode);
  $("bedMode").setAttribute("aria-pressed", String(isBedMode));
  $("wakeMode").setAttribute("aria-pressed", String(!isBedMode));

  $("timeLabel").textContent = isBedMode
    ? "잠자리에 드는 시각"
    : "일어나야 하는 시각";
  $("latencyField").hidden = !isBedMode;
  render();
}

$("bedMode").addEventListener("click", () => setMode("bed"));
$("wakeMode").addEventListener("click", () => setMode("wake"));
["mainTime", "latency", "cycleLength"].forEach((id) => {
  $(id).addEventListener("input", render);
});

render();
