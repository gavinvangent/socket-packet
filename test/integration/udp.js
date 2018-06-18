/* eslint-env node, mocha */

import assert from 'assert'
import dgram from 'dgram'
import SocketPacket from '../../src/index'

const host = 'localhost'
const serverPort = 7171
const clientPort = 7272

describe('UDP/Datagram usage', () => {
  describe('server and client with default settings', () => {
    it('should be able to interface successfully', done => {
      const server = dgram.createSocket('udp4')
      SocketPacket.bind(server, null, { type: 'udp' })

      const client = dgram.createSocket('udp4')
      SocketPacket.bind(client, null, { type: 'udp4' })

      server.on('packet', (packet, rInfo) => {
        clearTimeout(timeout)
        client.close()
        server.close()
        assert.equal(packet, 'pong')
        done()
      })

      server.on('error', error => {
        clearTimeout(timeout)
        client.close()
        server.close()
        done(error)
      })

      client.on('packet', (packet, rInfo) => {
        assert.equal(packet, 'ping')
        client.dispatch('pong', rInfo.port, rInfo.address)
      })

      client.on('error', error => {
        clearTimeout(timeout)
        client.end()
        server.close()
        done(error)
      })

      server.bind(serverPort, host, () => {
        client.bind(clientPort, host, () => {
          server.dispatch('ping', clientPort, host)
        })
      })

      const timeout = setTimeout(() => {
        done(new Error('Test did not execute within 500ms'))
      }, 500)
    })

    /*
    it('should be able to interface successfully using big data', done => {
      let client
      const server = net.createServer(socket => {
        SocketPacket.bind(socket)

        let dataCount = 0
        socket.on('data', data => {
          dataCount++
        })

        socket.on('packet', packet => {
          client.end()
          server.close()
          assert.equal(packet, message)
          assert(dataCount > 1)
          done()
        })

        socket.on('error', error => {
          client.end()
          server.close()
          done(error)
        })

        let message = ''
        for (let i = 0; i < 3000; i++) {
          message += 'BIGDATA_BIGDATA_BIGDATA_BIGDATA_BIGDATA_BIGDATA_BIGDATA_BIGDATA_BIGDATA_BIGDATA_BIGDATA_BIGDATA_BIGDATA_'
        }

        socket.send(message)
      })

      server.listen(port, host, () => {
        client = net.createConnection({ host, port }, () => {
          SocketPacket.bind(client)

          client.on('packet', client.send)
          client.on('error', error => {
            client.end()
            server.close()
            done(error)
          })
        })
      })
    })

    it('should see the client emit an error if the `endsWith` suffix is sent in message, creating what looks like an extra malformed packet', done => {
      const server = net.createServer(socket => {
        SocketPacket.bind(socket)
        socket.send(`Hello ${SocketPacket.PACKET_ENDS_WITH} World`)
      })

      server.listen(port, host, () => {
        const client = net.createConnection({ host, port }, () => {
          SocketPacket.bind(client)

          let packetReceiveCount = 0
          client.on('packet', () => {
            packetReceiveCount++
          })

          client.on('error', error => {
            client.end()
            server.close()
            assert.strictEqual(packetReceiveCount, 1)
            assert.equal(error, 'Malformed packet received:  World-@!!@-')
            done()
          })
        })
      })
    })
  })

  describe('server with custom opts and client with default settings', () => {
    it('should see the client not able to process a packet (startsWith)', done => {
      const server = net.createServer(socket => {
        const opts = {
          startsWith: '!123!'
        }
        SocketPacket.bind(socket, null, opts)

        socket.send('ping')
      })

      server.listen(port, host, () => {
        const client = net.createConnection({ host, port }, () => {
          SocketPacket.bind(client)

          client.on('packet', packet => {
            client.end()
            server.close()
            done(new Error('Received a packet when packet extraction should not be possible'))
          })

          client.on('error', error => {
            client.end()
            server.close()

            assert.equal(error, 'Malformed packet received: !123!ping-@!!@-')

            done()
          })
        })
      })
    })

    it('should see the client not able to process a packet (endsWith)', done => {
      const server = net.createServer(socket => {
        const opts = {
          endsWith: '!123!'
        }
        SocketPacket.bind(socket, null, opts)

        socket.send('ping')
      })

      server.listen(port, host, () => {
        const client = net.createConnection({ host, port }, () => {
          SocketPacket.bind(client)

          client.on('packet', packet => {
            clearTimeout(timeout)
            client.end()
            server.close()
            done(new Error('Received a packet when packet extraction should not be possible'))
          })

          const timeout = setTimeout(() => {
            client.end()
            server.close()
            done()
          }, 150)
        })
      })
    })

    it.only('should see the server error when the client sends invalid json to a json specific parser (packetParser)', done => {
      let client
      const server = net.createServer(socket => {
        const opts = {
          packetParser: packet => packet && JSON.parse(packet)
        }
        SocketPacket.bind(socket, null, opts)

        socket.on('packet', () => {
          client.end()
          server.close()
          done(new Error('Expected packet parsing to error, should not get here'))
        })

        socket.on('error', err => {
          client.end()
          server.close()

          assert(err instanceof Error, 'Expected err to be an instance of an error, but wasn\'t')
          assert.equal(err.message, 'Parsing of inbound packet errored: Unexpected token p in JSON at position 0')

          done()
        })
      })

      server.listen(port, host, () => {
        client = net.createConnection({ host, port }, () => {
          SocketPacket.bind(client)
          client.send('ping')
        })
      })
    })

    it('should see the client get a json object as a string when server has a custom jsonStringifier (packetStringifier)', done => {
      let client
      const server = net.createServer(socket => {
        const opts = {
          packetStringifier: packet => packet && JSON.stringify(packet)
        }
        SocketPacket.bind(socket, null, opts)
        socket.on('error', err => {
          client.end()
          server.close()

          done(err)
        })

        socket.send({ hello: 'world' })
      })

      server.listen(port, host, () => {
        client = net.createConnection({ host, port }, () => {
          SocketPacket.bind(client)

          client.on('packet', packet => {
            client.end()
            server.close()

            assert.equal(packet, '{"hello":"world"}')
            done()
          })

          client.on('error', err => {
            client.end()
            server.close()
            done(err)
          })
        })
      })
    })

    it('should see the client get a stringified value of a json packet (packetStringifier)', done => {
      let client
      const server = net.createServer(socket => {
        const opts = {
          packetStringifier: packet => packet && JSON.stringify(packet)
        }
        SocketPacket.bind(socket, null, opts)
        socket.on('error', err => {
          client.end()
          server.close()

          done(err)
        })

        socket.send({ hello: 'world' })
      })

      server.listen(port, host, () => {
        client = net.createConnection({ host, port }, () => {
          SocketPacket.bind(client)

          client.on('packet', packet => {
            client.end()
            server.close()

            assert.equal(packet, '{"hello":"world"}')
            done()
          })

          client.on('error', err => {
            client.end()
            server.close()
            done(err)
          })
        })
      })
    })
    */
  })
})
