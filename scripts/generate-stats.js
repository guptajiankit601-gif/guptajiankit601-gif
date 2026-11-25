const fs = require("node:fs");

const username = "guptajiankit601-gif";
const token = process.env.GITHUB_TOKEN;

const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(token ? { Authorization: `Bearer ${token}` } : {})
};

async function github(path) {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&apos;"
  })[char]);
}

async function main() {
  const user = await github(`/users/${username}`);
  const repos = [];

  for (let page = 1; page <= 10; page++) {
    const batch = await github(
      `/users/${username}/repos?per_page=100&page=${page}&type=owner`
    );
    repos.push(...batch.filter(repo => !repo.fork));
    if (batch.length < 100) break;
  }

  const stars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const languages = {};

  for (const repo of repos) {
    if (repo.language) {
      languages[repo.language] = (languages[repo.language] || 0) + 1;
    }
  }

  const topLanguages = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const stats = [
    ["PUBLIC REPOSITORIES", user.public_repos],
    ["FOLLOWERS", user.followers],
    ["REPOSITORY STARS", stars],
    ["FOLLOWING", user.following]
  ];

  const cards = stats.map(([label, value], i) => {
    const x = 35 + i * 290;
    const color = i % 2 ? "#22D3EE" : "#A78BFA";
    return `
      <rect x="${x}" y="65" width="260" height="105" rx="15"
        fill="#171f30" stroke="${color}"/>
      <text x="${x + 22}" y="100" fill="#AAB8CC"
        font-family="Arial" font-size="13">${label}</text>
      <text x="${x + 22}" y="145" fill="#FFFFFF"
        font-family="Arial" font-size="34" font-weight="bold">${value}</text>`;
  }).join("");

  const languageRows = topLanguages.length
    ? topLanguages.map(([name, count], i) => `
      <text x="${65 + i * 220}" y="240"
        fill="${i % 2 ? "#22D3EE" : "#A78BFA"}"
        font-family="Arial" font-size="17" font-weight="bold">
        ${escapeXml(name)} · ${count}
      </text>`).join("")
    : `<text x="65" y="240" fill="#AAB8CC" font-family="Arial" font-size="17">No public language data yet</text>`;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="280" viewBox="0 0 1200 280">
  <rect width="1200" height="280" rx="22" fill="#0D1117"/>
  <text x="35" y="38" fill="#A78BFA" font-family="Arial" font-size="14" letter-spacing="3">LIVE GITHUB OVERVIEW</text>
  ${cards}
  <text x="35" y="215" fill="#FFFFFF" font-family="Arial" font-size="16" font-weight="bold">TOP LANGUAGES · REPOSITORY COUNT</text>
  ${languageRows}
</svg>`;

  fs.writeFileSync("assets/stats.svg", svg);
  console.log("GitHub statistics generated successfully.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
