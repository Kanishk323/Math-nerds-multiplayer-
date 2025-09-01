# Mathematical Card Battle - Multiplayer Game

एक रोमांचक गणितीय कार्ड बैटल गेम जो दो खिलाड़ियों के बीच रियल-टाइम में खेला जाता है।

## Features

- **Real-time Multiplayer**: Socket.IO के साथ लाइव गेमप्ले
- **Mathematical Cards**: गणित की विभिन्न शाखाओं पर आधारित कार्ड्स
- **Branch Selection**: अल्जेब्रा, ज्योमेट्री, कैलकुलस, और सांख्यिकी में से चुनें
- **Chat System**: गेम के दौरान चैट करें
- **Responsive Design**: मोबाइल और डेस्कटॉप दोनों के लिए अनुकूलित

## गेम कैसे खेलें

1. अपना नाम डालकर गेम में शामिल हों
2. दूसरे खिलाड़ी का इंतजार करें
3. अपनी पसंदीदा गणित की शाखा चुनें
4. कार्ड्स खेलकर अपने विरोधी का IP शून्य करें

## Tech Stack

- **Backend**: Node.js + Express.js + Socket.IO
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Real-time Communication**: WebSockets (Socket.IO)

## Installation & Development

```bash
# Dependencies install करें
npm install

# Development mode में run करें
npm run dev

# Production mode में run करें
npm start
```

## Deployment on Render

### Step 1: GitHub Repository Setup

1. अपना code GitHub repository में push करें:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2: Render पर Deploy करें

1. **Render.com** पर जाएं और GitHub से sign up करें
2. Dashboard में **"New +"** button पर click करें
3. **"Web Service"** select करें
4. अपनी GitHub repository connect करें

### Step 3: Deployment Configuration

Render service creation form में ये settings डालें:

- **Name**: `maths-nerds-multiplayer` (या कोई और unique name)
- **Language**: `Node`  
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: `Free` (या आपकी जरूरत के अनुसार)

### Step 4: Environment Variables (Optional)

Advanced settings में environment variables add कर सकते हैं:
- `NODE_ENV`: `production`
- `PORT`: `10000` (Render automatically set करता है)

### Step 5: Deploy करें

**"Create Web Service"** button पर click करें। Render automatically आपका app build और deploy कर देगा।

## Deployment Process

1. Render आपके GitHub repo से code pull करेगा
2. `npm install` run करके dependencies install करेगा  
3. `npm start` से server start करेगा
4. आपका app `https://your-app-name.onrender.com` पर live हो जाएगा

## Important Notes

- **Port Configuration**: Server automatic port detection करता है (`process.env.PORT`)
- **WebSocket Support**: Render WebSockets को support करता है
- **Free Tier Limitations**: Free tier पर sleep mode होता है inactivity के बाद
- **HTTPS**: Render automatically SSL certificate provide करता है

## Troubleshooting

### Common Issues:

1. **Build Failed**: 
   - `package.json` में सभी dependencies check करें
   - Node.js version compatibility verify करें

2. **WebSocket Connection Issues**:
   - Client code में correct server URL use करें
   - CORS settings check करें

3. **App Not Loading**:
   - Port binding verify करें (`0.0.0.0:PORT`)
   - Build logs check करें Render dashboard में

## Game Architecture

```
Client (Browser) <---WebSocket---> Server (Node.js)
       |                              |
    Socket.IO                    Socket.IO Server
       |                              |
   Game UI/Logic              Game State Management
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT License - Feel free to modify and distribute.

---

**Happy Gaming! 🎮🧮**
