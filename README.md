[![Codacy Badge](https://api.codacy.com/project/badge/Grade/4c76e317f6ed40d4af6f255b62e590fa)](https://www.codacy.com/app/gavinvangent/socket-packet?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=gavinvangent/socket-packet&amp;utm_campaign=Badge_Grade)
[![Codacy Badge](https://api.codacy.com/project/badge/Coverage/4c76e317f6ed40d4af6f255b62e590fa)](https://www.codacy.com/app/gavinvangent/socket-packet?utm_source=github.com&utm_medium=referral&utm_content=gavinvangent/socket-packet&utm_campaign=Badge_Coverage)

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
Caveat: if you use [socket.setEncoding()](https://nodejs.org/docs/latest-v8.x/api/net.html#net_socket_setencoding_encoding) and it does not match this encoding, problems may be expeienced ... I have not yet tested this

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

## Dev setup

You will need to get/generate your Codacy account api token (not project token) and your username ready for this:

```sh
export CODACY_USERNAME="your name here"
export CODACY_API_TOKEN="your token here"
```