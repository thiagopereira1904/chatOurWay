
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
  console.log("conectado ao bd");
});

io.on('connection', (socket) => {

  console.log('conectado')
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  socket.on('newRoom', function (newTrip) {
    var dicMessageContent = {
      'cIdTrip': newTrip.cIdTrip,
      'listUserTrip': newTrip.listUserTrip
    }


    async function pega_cIdTrp(params) {
      const resultado = await Msg.findOne(params);

      if (resultado == null) {
        const message = new Msg(dicMessageContent)
        message.save().then(result => console.log(result))
          .catch(err => console.log(err));;
        console.log("Viagem criada com sucesso: ", dicMessageContent.cIdTrip);
        socket.emit("nova_viagem_criada", "Viagem cadastrada com sucesso!");

        Msg.findOneAndUpdate(
          { cIdTrip: dicMessageContent.cIdTrip },
          { $push: { "listUserTrip": newTrip.listUserTrip } }
        ).exec();
      } else {
        console.log("Erro ao criar viagem: ", dicMessageContent.cIdTrip);
        socket.emit("nova_viagem_erro", "Erro ao cadastrar viagem!");
      }
    }
    pega_cIdTrp({ "cIdTrip": dicMessageContent.cIdTrip });

  });

  socket.on('joinRoom', function (cIdTrip_value) {
    socket.join(cIdTrip_value);
    console.log("Entrando na sala: ", cIdTrip_value);
    Msg.find({ cIdTrip: cIdTrip_value }).then(result => {
      socket.emit('all_messages', result);
      socket.emit('online_na_sala', "Usuário logado na sala");
    });
  })

  socket.on('newUser', function (params) {
    console.log("Inicio da funcao");


    userTrip = {
      'cIdTrip': params.cIdTrip,
      'cIdUser': params.cIdUser
    }


    async function valida_usuario(cIdTrip, cIdUser) {
      console.log("teste");
      const resTrip = await Msg.findOne({ "cIdTrip": cIdTrip });

      if (resTrip == null) {
        console.log("Viagem não encontrada");
        socket.emit("erro_ao_encontrar_viagem", "Viagem não encontrada!")
      } else {
        var user_cadastrado = false;

        for (var i = 0; i < resTrip.listUserTrip.length; i++) {
          console.log(resTrip.listUserTrip[i]);
          if (resTrip.listUserTrip[i].cIdUser == cIdUser) {
            user_cadastrado = true;
          }
        }
        console.log(user_cadastrado);

        if (user_cadastrado == true) {
          console.log("Usuário já cadastrado na viagem!");
          socket.emit("usuario_ja_cadastrado_na_viagem", "Usuário já cadastrado da viagem!");
        } else {

          Msg.findOneAndUpdate(
            { cIdTrip: cIdTrip },
            { $push: { "listUserTrip": [{ "cIdUser": cIdUser }] } }
          ).exec();

          console.log("Usuário cadastrado com sucesso!");
          socket.emit("usuario_cadastrado", "Usuário cadastrado na viagem com sucesso!");
        }
      }
    }
    valida_usuario(userTrip.cIdTrip, userTrip.cIdUser);

  });


  socket.on('sendMessage', (MessageContent) => {
    var data_atual = new Date;
    var dicMessageContent = {
      'cIdTrip': MessageContent.cIdTrip,
      'cIdMessage': MessageContent.cIdMessage,
      'cIdUser': MessageContent.cIdUser,
      'date': data_atual.toLocaleString(),
      'cContent': MessageContent.cContent,
      'xTypeMessageContent': MessageContent.xTypeMessageContent
    }

  
    Msg.findOneAndUpdate(
      { cIdTrip: dicMessageContent.cIdTrip },
      { $push: { "listMessages": dicMessageContent } }
    ).exec();
    io.sockets.in(dicMessageContent.cIdTrip).emit("response_message", dicMessageContent)
  });


});

setInterval(() => io.emit('time', new Date().toTimeString()), 1000);


