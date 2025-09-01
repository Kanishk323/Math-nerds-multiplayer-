
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = socketIo(server, {
    cors: {
        origin: "*", // In production, replace with your frontend URL
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Enable CORS for Express
app.use(cors());
app.use(express.json());

// Serve static files (your HTML game)
app.use(express.static(path.join(__dirname, 'public')));

// Game state management
const games = new Map();
const waitingPlayers = [];

// Game room structure
class GameRoom {
    constructor(id, player1) {
        this.id = id;
        this.players = {
            player1: {
                socketId: player1.socketId,
                name: player1.name,
                ip: 100.0,
                tokens: 12,
                hand: [],
                blockDamage: 0,
                damageOverTime: {active: false, value: 0, turns: 0},
                healOverTime: {active: false, value: 0, turns: 0},
                doubleDamageNextTurn: false,
                reflectDamage: {active: false, value: 0, turns: 0},
                isIPIrrational: false,
                isIPImaginary: false,
                selectedBranch: '',
                inGracePeriod: false,
                graceRoundsRemaining: -1,
                ready: false
            },
            player2: null
        };
        this.currentTurn = 1;
        this.currentPlayer = 'player1';
        this.isGameOver = false;
        this.deck = [];
        this.discardPile = [];
        this.currentPhase = 'draw';
        this.playedCardsThisTurn = [];
        this.gameStarted = false;
    }

    addPlayer2(player2) {
        this.players.player2 = {
            socketId: player2.socketId,
            name: player2.name,
            ip: 100.0,
            tokens: 12,
            hand: [],
            blockDamage: 0,
            damageOverTime: {active: false, value: 0, turns: 0},
            healOverTime: {active: false, value: 0, turns: 0},
            doubleDamageNextTurn: false,
            reflectDamage: {active: false, value: 0, turns: 0},
            isIPIrrational: false,
            isIPImaginary: false,
            selectedBranch: '',
            inGracePeriod: false,
            graceRoundsRemaining: -1,
            ready: false
        };
    }

    getPlayerBySocketId(socketId) {
        if (this.players.player1 && this.players.player1.socketId === socketId) {
            return 'player1';
        }
        if (this.players.player2 && this.players.player2.socketId === socketId) {
            return 'player2';
        }
        return null;
    }

    getOpponent(playerKey) {
        return playerKey === 'player1' ? 'player2' : 'player1';
    }
}

// Socket connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Handle player joining queue
    socket.on('joinGame', (playerData) => {
        console.log('Player joined game:', playerData);

        const player = {
            socketId: socket.id,
            name: playerData.name || `Player_${socket.id.substring(0, 6)}`
        };

        // Check if there's a waiting player
        if (waitingPlayers.length > 0) {
            // Match with waiting player
            const waitingPlayer = waitingPlayers.shift();
            const gameId = uuidv4();
            const gameRoom = new GameRoom(gameId, waitingPlayer);
            gameRoom.addPlayer2(player);

            games.set(gameId, gameRoom);

            // Join both players to the room
            const waitingSocket = io.sockets.sockets.get(waitingPlayer.socketId);
            if (waitingSocket) {
                waitingSocket.join(gameId);
                socket.join(gameId);

                // Notify both players about the match
                io.to(gameId).emit('gameMatched', {
                    gameId: gameId,
                    players: {
                        player1: {name: gameRoom.players.player1.name},
                        player2: {name: gameRoom.players.player2.name}
                    }
                });

                // Assign player roles
                waitingSocket.emit('playerRole', 'player1');
                socket.emit('playerRole', 'player2');

                console.log(`Game created: ${gameId} with players ${waitingPlayer.name} and ${player.name}`);
            }
        } else {
            // Add to waiting queue
            waitingPlayers.push(player);
            socket.emit('waitingForOpponent');
            console.log(`Player ${player.name} added to waiting queue`);
        }
    });

    // Handle branch selection
    socket.on('selectBranch', (data) => {
        const gameRoom = findGameBySocketId(socket.id);
        if (!gameRoom) return;

        const playerKey = gameRoom.getPlayerBySocketId(socket.id);
        if (!playerKey) return;

        gameRoom.players[playerKey].selectedBranch = data.branch;
        gameRoom.players[playerKey].ready = true;

        // Notify all players in the room
        io.to(gameRoom.id).emit('branchSelected', {
            player: playerKey,
            branch: data.branch
        });

        // Check if both players are ready to start
        if (gameRoom.players.player1.ready && gameRoom.players.player2.ready) {
            startGame(gameRoom);
        }
    });

    // Handle card play
    socket.on('playCard', (data) => {
        const gameRoom = findGameBySocketId(socket.id);
        if (!gameRoom || !gameRoom.gameStarted) return;

        const playerKey = gameRoom.getPlayerBySocketId(socket.id);
        if (!playerKey || gameRoom.currentPlayer !== playerKey) return;

        // Process card play
        processCardPlay(gameRoom, playerKey, data);

        // Broadcast game state update
        broadcastGameState(gameRoom);
    });

    // Handle end turn
    socket.on('endTurn', () => {
        const gameRoom = findGameBySocketId(socket.id);
        if (!gameRoom || !gameRoom.gameStarted) return;

        const playerKey = gameRoom.getPlayerBySocketId(socket.id);
        if (!playerKey || gameRoom.currentPlayer !== playerKey) return;

        nextTurn(gameRoom);
        broadcastGameState(gameRoom);
    });

    // Handle draw card
    socket.on('drawCard', () => {
        const gameRoom = findGameBySocketId(socket.id);
        if (!gameRoom || !gameRoom.gameStarted) return;

        const playerKey = gameRoom.getPlayerBySocketId(socket.id);
        if (!playerKey || gameRoom.currentPlayer !== playerKey) return;

        if (gameRoom.currentPhase === 'draw') {
            drawCard(gameRoom, playerKey);
            gameRoom.currentPhase = 'play';
            broadcastGameState(gameRoom);
        }
    });

    // Handle chat messages
    socket.on('chatMessage', (data) => {
        const gameRoom = findGameBySocketId(socket.id);
        if (!gameRoom) return;

        const playerKey = gameRoom.getPlayerBySocketId(socket.id);
        if (!playerKey) return;

        io.to(gameRoom.id).emit('chatMessage', {
            player: gameRoom.players[playerKey].name,
            message: data.message,
            timestamp: new Date().toISOString()
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);

        // Remove from waiting queue if present
        const waitingIndex = waitingPlayers.findIndex(p => p.socketId === socket.id);
        if (waitingIndex !== -1) {
            waitingPlayers.splice(waitingIndex, 1);
        }

        // Handle game disconnect
        const gameRoom = findGameBySocketId(socket.id);
        if (gameRoom) {
            // Notify other player about disconnect
            socket.to(gameRoom.id).emit('playerDisconnected');

            // Clean up game
            games.delete(gameRoom.id);
        }
    });
});

// Helper functions
function findGameBySocketId(socketId) {
    for (const [gameId, gameRoom] of games) {
        if ((gameRoom.players.player1 && gameRoom.players.player1.socketId === socketId) ||
            (gameRoom.players.player2 && gameRoom.players.player2.socketId === socketId)) {
            return gameRoom;
        }
    }
    return null;
}

function startGame(gameRoom) {
    gameRoom.gameStarted = true;
    initializeDeck(gameRoom);

    // Deal initial cards to both players
    for (let i = 0; i < 5; i++) {
        drawCard(gameRoom, 'player1');
        drawCard(gameRoom, 'player2');
    }

    // Notify players that game has started
    io.to(gameRoom.id).emit('gameStarted', {
        message: 'Game started! Player 1 goes first.'
    });

    broadcastGameState(gameRoom);
}

function initializeDeck(gameRoom) {
    // Basic deck with mathematical cards
    const basicCards = [
        // Attack cards
        {id: 'add_5', name: 'Add 5', type: 'math_operator', cost: 2, damage: 5, description: 'Deal 5 damage'},
        {id: 'sub_3', name: 'Subtract 3', type: 'math_operator', cost: 1, damage: 3, description: 'Deal 3 damage'},
        {id: 'mult_2', name: 'Multiply by 2', type: 'math_operator', cost: 3, damage: 8, description: 'Deal 8 damage'},
        {id: 'div_2', name: 'Divide by 2', type: 'math_operator', cost: 2, heal: 4, description: 'Heal 4 IP'},

        // Defense cards
        {id: 'shield_3', name: 'Shield', type: 'defense', cost: 2, blockDamage: 5, description: 'Block 5 damage this turn'},
        {id: 'heal_4', name: 'Healing Formula', type: 'heal', cost: 2, heal: 6, description: 'Restore 6 IP'},

        // Special cards
        {id: 'sqrt', name: 'Square Root', type: 'special', cost: 4, effect: 'reduce_opponent_ip', description: 'Set opponent IP to √IP'},
        {id: 'factorial', name: 'Factorial', type: 'special', cost: 5, damage: 12, description: 'Deal massive damage'},
    ];

    // Create deck with multiple copies
    gameRoom.deck = [];
    for (let i = 0; i < 3; i++) {
        basicCards.forEach(card => {
            gameRoom.deck.push({...card, uid: uuidv4()});
        });
    }

    // Shuffle deck
    shuffleDeck(gameRoom);
}

function shuffleDeck(gameRoom) {
    for (let i = gameRoom.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameRoom.deck[i], gameRoom.deck[j]] = [gameRoom.deck[j], gameRoom.deck[i]];
    }
}

function drawCard(gameRoom, playerKey) {
    if (gameRoom.deck.length === 0) {
        // Reshuffle discard pile if deck is empty
        gameRoom.deck = [...gameRoom.discardPile];
        gameRoom.discardPile = [];
        shuffleDeck(gameRoom);
    }

    if (gameRoom.deck.length > 0) {
        const card = gameRoom.deck.pop();
        gameRoom.players[playerKey].hand.push(card);
    }
}

function processCardPlay(gameRoom, playerKey, data) {
    const player = gameRoom.players[playerKey];
    const opponent = gameRoom.players[gameRoom.getOpponent(playerKey)];

    // Find card in player's hand
    const cardIndex = player.hand.findIndex(card => card.uid === data.cardId);
    if (cardIndex === -1) return;

    const card = player.hand[cardIndex];

    // Check if player has enough tokens
    if (player.tokens < card.cost) return;

    // Play the card
    player.tokens -= card.cost;
    const playedCard = player.hand.splice(cardIndex, 1)[0];
    gameRoom.discardPile.push(playedCard);
    gameRoom.playedCardsThisTurn.push(playedCard);

    // Apply card effects
    if (card.damage) {
        const finalDamage = Math.max(0, card.damage - opponent.blockDamage);
        opponent.ip = Math.max(0, opponent.ip - finalDamage);

        // Log game event
        io.to(gameRoom.id).emit('gameLog', {
            message: `${player.name} played ${card.name} for ${finalDamage} damage!`,
            type: 'damage'
        });
    }

    if (card.heal) {
        player.ip = Math.min(100, player.ip + card.heal);
        io.to(gameRoom.id).emit('gameLog', {
            message: `${player.name} healed for ${card.heal} IP!`,
            type: 'heal'
        });
    }

    if (card.blockDamage) {
        player.blockDamage = card.blockDamage;
        io.to(gameRoom.id).emit('gameLog', {
            message: `${player.name} gained ${card.blockDamage} block!`,
            type: 'defense'
        });
    }

    // Check win condition
    if (opponent.ip <= 0) {
        gameRoom.isGameOver = true;
        io.to(gameRoom.id).emit('gameOver', {
            winner: playerKey,
            winnerName: player.name
        });
    }
}

function nextTurn(gameRoom) {
    // Reset block damage
    gameRoom.players[gameRoom.currentPlayer].blockDamage = 0;

    // Switch turns
    gameRoom.currentPlayer = gameRoom.getOpponent(gameRoom.currentPlayer);
    gameRoom.currentTurn++;
    gameRoom.currentPhase = 'draw';
    gameRoom.playedCardsThisTurn = [];

    // Add tokens
    gameRoom.players[gameRoom.currentPlayer].tokens = Math.min(12, 
        gameRoom.players[gameRoom.currentPlayer].tokens + 2);

    io.to(gameRoom.id).emit('gameLog', {
        message: `Turn ${gameRoom.currentTurn}: ${gameRoom.players[gameRoom.currentPlayer].name}'s turn`,
        type: 'turn'
    });
}

function broadcastGameState(gameRoom) {
    io.to(gameRoom.id).emit('gameStateUpdate', {
        players: gameRoom.players,
        currentPlayer: gameRoom.currentPlayer,
        currentTurn: gameRoom.currentTurn,
        currentPhase: gameRoom.currentPhase,
        isGameOver: gameRoom.isGameOver,
        playedCardsThisTurn: gameRoom.playedCardsThisTurn
    });
}

// Health check endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        activeGames: games.size, 
        waitingPlayers: waitingPlayers.length 
    });
});

// Get game stats
app.get('/api/stats', (req, res) => {
    res.json({
        activeGames: games.size,
        waitingPlayers: waitingPlayers.length,
        totalConnections: io.engine.clientsCount
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Multiplayer Math Game Server running on port ${PORT}`);
});
