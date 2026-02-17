require("dotenv").config();
const fs = require("fs");

const ORG_ID = process.env.ORG_ID;
const IDENTOJI_TOKEN = process.env.IDENTOJI_TOKEN;
const AUTHOJI_COOKIE = process.env.AUTHOJI_COOKIE;
const DATA_PATH = process.env.DATA_PATH || "../data.json";

function getTodayRangeLocal() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    from: Math.floor(start.getTime() / 1000),
    to: Math.floor(end.getTime() / 1000)
  };
}

// const API_HEADERS = {
//   "Content-Type": "application/json",
//   "Authorization": `identoji ${IDENTOJI_TOKEN}`,
//   "Cookie": `authoji=${AUTHOJI_COOKIE}`,
//   "Origin": "https://dashboard.steamoji.com"
// };

const API_HEADERS = {
  "Content-Type": "application/json",
  "Authorization": `identoji ${IDENTOJI_TOKEN}`,
  "Cookie": `authoji=${AUTHOJI_COOKIE}`,
  "Origin": "https://dashboard.steamoji.com",
  "Referer": "https://dashboard.steamoji.com/",
  "User-Agent": "Mozilla/5.0"
};


/** Fetches academyBadgeIn and artefactVideoURL for a single session by ID */
async function fetchSessionDetails(sessionId) {
  const res = await fetch("https://api.steamoji.com/query", {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({
      operationName: "Session",
      query: `
        query Session($sessionId: ID!) {
          session(id: $sessionId) {
            academyBadgeIn
            artefactVideoURL
          }
        }
      `,
      variables: { sessionId }
    })
  });
  const json = await res.json();
  const session = json?.data?.session ?? {};
  return {
    academyBadgeIn: session.academyBadgeIn ?? null,
    artefactVideoURL: session.artefactVideoURL ?? ""
  };
}

async function fetchAndSaveSessions() {
  const { from, to } = getTodayRangeLocal();

  const res = await fetch("https://api.steamoji.com/query", {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({
      operationName: "Sessions",
      query: `
        query Sessions(
          $organizationID: ID,
          $status: SessionStatus,
          $from: Int,
          $to: Int,
          $page: Int,
          $size: Int,
          $query: String,
          $missionID: String,
          $projectID: String,
          $date: String,
          $rating: Int
        ) {
          sessions(
            organizationID: $organizationID,
            status: $status,
            from: $from,
            to: $to,
            page: $page,
            size: $size,
            q: $query,
            missionID: $missionID,
            projectID: $projectID,
            date: $date,
            rating: $rating
          ) {
            id
            dateTime
            workStation
            step
            sessionType
            minutes
            status
            createdAt
            location { id name }
            project { id name }
            mission { id title }
            apprentice { firstName lastName }
            facilitator { firstName lastName }
          }
        }
      `,
      variables: {
        organizationID: ORG_ID,
        from,
        to,
        page: 0,
        size: 500
      }
    })
  });




  const json = await res.json();
  
  const sessions = json?.data?.sessions ?? [];

  // Enrich each session with academyBadgeIn and artefactVideoURL from Session query
  const enrichedSessions = await Promise.all(
    sessions.map(async (session) => {
      const details = await fetchSessionDetails(session.id).catch(() => ({
        academyBadgeIn: null,
        artefactVideoURL: ""
      }));
      return { ...session, ...details };
    })
  );

  const payload = {
    data: {
      sessions: enrichedSessions
    }
  };

  fs.writeFileSync(
    DATA_PATH,
    JSON.stringify(payload, null, 2),
    "utf-8"
  );

  console.log(`✅ data.json updated (${enrichedSessions.length} sessions)`);
}


async function runJob() {
  console.log("⏱️ Job running at", new Date().toLocaleTimeString());
  fetchAndSaveSessions().catch(console.error);
  // 👉 call your existing fetch + alert logic here
  // await fetchSessions();
  // checkAlerts();
} 

runJob(); // run immediately once

setInterval(runJob, 1 * 60 * 1000); // every 5 minutes
