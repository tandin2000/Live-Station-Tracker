let cachedSessions = [];

async function loadSessions() {
  const res = await fetch("data.json");
  const json = await res.json();
  cachedSessions = json.data.sessions;
}

function minutesDiff(target) {
  return Math.floor((target - new Date()) / 60000);
}

function formatTimer(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function resetSeat(el, seat) {
  el.className = "seat";
  el.innerHTML = `<strong>Seat ${seat}</strong>`;
}

function applyUpcomingColor(el, mins) {
  if (mins <= 5) el.classList.add("upcoming-5");
  else if (mins <= 15) el.classList.add("upcoming-15");
}

function applyOngoingColor(el, minsLeft) {
  if (minsLeft <= 5) el.classList.add("ongoing-5-end");
  else if (minsLeft <= 15) el.classList.add("ongoing-15-end");
  else el.classList.add("ongoing");
}

function render() {
  const now = new Date();

  document.querySelectorAll(".seat").forEach(el => {
    const seat = Number(el.dataset.seat);
    resetSeat(el, seat);

    const sessions = cachedSessions
      .filter(s => s.workStation === seat)
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

    let ongoingSession = null;
    let upcomingSessions = [];

    sessions.forEach(s => {
      const start = new Date(s.dateTime);
      const end = new Date(start.getTime() + s.minutes * 60000);
      const removeAt = new Date(end.getTime() + 2 * 60000);

      if (now >= start && now <= removeAt && !ongoingSession) {
        ongoingSession = { ...s, start, end };
      } else if (start > now) {
        upcomingSessions.push({ ...s, start });
      }
    });

    // ===== ONGOING =====
    if (ongoingSession) {
      const minsLeft = minutesDiff(ongoingSession.end);
      const timeLeftMs = ongoingSession.end - now;

      el.innerHTML += `
      <div>
        <strong>${ongoingSession.apprentice.firstName}</strong><br>
        <em>${ongoingSession.mission?.title || ongoingSession.project?.name}</em><br>
        <span class="timer">${formatTimer(timeLeftMs)}</span>
      </div>
    `;


      applyOngoingColor(el, minsLeft);
    }

    // ===== UPCOMING LIST =====
    upcomingSessions.forEach(s => {
      const mins = minutesDiff(s.start);
      const msLeft = s.start - now;

      const div = document.createElement("div");
      div.className = "upcoming-item";
      div.innerHTML = `
        ${s.apprentice.firstName}
        <span class="timer">(${formatTimer(msLeft)})</span>
      `;

      applyUpcomingColor(div, mins);
      el.appendChild(div);
    });
  });
}

/* ===== INIT ===== */
async function refresh() {
  await loadSessions();
  render();
}

refresh();
setInterval(refresh, 60 * 1000); // reload data every 1 min
setInterval(render, 1000);        // update timers every second


const stationMap = {
  1: [1,2,3,4,19,20],
  2: [5,6,15,16,17,18],
  3: [9,10,11,12,13,14],
  4: [7,8,21,22,23,24,25,26]
};

function getStationBySeat(seat) {
  for (const [station, seats] of Object.entries(stationMap)) {
    if (seats.includes(seat)) return station;
  }
  return "Unknown";
}

function sessionStatus(session, now) {
  const start = new Date(session.dateTime);
  const end = new Date(start.getTime() + session.minutes * 60000);

  if (now < start) return "Upcoming";
  if (now >= start && now <= end) return "Ongoing";
  return "Finished";
}

function seatOccupied(seat, excludeSession, now) {
  return cachedSessions.some(s => {
    if (s === excludeSession) return false;
    if (s.workStation !== seat) return false;
    const start = new Date(s.dateTime);
    const end = new Date(start.getTime() + s.minutes * 60000);
    return now >= start && now <= end;
  });
}

document.getElementById("searchInput").addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase();
  const box = document.getElementById("searchResult");

  if (!q) {
    box.style.display = "none";
    return;
  }

  const now = new Date();

  const matches = cachedSessions.filter(s =>
    `${s.apprentice.firstName} ${s.apprentice.lastName}`
      .toLowerCase()
      .includes(q)
  );

  if (matches.length === 0) {
    box.innerHTML = "❌ No session found";
    box.style.display = "block";
    return;
  }

  const s = matches[0];
  const start = new Date(s.dateTime);
  const diffMin = Math.round((now - start) / 60000);

  let timing;
  if (diffMin < 0) timing = `Early by ${Math.abs(diffMin)} min`;
  else if (diffMin > 0) timing = `Late by ${diffMin} min`;
  else timing = "On time";

  const occupied = seatOccupied(s.workStation, s, now);

  box.innerHTML = `
    <strong>${s.apprentice.firstName} ${s.apprentice.lastName}</strong><br>
    Station: ${s.workStation}<br>
    Starts at: ${start.toLocaleTimeString()}<br>
    Status: ${sessionStatus(s, now)}<br>
    Timing: ${timing}<br>
    Seat occupied now: ${occupied ? "YES ⚠️" : "NO"}
  `;

  box.style.display = "block";
});
