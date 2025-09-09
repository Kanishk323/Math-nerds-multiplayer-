# Maths Nerds - Multiplayer (Socket.IO) for Render

## Deploy on Render
1. Push this repository to GitHub.
2. In Render dashboard, create a new Web Service.
   - Connect to your repo.
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node 18 or 20
3. Render will build and start the server on a public URL.

## Notes
- Server is a relay. Host generates initial state and broadcasts it.
- Actions are relayed between clients.
- To secure game logic, move rules into the server.