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
import SocketPacket from 'SocketPacket'

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
  - packetStrigifier: {optional} \<function\> - see [packetStringifier](#packetStringifier)
  - packetParser: {optional} \<function\> - see [packetParser](#packetParser)
  - startsWith: {optional} \<string\> - see [startsWith](#startsWith)
  - endsWith: {optional} \<string\> - see [endsWith](#endsWith)
  - encoding: {optional} \<string\> - see [encoding](#encoding)

## .on('packet', packet => {})

`socket-packet` adds a listener to the `data` event of the socket, "unwraps" the payload into their separate packets, and for each valid packet contained, emits the `packet` event