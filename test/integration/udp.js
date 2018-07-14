/* eslint-env node, mocha */

import assert from 'assert'
import dgram from 'dgram'
import SocketPacket from '../../src/index'

const host = '127.0.0.1'
const serverPort = 7171
const clientPort = 7272

describe('UDP/Datagram usage', () => {
  describe('server and client with default settings', () => {
    it('should be able to interface successfully', done => {
      const server = dgram.createSocket('udp4')
      server.unref()
      SocketPacket.bind(server, null, { type: 'udp' })

      const client = dgram.createSocket('udp4')
      client.unref()
      SocketPacket.bind(client, null, { type: 'udp4' })

      server.on('packet', (packet, rInfo) => {
        client.close()
        server.close()

        assert.equal(rInfo.port, clientPort)
        assert.equal(rInfo.address, host)
        assert.equal(packet, 'pong')

        console.log(1)
        done()
      })

      server.on('error', error => {
        client.close()
        server.close()
        done(error)
      })

      client.on('packet', (packet, rInfo) => {
        assert.equal(rInfo.port, serverPort)
        assert.equal(rInfo.address, host)
        assert.equal(packet, 'ping')
        client.dispatch('pong', rInfo.port, rInfo.address)
      })

      client.on('error', error => {
        client.close()
        server.close()
        done(error)
      })

      server.bind(serverPort, host, () => {
        client.bind(clientPort, host, () => {
          server.dispatch('ping', clientPort, host)
        })
      })
    })

    it('should be able to interface successfully using big data', done => {
      console.log(2)
      const server = dgram.createSocket('udp4')
      server.unref()
      SocketPacket.bind(server, null, { type: 'dgram' })

      const client = dgram.createSocket('udp4')
      client.unref()
      SocketPacket.bind(client, null, { type: 'datagram' })

      let messageCount = 0
      server.on('message', message => {
        console.log(7, message.toString())
        messageCount++
      })

      client.on('message', message => {
        console.log(5, message.toString())
      })

      server.on('packet', (packet, rInfo) => {
        console.log(8, packet)
        client.close()
        server.close()
        assert.equal(rInfo.port, clientPort)
        assert.equal(rInfo.address, host)
        assert.equal(packet, message)
        assert(messageCount > 1)
        done()
      })

      server.on('error', err => {
        client.close()
        server.close()
        done(err)
      })

      client.on('packet', (packet, rInfo) => {
        console.log(6, ' ', packet)
        assert.equal(rInfo.port, serverPort)
        assert.equal(rInfo.address, host)
        client.dispatch(packet, rInfo.port, rInfo.address)
      })
      client.on('error', err => {
        client.close()
        server.close()
        done(err)
      })

      let message = 'abcdefghijklmnopqrstuvwxyz'

      server.bind(serverPort, host, () => {
        console.log(3)
        client.bind(clientPort, host, () => {
          console.log(4)
          server.setSendBufferSize(4)
          client.setSendBufferSize(4)
          server.dispatch(message, clientPort, host)
        })
      })
    })

    it('should see the client emit an error if the `endsWith` suffix is sent in message, creating what looks like an extra malformed packet', done => {
      const server = dgram.createSocket('udp4')
      server.unref()
      SocketPacket.bind(server, null, { type: 'udp' })

      const client = dgram.createSocket('udp4')
      client.unref()
      SocketPacket.bind(client, null, { type: 'udp' })

      let packetReceiveCount = 0
      client.on('packet', () => {
        packetReceiveCount++
      })

      client.on('error', err => {
        client.close()
        server.close()
        assert.strictEqual(packetReceiveCount, 1)
        assert.equal(err.message, 'Malformed packet received:  World-@!!@-')
        done()
      })

      server.bind(serverPort, host, () => {
        client.bind(clientPort, host, () => {
          server.dispatch(`Hello ${SocketPacket.PACKET_ENDS_WITH} World`, clientPort, host)
        })
      })
    })
  })

  describe('server with custom opts and client with default settings', () => {
    it('should see the client not able to process a packet (startsWith)', done => {
      const server = dgram.createSocket('udp4')
      server.unref()
      SocketPacket.bind(server, null, { type: 'udp4', startsWith: '!123!' })

      const client = dgram.createSocket('udp4')
      client.unref()
      SocketPacket.bind(client, null, { type: 'udp4' })

      client.on('packet', () => {
        client.close()
        server.close()
        done(new Error('Received a packet when packet extraction should not be possible'))
      })

      client.on('error', err => {
        client.close()
        server.close()

        assert.equal(err.message, 'Malformed packet received: !123!ping-@!!@-')

        done()
      })

      server.bind(serverPort, host, () => {
        client.bind(clientPort, host, () => {
          server.dispatch('ping', clientPort, host)
        })
      })
    })

    it('should see the client not able to process a packet (endsWith)', done => {
      const server = dgram.createSocket('udp4')
      server.unref()
      SocketPacket.bind(server, null, { type: 'udp4', endsWith: '!123!' })

      const client = dgram.createSocket('udp4')
      client.unref()
      SocketPacket.bind(client, null, { type: 'udp4' })

      client.on('packet', () => {
        clearTimeout(timeout)
        client.close()
        server.close()
        done(new Error('Received a packet when packet extraction should not be possible'))
      })

      const timeout = setTimeout(() => {
        client.close()
        server.close()
        done()
      }, 150)

      server.bind(serverPort, host, () => {
        client.bind(clientPort, host, () => {
          server.dispatch('ping', clientPort, host)
        })
      })
    })

    it('should see the server error when the client sends invalid json to a json specific parser (packetParser)', done => {
      const server = dgram.createSocket('udp4')
      server.unref()
      SocketPacket.bind(server, null, { type: 'udp4', packetParser: packet => packet && JSON.parse(packet) })

      const client = dgram.createSocket('udp4')
      client.unref()
      SocketPacket.bind(client, null, { type: 'udp4' })

      server.on('packet', () => {
        client.close()
        server.close()
        done(new Error('Expected packet parsing to error, should not get here'))
      })

      server.on('error', err => {
        client.close()
        server.close()

        assert(err instanceof Error, 'Expected err to be an instance of an error, but wasn\'t')
        assert.equal(err.message, 'Parsing of inbound packet errored: Unexpected token p in JSON at position 0')

        done()
      })

      server.bind(serverPort, host, () => {
        client.bind(clientPort, host, () => {
          client.dispatch('ping', serverPort, host)
        })
      })
    })

    it('should see the client get a json object as a string when server has a custom jsonStringifier (packetStringifier)', done => {
      const server = dgram.createSocket('udp4')
      server.unref()
      SocketPacket.bind(server, null, { type: 'udp4', packetStringifier: packet => packet && JSON.stringify(packet) })

      const client = dgram.createSocket('udp4')
      client.unref()
      SocketPacket.bind(client, null, { type: 'udp4' })

      server.on('packet', () => {
        client.close()
        server.close()
        done(new Error('Expected packet parsing to error, should not get here'))
      })

      server.on('error', err => {
        client.close()
        server.close()

        done(err)
      })

      client.on('packet', packet => {
        client.close()
        server.close()

        assert.equal(packet, '{"hello":"world"}')
        done()
      })

      client.on('error', err => {
        client.close()
        server.close()
        done(err)
      })

      server.bind(serverPort, host, () => {
        client.bind(clientPort, host, () => {
          server.dispatch({ hello: 'world' }, clientPort, host)
        })
      })
    })

    it('should see the client get a stringified value of a json packet (packetStringifier)', done => {
      const server = dgram.createSocket('udp4')
      server.unref()
      SocketPacket.bind(server, null, { type: 'udp4', packetStringifier: packet => packet && JSON.stringify(packet) })

      const client = dgram.createSocket('udp4')
      client.unref()
      SocketPacket.bind(client, null, { type: 'udp4' })

      server.on('packet', () => {
        client.close()
        server.close()
        done(new Error('Expected packet parsing to error, should not get here'))
      })

      server.on('error', err => {
        client.close()
        server.close()

        done(err)
      })

      client.on('packet', packet => {
        client.close()
        server.close()

        assert.equal(packet, '{"hello":"world"}')
        done()
      })

      client.on('error', err => {
        client.close()
        server.close()
        done(err)
      })

      server.bind(serverPort, host, () => {
        client.bind(clientPort, host, () => {
          server.dispatch({ hello: 'world' }, clientPort, host)
        })
      })
    })
  })
})
