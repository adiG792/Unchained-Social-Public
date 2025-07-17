// username-indexer.js
// Listens for UsernameSet events and serves a user directory API

const { ethers } = require("ethers");
const fs = require("fs");
const express = require("express");
const path = require("path");
const cors = require("cors");

// === CONFIGURATION ===
const contracts = require(path.join(__dirname, "src/contracts.json"));
const ABI = require(path.join(__dirname, "abis/PostContract.json")).abi;
const CONTRACT_ADDRESS = contracts.PostContract; // or contracts.PostContract.address if that's the structure
const PROVIDER_URL = "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID"; // <-- Or your node URL

const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

let userDirectory = [];

function saveDirectory() {
  fs.writeFileSync("userDirectory.json", JSON.stringify(userDirectory, null, 2));
}

// Listen for UsernameSet events
contract.on("UsernameSet", (user, username) => {
  const idx = userDirectory.findIndex(u => u.address.toLowerCase() === user.toLowerCase());
  if (idx !== -1) {
    userDirectory[idx].username = username;
  } else {
    userDirectory.push({ address: user, username });
  }
  saveDirectory();
  
});

// Scan past UsernameSet events on startup
async function scanPastEvents() {
  const events = await contract.queryFilter("UsernameSet", 0, "latest");
  userDirectory = [];
  for (const ev of events) {
    const { user, username } = ev.args;
    const idx = userDirectory.findIndex(u => u.address.toLowerCase() === user.toLowerCase());
    if (idx !== -1) {
      userDirectory[idx].username = username;
    } else {
      userDirectory.push({ address: user, username });
    }
  }
  saveDirectory();
  
}
scanPastEvents();

// Express API
const app = express();
app.use(cors());
const PORT = 3001;

app.get("/users", (req, res) => {
  const data = fs.readFileSync("userDirectory.json");
  res.json(JSON.parse(data));
});

app.listen(PORT, () => {});
