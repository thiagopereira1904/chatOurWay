
const express = require('express');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server);

const mongoose = require("mongoose");
const mongoDB = "mongodb+srv://thiago-psilva2812:dpmp658450@cluster0.wjabzhu.mongodb.net/message-database?retryWrites=true&w=majority";
const msgSchema = new mongoose.Schema({
  cIdTrip: {
    type: Number,
    required: true
  },
  listUserTrip: [
    {
      cIdUser: {
        type: Number
      }
    }
  ],
  listMessages: [
    {
      cIdMessage: {
        type: Number
      },
      cIdUser: {
        type: Number
      },
      date: {
        type: Date
      },
      cContent: {
        type: String
      },
      xTypeMessageContent: {
        type: String
      }
    }
  ]
});
const Msg = mongoose.model('msg', msgSchema);
module.exports = Msg;
mongoose.connect(mongoDB).then(() => {
  console.log("conectado");
});


io.on('connection', (socket) => {

  console.log('conectado')
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  socket.on('joinRoom', function (cIdTrip_value) {
    socket.join(cIdTrip_value);

    Msg.find({ cIdTrip: cIdTrip_value }).then(result => {
      console.log(result);
      socket.emit('all_messages', result);
    });
  })
  socket.on('newRoom', function (newTrip) {
    var dicMessageContent = {
      'cIdTrip': newTrip.cIdTrip,
      'listUserTrip': newTrip.listUserTrip
    }
    const message = new Msg(dicMessageContent)
    message.save().then(() => {
    });

     Msg.findOneAndUpdate(
       { cIdTrip: dicMessageContent.cIdTrip },
       { $push: { "listUserTrip": newTrip.listUserTrip} }
     ).exec(); 
 
     Msg.find({ cIdTrip: dicMessageContent.cIdTrip }).then(result => {
       console.log(result);
     });
     
  });


  socket.on('sendMessage', (MessageContent) => {
    var dicMessageContent = {
      'cIdTrip': MessageContent.cIdTrip,
      'cIdMessage': MessageContent.cIdMessage,
      'cIdUser': MessageContent.cIdUser,
      'date': Date.now(),
      'cContent': MessageContent.cContent,
      'xTypeMessageContent': MessageContent.xTypeMessageContent
    }
    Msg.findOneAndUpdate(
      { cIdTrip: dicMessageContent.cIdTrip },
      { $push: { "listMessages": dicMessageContent }}
    ).exec();
    socket.to(dicMessageContent.cIdTrip).emit(dicMessageContent);
  });


});


setInterval(() => io.emit('time', new Date().toTimeString()), 1000);