import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import generateCards from './generateCards.js';
import 'dotenv/config';


const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    }
})

const rooms = {};
const games = {};
const gameStarted = {};

io.on("connection", (socket) => {
    console.log("user connected: ", socket.id);

    socket.on("join_room", (data) => {

        if(gameStarted[data.room]){
            socket.emit("join_not_allowed", {room: data.room});
            return;
        }

        socket.join(data.room);
        if (!rooms[data.room]) {
            console.log("available room")
            rooms[data.room] = [];
        }
        
        const isFirstUser = rooms[data.room].length === 0;
        
        const user = {
            userName: data.userName,
            isAdmin: isFirstUser,
            isCaptain: false, 
            userId: socket.id
        };


        rooms[data.room].push(user);
        io.to(data.room).emit("user_list", rooms[data.room]);
        console.log("check this :", rooms[data.room])

        console.log(`User with ID: ${socket.id} joined room: ${data}`)
    })

    socket.on("send_message", (data) => {
        socket.to(data.room).emit("receive_message", data);
        console.log(data);
    });

    socket.on("admin_ready", (data) => {
        // Broadcast the ready status to all users in the room
        io.to(data.room).emit("admin_ready_status", true);
        gameStarted[data.room] = true;
      });

    socket.on("start_game", (data) => {
        
        const room = data.room;
        const redTeam = data.redTeam;
        const blueTeam = data.blueTeam;
        const setCaptains = () => {
            redTeam.find((user) => user.userName === data.redCaptain? user.isCaptain = 'true' : "")
            blueTeam.find((user) => user.userName === data.blueCaptain? user.isCaptain = 'true' : "")
        }
        setCaptains();
        const captains = {
            red: redTeam.find((user) => user.isCaptain)?.userName || "",
            blue: blueTeam.find((user) => user.isCaptain)?.userName || "",
        };

        const cards = generateCards();
        const selectedCards = [];
        const redCorrect = 0;
        const blueCorrect = 0;
        const yellowTotal = 9;
        const blackCard = false;
        const captainIsReady = false;
        const word = "";
        const numOfGuesses = 0;
        let redTotal = 8;
        let blueTotal = 8;
        const gameOver = false;
        //if red begins set to "true", else to "false"
        const checkTurn = () => {
            if (cards[0].begginer === 'red') {
                redTotal = 9;
                return true;
            }
            blueTotal = 9;
            return false;
        };



        const turn = checkTurn();

        
        const setMsg = () => {
            if (turn) {
                return "The red team starts";
            }
            return "The blue team starts";
        }

        const msg = setMsg();

        const game = {
            redTeam: redTeam,
            blueTeam: blueTeam,
            captains:captains,
            room: room,
            cards:cards,
            selectedCards: selectedCards,
            redTotal: redTotal,
            blueTotal: blueTotal,
            redCorrect: redCorrect,
            blueCorrect: blueCorrect,
            yellowTotal: yellowTotal,
            blackCard: blackCard,
            captainIsReady: captainIsReady,
            word: word,
            numOfGuesses: numOfGuesses,
            turn: turn,
            msg: msg,
            gameOver: gameOver

        }

        games[room] = [];
        games[room].push(game);
    
        console.log("Game started with the following details:", {
          room,
          redTeam,  
          blueTeam,
          captains,            
          cards
        });

        io.to(room).emit("start_game", data);

      });

    socket.on("game_details", (data) => {
        io.to(data.room).emit("get_game_details", games[data.room]);
        console.log(games[data.room])
    });

    socket.on("captain_choose", (data) => {
        const room = data.room;
        const game = games[room][0];
        const word = data.wordCode;
        const numOfGuesses = data.numOfGuesses;

        game.captainIsReady = true;
        game.word = word;
        game.numOfGuesses = numOfGuesses;
        const redCardsLeft = game.redTotal - game.redCorrect;
        const blueCardsLeft = game.blueTotal - game.blueCorrect;
  


        if(game.turn) {
            if (game.numOfGuesses > redCardsLeft){
                game.numOfGuesses = redCardsLeft;
            }
            game.msg = `Red team turn. The word is ${word}, number of gusses: ${game.numOfGuesses}`;
        }

        else {
            if (game.numOfGuesses > blueCardsLeft) {
                game.numOfGuesses = blueCardsLeft;
            }
            game.msg = `Blue team turn. The word is ${word}, number of gusses: ${game.numOfGuesses}`;
        }

        io.to(room).emit("get_game_details", [game]);
        
    });


    socket.on("choose_word", (data) => {
        const room = data.room;
        const selectedCard = data.card;

        const game = games[room][0];

        if (selectedCard.color === 'red'){
            if(game.turn && game.numOfGuesses > 1) {
                game.numOfGuesses = game.numOfGuesses - 1;
                game.msg = `${selectedCard.word} is red \u2714` ;
            }
            else{
                if(game.turn) {
                    if(game.redTotal-game.redCorrect <= 1){
                        game.msg = `${selectedCard.word} is red \u2714. The red team won! ` ;
                        game.gameOver = true;
                    }
                    else{
                        game.msg = "You were right in all the guesses! The turn goes to the blue team";

                    }
                }
                else {
                    game.msg = `${selectedCard.word} is red \u2717. The turn goes to the red team`;
                }
                game.word = "";
                game.numOfGuesses = 0;
                game.turn = !game.turn;
                game.captainIsReady = false;
            }
            game.redCorrect = game.redCorrect + 1;
          }
          else if (selectedCard.color === 'blue') {
            if(!game.turn && game.numOfGuesses > 1 ) {
                game.numOfGuesses = game.numOfGuesses - 1;
                game.msg = `${selectedCard.word} is blue \u2714`;
            }
            else{
                if(!game.turn){
                    if(game.blueTotal - game.blueCorrect <= 1){
                        game.msg = `${selectedCard.word} is blue \u2714. The blue team won!`;
                        game.gameOver = true;

                    }
                    else{
                        game.msg = `${selectedCard.word} is red \u2714. The turn goes to the red team`;

                    }
                }
                else{
                    game.msg = `${selectedCard.word} is blue \u2717. The turn goes to the blue team`;
                }
                game.word = "";
                game.numOfGuesses = 0;
                game.turn = !game.turn;
                game.captainIsReady = false;
            }
            game.blueCorrect = game.blueCorrect + 1;
          }
          else if (selectedCard.color === 'yellow') {


            if( game.turn ){
                game.msg = `${selectedCard.word} is a natural word \u2717. The turn goes to the blue team`;
            }
            else{
                game.msg = `${selectedCard.word} is a natural word \u2717. The turn goes to the red team`;
            }
            game.yellowTotal = game.yellowTotal - 1;
            game.word = "";
            game.numOfGuesses = 0;
            game.turn = !game.turn;
            game.captainIsReady = false;
          }
          else {
            if (game.turn) {
                game.msg = `${selectedCard.word} is a black word \u2717. The game is over! Blue team won`;
            }
            else {
                game.msg = `${selectedCard.word} is a black word \u2717. The game is over! Red team won`;

            }
            game.blackCard = true;
            game.gameOver = true;
          }
        
        
   
        game.selectedCards = [...game.selectedCards, selectedCard];

        console.log(game.selectedCards)
    
        // Broadcast the updated game state to all clients
        io.to(room).emit("get_game_details", [game]);
    });

    

    socket.on("disconnect", () => {
        Object.keys(rooms).forEach(room => {
            rooms[room] = rooms[room].filter(user => user.userId !== socket.id);
            io.to(room).emit("user_list", rooms[room]);

            if (games[room]) {
                const disconnectedUser = games[room][0].redTeam.find(user => user.userId === socket.id) ||
                games[room][0].blueTeam.find(user => user.userId === socket.id);
                games[room][0].redTeam = games[room][0].redTeam.filter(user => user.userId !== socket.id);
                games[room][0].blueTeam = games[room][0].blueTeam.filter(user => user.userId !== socket.id);

                console.log("disonnected:", disconnectedUser);
                if(disconnectedUser){
                    io.to(room).emit("disconnected_user", {user: disconnectedUser});
                }

                io.to(room).emit("get_game_details", games[room]);
            }

            if(rooms[room].length === 0){
                gameStarted[room] = false;
                delete rooms[room];
                if(games[room]){
                    delete games[room];
                }
            }

        });
        console.log("User disconnected", socket.id); 
    })
})

server.listen(3001, () => {

    
    console.log("Server is running on port 3001");
});


