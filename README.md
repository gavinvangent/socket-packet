[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Build Status](https://travis-ci.org/gavinvangent/socket-packet.svg?branch=master)](https://travis-ci.org/gavinvangent/socket-packet)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/4c76e317f6ed40d4af6f255b62e590fa)](https://www.codacy.com/app/gavinvangent/socket-packet?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=gavinvangent/socket-packet&amp;utm_campaign=Badge_Grade)
[![Codacy Badge](https://api.codacy.com/project/badge/Coverage/4c76e317f6ed40d4af6f255b62e590fa)](https://www.codacy.com/app/gavinvangent/socket-packet?utm_source=github.com&utm_medium=referral&utm_content=gavinvangent/socket-packet&utm_campaign=Badge_Coverage)
[![GitHub issues](https://img.shields.io/github/issues/gavinvangent/socket-packet.svg)](https://github.com/gavinvangent/socket-packet/issues)
[![GitHub stars](https://img.shields.io/github/stars/gavinvangent/socket-packet.svg)](https://github.com/gavinvangent/socket-packet/stargazers)
![npm](https://img.shields.io/npm/dw/socket-packet.svg)


# socket-packet
A nodejs library to wrap TCP/UDP packets between a server and client

Since you can never be sure of a data event being the full message, you may find yourself getting half packets, or even multiple packets at a time, and not being able to distinguish where a packet starts or ends.

This lib is intended to simplify this:

## Installation

```sh
npm install socket-packet
```

## How to use

```js
import SocketPacket from 'socket-packet'

// Once you have a socket, or for example:
// const socket = new Socket()

SocketPacket.bind(socket)

socket.on('packet', packet => {
  if (packet === 'ping') {
    socket.send('pong')
  }
})
```

## .bind(socket, logger, opts)

Binds `socket-packet` to an instance of a socket. This will attach the necessary logic to the socket for easy packet handling and sending.

- socket: \<Object\> instance of a [net.Socket](https://nodejs.org/docs/latest/api/net.html#net_class_net_socket)
- logger: {optional} \<Object\> instance of a [winston](https://www.npmjs.com/package/winston) or similar logger
- opts: {optional} \<Object\> with any customized options for SocketPacket
  - startsWith: {optional} \<string\> - see [startsWith](#startswith)
  - endsWith: {optional} \<string\> - see [endsWith](#endswith)
  - encoding: {optional} \<string\> - see [encoding](#encoding)
  - packetStringifier: {optional} \<function\> - see [packetStringifier](#packetstringifier)
  - packetParser: {optional} \<function\> - see [packetParser](#packetparser)

```js
SocketPacket.bind(socket, logger, opts)
```

## Event: 'packet'

`socket-packet` adds a listener to the `data` event of the socket, "unwraps" the payload into their separate packets, and for each valid packet contained, emits the `packet` event

```js
socket.on('packet', packet => {
  if (packet === 'ping') {
    socket.send('pong')
  }
})
```

## Event: 'error'

`socket-packet` emits `error` when encountering errors related to un/packaging messages, examples:
- on receiving a message which doesnt conform to the expected start and end wrapping
- on error from invocation of [packetStringifier](#packetstringifier) and [packetParser](#packetparser)

```js
socket.on('error', error => {
  // handle error
})
```

## .send(data[, callback])

`socket-packet` binds a `.send` function to the socket. Using this method will package the provided data/message and the write it to the socket

- callback: {Optional} \<function\> once the data has been flushed on the socket, this callback will be invoked, as expected when using [net.Socket.write()](https://nodejs.org/docs/latest-v8.x/api/net.html#net_socket_write_data_encoding_callback)

```js
socket.send('hello')
socket.send('ping')
socket.send({ hello: 'world'})
```

**NB:** although you are sending a JSON object, when it arrives on the other side of the socket, it would be a string/buffer ... You can use the [packetParser](#packetparser) on the other end of the socket to parse it as JSON; remember to use the [packetStringifier](#packetstringifier) to safely get a stringified version of the JSON object to write to the socket

## Options

### startsWith

This library is all about packaging messages/data being transferred over a socket. Packages are wrapped with a default starting value `-!@@!-`, which is used to indicate the start of a new packet. If the server/client prefixes packets with a different value, be sure to set this to the same value

### endsWith

This library is all about packaging messages/data being transferred over a socket. Packages are wrapped with a default ending value `-@!!@-`, which is used to indicate the end of a new packet. If the server/client suffixes packets with a different value, be sure to set this to the same value

### encoding

The encoding to use when parsing/stringifying packets, default is'utf8'
Caveat: if you use [socket.setEncoding()](https://nodejs.org/docs/latest-v8.x/api/net.html#net_socket_setencoding_encoding) and it does not match this encoding, problems may be experienced ... I have not yet tested this

### packetStringifier

This function is used when socket.send(data[, cb]) is invoked to stringify the message/data object before writing to the socket ... The default returns the packet as is, as a string:

```js
opts = {
  packetStringifier: packet => packet && packet.toString()
}
```

if, for example, all packets are expected to be `application/json`, you can use this:

```js
opts = {
  packetStringifier: packet => packet && JSON.stringify(packet)
}
```

### packetParser

This function is used when the `data` event is emitted and a packet is extracted to parse the packet to a specified format ... The default sends the packet is, as a string:

```js
opts = {
  packetParser: packet => packet && packet.toString()
}
```

if, for example, all packets are expected to be `application/json`, you can use this:

```js
opts = {
  packetParser: packet => packet && JSON.parse(packet)
}
```

## Example

server.js:

```js
import net from 'net'
import SocketPacket from 'socket-packet'
/* OR */
const net = require('net')
const SocketPacket = require('socket-packet')

const port = process.env.PORT || 8080
const host = process.env.HOST || 'localhost'

const server = net.createServer(socket => {
  console.log('Client connected')
  SocketPacket.bind(socket)

  socket.on('packet', packet => {
    switch (packet) {
      case 'ping': 
        console.log('ping received')

        setTimeout(() => {
          socket.send('pong', () => {
            console.log('pong sent')
          })
        }, 500)
        break
      default:
        console.log('Unhandled packet received: ', packet)    
    }
  })

  socket.on('error', err => {
    console.log('Error:', err)
  })

  socket.on('end', () => {
    console.log('Client ended')
  })

  socket.on('close', hadError => {
    console.log('Client disconnected')
  })
})

server.listen(port, host, () => {
  console.log(`Server started on ${server.address().address}:${server.address().port}`)
})
```

client.js:

```js
import net from 'net'
import SocketPacket from 'socket-packet'
/* OR */
const net = require('net')
const SocketPacket = require('socket-packet')

const port = process.env.PORT || 8080
const host = process.env.HOST || 'localhost'

const client = net.createConnection({ port, host }, () => {
  console.log('connection established')
  SocketPacket.bind(client)
})

client.on('packet', packet => {
  switch (packet) {
    case 'pong':
      console.log('pong received')
      break
    default:
      console.log('Unhandled packet received: ', packet)
  }
})

client.on('close', hasError => {
  console.log(`Connection closed with error = ${!!hasError}`)
  clearInterval(interval)
})

client.on('error', err => {
  console.log(err)
})

const interval = setInterval(() => {
  client.send('ping', () => {
    console.log('ping sent')
  })
}, 2000)
```
