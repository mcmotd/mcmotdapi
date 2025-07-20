'use strict';
var dgram = require('dgram');
var ByteBuffer = require('bytebuffer');
var portfinder = require('portfinder');
var dns = require('dns');

var START_TIME = new Date().getTime();
var RAKNET = {
  STRUCTURE: 5,
  MAGIC: "00ffff00fefefefefdfdfdfd12345678",
  SERVER_ID: 925686942,
  UNCONNECTED_PING: 0x01,
  UNCONNECTED_PING_OPEN_CONNECTIONS: 0x02,

  OPEN_CONNECTION_REQUEST_1: 0x05,
  OPEN_CONNECTION_REPLY_1: 0x06,
  OPEN_CONNECTION_REQUEST_2: 0x07,
  OPEN_CONNECTION_REPLY_2: 0x08,

  INCOMPATIBLE_PROTOCOL_VERSION: 0x1a, //CHECK THIS

  UNCONNECTED_PONG: 0x1c,
  ADVERTISE_SYSTEM: 0x1d,
  DATA_PACKET_0: 0x80,
  DATA_PACKET_1: 0x81,
  DATA_PACKET_2: 0x82,
  DATA_PACKET_3: 0x83,
  DATA_PACKET_4: 0x84,
  DATA_PACKET_5: 0x85,
  DATA_PACKET_6: 0x86,
  DATA_PACKET_7: 0x87,
  DATA_PACKET_8: 0x88,
  DATA_PACKET_9: 0x89,
  DATA_PACKET_A: 0x8a,
  DATA_PACKET_B: 0x8b,
  DATA_PACKET_C: 0x8c,
  DATA_PACKET_D: 0x8d,
  DATA_PACKET_E: 0x8e,
  DATA_PACKET_F: 0x8f,

  NACK: 0xa0,
  ACK: 0xc0
};

var UNCONNECTED_PING = function (pingId) {
  this.bb = new ByteBuffer();
  this.bb.buffer[0] = RAKNET.UNCONNECTED_PING;
  this.bb.offset = 1;
  this.pingId = pingId;
};
UNCONNECTED_PING.prototype.encode = function () {
  //console.log(this.pingId);
  this.bb
    .writeLong(this.pingId)
    .append(RAKNET.MAGIC, "hex")
    .writeLong(0)
    .flip()
    .compact();
};


var UNCONNECTED_PONG = function (buf) {
  this.bb = buf;
  this.bb.offset = 1;
};
UNCONNECTED_PONG.prototype.decode = function () {
  this.pingId = this.bb.readLong();
  this.serverId = this.bb.readLong();
  this.bb.offset += 16;
  this.nameLength = this.bb.readShort();
  try {
    this.advertiseString = this.bb.readUTF8String(this.nameLength);
  }
  catch(e){ //FIXME
    this.advertiseString = this.bb.readUTF8String(parseInt(e.message.substr(e.message.indexOf(",")+2, 3)));
  }
  var splitString = this.advertiseString.split(/;/g);
  this.gameId = splitString[0];
  this.name = splitString[1];
  this.unknownId = splitString[2];
  this.gameVersion = splitString[3];
  this.currentPlayers = splitString[4];
  this.maxPlayers = splitString[5];
};

var QUERY = {
  STATISTIC: 0x00,
  HANDSHAKE: 0x09,
  MAGIC: 'fefd',
  KEYVAL_START: 128,
  KEYVAL_END: 1
};
var CHALLENGE = function (buf) {
  this.bb = new ByteBuffer();
};
CHALLENGE.prototype.encode = function () {
  //console.log(this.pingId);
  this.bb
    .append(QUERY.MAGIC, "hex")
    .writeByte(QUERY.HANDSHAKE)
    .writeInt32(1)
    .flip()
    .compact();
};
var CHALLENGE_RESPONSE = function (buf) {
  this.bb = buf;
  this.bb.offset = 1;
};
CHALLENGE_RESPONSE.prototype.decode = function () {
  this.clientId = this.bb.readInt32();
  //console.log(this.pingId);
  var bb = this.bb.slice(5);
  this.challengeToken = parseInt(bb.toString('utf8'), 10);
};

var STAT_REQUEST = function(challengeToken){
  this.bb = new ByteBuffer();
  this.challengeToken = challengeToken;
};
STAT_REQUEST.prototype.encode = function () {
  //console.log(this.pingId);
  this.bb
    .append(QUERY.MAGIC, "hex")
    .writeByte(QUERY.STATISTIC)
    .writeInt32(1)
    .writeInt32(this.challengeToken)
    .writeInt32(0)
    .flip()
    .compact();
};

var STAT_RESPONSE = function(buf){
  this.bb = buf;
  this.bb.offset = 16;
};
STAT_RESPONSE.prototype.decode = function () {
  this.data = {};
  this.players = [];

  var key;
  var value;
  while (this.bb.readUint16(this.bb.offset) !== QUERY.KEYVAL_END) {
    key = readString(this.bb);
    value = readString(this.bb);
    this.data[key] = value;
  }
  this.bb.offset += 11;

  var player = readString(this.bb);
  while (player.length >= 1) {
    this.players.push(player);
    player = readString(this.bb);
  }
};


var ping = function (server, port, callback, timeout, fullQuery) {
  if (typeof timeout == "boolean" && typeof fullQuery === "undefined") {
    fullQuery = timeout;
    timeout = undefined;
  }
  var MCPE_DEFAULT_PORT = 19132;
  if (typeof port === "function") {
    callback = port;
    port = MCPE_DEFAULT_PORT;
  }

  if (typeof port !== "number") {
    port = MCPE_DEFAULT_PORT;
  }

  if (typeof timeout === "undefined") {
    timeout = 5000;
  }

  function createSocketAndQuery(address) {
    const isIPv6 = checkIsIPV6(address);
    const socketType = isIPv6 ? "udp6" : "udp4";
    const client = dgram.createSocket(socketType);

    if (fullQuery) {
      sendHandshakeAndQuery(client, address, port, callback, timeout);
    } else {
      sendUnconnectedPing(client, address, port, callback, timeout);
    }
  }

  if (checkIsIPV4(server) || checkIsIPV6(server)) {
    createSocketAndQuery(server);
  } else {
    dns.lookup(server, function (err, res) {
      if (err === null) {
        createSocketAndQuery(res);
      } else {
        callback({ error: true, description: "DNS lookup failed." }, null);
      }
    });
  }
};

function sendUnconnectedPing(client, server, port, callback, timeout) {
  var broadcastPing = (function () {
    try {
      var ping = new UNCONNECTED_PING(new Date().getTime() - START_TIME);
      ping.encode();
      client.send(ping.bb.buffer, 0, ping.bb.buffer.length, port, server);
    } catch (e) {
      clearInterval(broadcastIntervalId);
      clearTimeout(timeoutId);
      client.close();
      callback({ error: true, description: "Error sending ping." }, null);
    }
  });
  broadcastPing();
  var broadcastIntervalId = setInterval(broadcastPing.bind(this), 400);
  var timeoutId = setTimeout(function () {
    clearInterval(broadcastIntervalId);
    client.close();
    callback({ error: true, description: "Ping session timed out." }, null);
  }, timeout);

  client.on("message", ((function (msg, rinfo) {
    var buf = new ByteBuffer().append(msg, "hex").flip();
    var id = buf.buffer[0];
    switch (id) {
      case RAKNET.UNCONNECTED_PONG:
        var pong = new UNCONNECTED_PONG(buf);
        pong.decode();
        var clientData = {
          'rinfo': rinfo,
          'advertise': pong.advertiseString,
          'serverId': pong.serverId,
          'pingId': pong.pingId,
          'game': pong.gameId,
          'version': pong.gameVersion,
          'name': pong.name,
          'cleanName': pong.name.replace(/\xA7[0-9A-FK-OR]/ig, ''),
          'currentPlayers': pong.currentPlayers,
          'maxPlayers': pong.maxPlayers,
          'ackId': new Date().getTime() - START_TIME,
          'connected': true
        };
        clearInterval(broadcastIntervalId);
        clearTimeout(timeoutId);
        client.close();
        callback(null, clientData);
        break;
      default:
        console.log(id);
        break;
    }
  }).bind(this)));
}

function sendHandshakeAndQuery(client, server, port, callback, timeout) {
  client.on("message", ((function (msg, rinfo) {
    var buf = new ByteBuffer().append(msg, "hex").flip();
    var id = buf.buffer[0];
    switch (id) {
      case QUERY.HANDSHAKE:
        var pong = new CHALLENGE_RESPONSE(buf);
        pong.decode();

        var statRequest = new STAT_REQUEST(pong.challengeToken);
        statRequest.encode();
        client.send(statRequest.bb.buffer, 0, statRequest.bb.buffer.length, port, server);
        break;
      case QUERY.STATISTIC:
        var stats = new STAT_RESPONSE(buf);
        stats.decode();
        var clientData = {
          'rinfo': rinfo,
          'hostname': stats.data.hostname,
          'gametype': stats.data.gametype,
          'game': stats.data.gameId,
          'version': stats.data.version,
          'serverEngine': stats.data['server_engine'],
          'plugins': stats.data.plugins,
          'map': stats.data.map,
          'currentPlayers': stats.data.numplayers,
          'maxPlayers': stats.data.maxplayers,
          'whitelist': (stats.data.whitelist === "on"),
          'hostIp': stats.data.hostip,
          'hostPort': stats.data.hostport,
          'ackId': new Date().getTime() - START_TIME,
          'players': stats.players,
          'connected': true
        };
        client.close();
        callback(null, clientData);
        break;
      default:
        callback({ error: true, description: "Bad packet response." }, null);
        client.close();
        break;
    }
  }).bind(this)));

  try {
    var challenge = new CHALLENGE();
    challenge.encode();
    client.send(challenge.bb.buffer, 0, challenge.bb.buffer.length, port, server);
  } catch (e) {
    client.close();
    callback({ error: true, description: "Error sending ping." }, null);
  }
}

// 新增 IPv6 检测函数
function checkIsIPV6(entry) {
  return /^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$|^::([\da-fA-F]{1,4}(:[\da-fA-F]{1,4})*)?$/i.test(entry);
}
function checkIsIPV4(entry) {
  var blocks = entry.split(".");
  if(blocks.length === 4) {
    return blocks.every(function(block) {
      return parseInt(block,10) >=0 && parseInt(block,10) <= 255;
    });
  }
  return false;
}
function readString(bb) {
  var start = bb.offset;
  var b = bb.readUInt8();
  while (b !== 0x0) {
    b = bb.readUInt8();
  }

  return bb.toString('utf8', start, bb.offset - 1);
}
module.exports = ping;
