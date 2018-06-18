/* eslint-env node, mocha */
import assert from 'assert'
import { Socket } from 'net'
import SocketPacket from '../../src/index'

describe('SocketPacket', () => {
  let socket
  let socketPacket

  beforeEach(() => {
    socket = new Socket()
    socketPacket = SocketPacket.bind(socket)
  })
  afterEach(() => {
    socket = undefined
    socketPacket = undefined
  })

  describe('#constructor', () => {
    it('should initialize with defaults', () => {
      socket = new Socket()
      assert.strictEqual(socket.dispatch, undefined)
      assert.strictEqual(socket.listeners('data').length, 0)
      assert.strictEqual(socket.listeners('message').length, 0)

      socketPacket = SocketPacket.bind(socket)

      assert.equal(typeof socket.dispatch, 'function')
      assert.strictEqual(socket.listeners('data').length, 1)
      assert.strictEqual(socket.listeners('message').length, 0)

      assert.strictEqual(socket, socketPacket._socket)
      assert.strictEqual(socketPacket._logger, undefined)
      assert.deepEqual(socketPacket._buffer, '')
      assert.equal(typeof socketPacket._packetStringifier, 'function')
      assert.equal(typeof socketPacket._packetParser, 'function')
      assert.equal(socketPacket._startsWith, SocketPacket.PACKET_STARTS_WITH)
      assert.equal(socketPacket._startLen, SocketPacket.PACKET_STARTS_WITH.length)
      assert.equal(socketPacket._endsWith, SocketPacket.PACKET_ENDS_WITH)
      assert.equal(socketPacket._endLen, SocketPacket.PACKET_ENDS_WITH.length)
      assert.equal(socketPacket._encoding, 'utf8')
      assert.equal(socketPacket._type, 'net')
    })

    it('should throw an error if type is invalid', () => {
      return Promise.resolve()
        .then(() => {
          socket = new Socket()
          socketPacket = SocketPacket.bind(socket, null, { type: 'fakeType' })
        })
        .then(() => {
          throw new Error('Expected an error to be thown but wasnt')
        }, err => {
          assert(err instanceof Error)
          assert.equal(err.message, 'SocketPacket constructed with invalid arguments')
        })
    })
  })

  describe('#onData', () => {
    describe('should swallow empty data and not emit any packet info', () => {
      const data = ''

      it('invoking onData', () => {
        socket.on('packet', packet => {
          assert.fail('Should not get here')
        })
        socketPacket.onData(data)
      })

      it('via emit event', () => {
        socket.on('packet', packet => {
          assert.fail('Should not get here')
        })
        socket.emit('data', data)
      })
    })

    describe('should swallow well formed data that has no content and not emit any packet info', () => {
      const data = `${SocketPacket.PACKET_STARTS_WITH}${SocketPacket.PACKET_ENDS_WITH}`

      it('invoking onData', () => {
        socket.on('packet', packet => {
          assert.fail('Should not get here')
        })
        socketPacket.onData(data)
      })

      it('via emit event', () => {
        socket.on('packet', packet => {
          assert.fail('Should not get here')
        })
        socket.emit('data', data)
      })
    })

    describe('should emit once and emit an error when packet is found within an invalid packet start', () => {
      const data = `123${SocketPacket.PACKET_STARTS_WITH}abc${SocketPacket.PACKET_ENDS_WITH}`

      it('invoking onData', done => {
        let errorHandled = false
        socket.on('packet', packet => {
          assert.equal(packet, 'abc')
          assert(errorHandled)
          done()
        })
        socket.on('error', err => {
          assert(err instanceof Error, 'Expected err to be an instance of an error, but wasn\'t')
          assert.equal(err.message, 'Malformed packet received: 123')
          errorHandled = true
        })
        socketPacket.onData(data)
      })

      it('via emit event', done => {
        let errorHandled = false
        socket.on('packet', packet => {
          assert.equal(packet, 'abc')
          assert(errorHandled)
          done()
        })
        socket.on('error', err => {
          errorHandled = true
          assert(err instanceof Error, 'Expected err to be an instance of an error, but wasn\'t')
          assert.equal(err.message, 'Malformed packet received: 123')
        })
        socket.emit('data', data)
      })
    })

    describe('should emit once for a single packet in a whole data object', () => {
      it('invoking onData', done => {
        const message = 'abc'
        const data = socketPacket.package(message)
        const handledPackets = []

        const runChecks = () => {
          assert.deepEqual(handledPackets, [message])
          done()
        }

        socket.on('packet', packet => {
          handledPackets.push(packet)
          runChecks()
        })
        socketPacket.onData(data)
      })

      it('via emit event', done => {
        const message = 'abc'
        const data = socketPacket.package(message)
        const handledPackets = []

        const runChecks = () => {
          assert.deepEqual(handledPackets, [message])
          done()
        }

        socket.on('packet', packet => {
          handledPackets.push(packet)
          runChecks()
        })
        socket.emit('data', data)
      })
    })

    describe('should emit once for a single packet in a data object that has one item and the start of another but no end', () => {
      it('invoking onData', done => {
        const message = 'abc'
        const data = `${socketPacket.package(message)}${SocketPacket.PACKET_STARTS_WITH}123`
        const handledPackets = []

        const runChecks = () => {
          assert.deepEqual(handledPackets, [message])
          done()
        }

        socket.on('packet', packet => {
          handledPackets.push(packet)
          runChecks()
        })
        socketPacket.onData(data)
      })

      it('via emit event', done => {
        const message = 'abc'
        const data = `${socketPacket.package(message)}${SocketPacket.PACKET_STARTS_WITH}123`
        const handledPackets = []

        const runChecks = () => {
          assert.deepEqual(handledPackets, [message])
          done()
        }

        socket.on('packet', packet => {
          handledPackets.push(packet)
          runChecks()
        })
        socket.emit('data', data)
      })
    })

    describe('should emit twice for two packets in a single data object', () => {
      it('invoking onData', done => {
        const messageA = 'abc'
        const messageB = '123'
        const data = `${socketPacket.package(messageA)}${socketPacket.package(messageB)}`
        const handledPackets = []

        const runChecks = () => {
          assert.deepEqual(handledPackets, [messageA, messageB])
          done()
        }

        socket.on('packet', packet => {
          handledPackets.push(packet)

          if (handledPackets.length === 2) {
            runChecks()
          }
        })
        socketPacket.onData(data)
      })

      it('via emit event', done => {
        const messageA = 'abc'
        const messageB = '123'
        const data = `${socketPacket.package(messageA)}${socketPacket.package(messageB)}`
        const handledPackets = []

        const runChecks = () => {
          assert.deepEqual(handledPackets, [messageA, messageB])
          done()
        }

        socket.on('packet', packet => {
          handledPackets.push(packet)

          if (handledPackets.length === 2) {
            runChecks()
          }
        })
        socket.emit('data', data)
      })
    })

    describe('should emit once for a packet that is split amoungst 2 data objects', () => {
      it('invoking onData', done => {
        const dataA = `${SocketPacket.PACKET_STARTS_WITH}123`
        const dataB = `abc${SocketPacket.PACKET_ENDS_WITH}`

        const handledPackets = []

        const runChecks = () => {
          assert.deepEqual(handledPackets, ['123abc'])
          done()
        }

        socket.on('packet', packet => {
          handledPackets.push(packet)
          runChecks()
        })
        socketPacket.onData(dataA)
        socketPacket.onData(dataB)
      })

      it('via emit event', done => {
        const dataA = `${SocketPacket.PACKET_STARTS_WITH}123`
        const dataB = `abc${SocketPacket.PACKET_ENDS_WITH}`

        const handledPackets = []

        const runChecks = () => {
          assert.deepEqual(handledPackets, ['123abc'])
          done()
        }

        socket.on('packet', packet => {
          handledPackets.push(packet)
          runChecks()
        })
        socket.emit('data', dataA)
        socket.emit('data', dataB)
      })
    })

    describe('should emit once for a packet that is split amoungst 3 data objects', () => {
      it('invoking onData', done => {
        const dataA = `${SocketPacket.PACKET_STARTS_WITH}123`
        const dataB = `abc`
        const dataC = `!@#$${SocketPacket.PACKET_ENDS_WITH}`

        const handledPackets = []

        const runChecks = () => {
          assert.deepEqual(handledPackets, ['123abc!@#$'])
          done()
        }

        socket.on('packet', packet => {
          handledPackets.push(packet)
          runChecks()
        })
        socketPacket.onData(dataA)
        socketPacket.onData(dataB)
        socketPacket.onData(dataC)
      })

      it('via emit event', done => {
        const dataA = `${SocketPacket.PACKET_STARTS_WITH}123`
        const dataB = `abc`
        const dataC = `!@#$${SocketPacket.PACKET_ENDS_WITH}`

        const handledPackets = []

        const runChecks = () => {
          assert.deepEqual(handledPackets, ['123abc!@#$'])
          done()
        }

        socket.on('packet', packet => {
          handledPackets.push(packet)
          runChecks()
        })
        socket.emit('data', dataA)
        socket.emit('data', dataB)
        socket.emit('data', dataC)
      })
    })
  })

  describe('#package', () => {
    const datas = [undefined, null, '', 'hello world', 'This is some FUNNY business YO@@!']

    datas.forEach(data => {
      it(`should return the created packet with defaults when using the default constructor (${data})`, () => {
        const expected = `${SocketPacket.PACKET_STARTS_WITH}${data || ''}${SocketPacket.PACKET_ENDS_WITH}`
        const result = socketPacket.package(data)

        assert.equal(result, expected)
      })
    })

    it('should return the result of the specified packetStringifier (JSON)', () => {
      const opts = {
        packetStringifier: data => data && JSON.stringify(data)
      }
      socketPacket = SocketPacket.bind(socket, null, opts)

      let data // = undefined
      let packet = socketPacket.package(data)
      let expected = `${SocketPacket.PACKET_STARTS_WITH}${SocketPacket.PACKET_ENDS_WITH}`
      assert.equal(packet, expected)

      data = null
      packet = socketPacket.package(data)
      expected = `${SocketPacket.PACKET_STARTS_WITH}${SocketPacket.PACKET_ENDS_WITH}`
      assert.equal(packet, expected)

      data = ''
      packet = socketPacket.package(data)
      expected = `${SocketPacket.PACKET_STARTS_WITH}${data}${SocketPacket.PACKET_ENDS_WITH}`
      assert.equal(packet, expected)

      data = { hello: 'world' }
      packet = socketPacket.package(data)
      expected = `${SocketPacket.PACKET_STARTS_WITH}{"hello":"world"}${SocketPacket.PACKET_ENDS_WITH}`
      assert.equal(packet, expected)

      data = { hello: 'world', boy: { male: true, adult: false, name: 'Tony' } }
      packet = socketPacket.package(data)
      expected = `${SocketPacket.PACKET_STARTS_WITH}{"hello":"world","boy":{"male":true,"adult":false,"name":"Tony"}}${SocketPacket.PACKET_ENDS_WITH}`
      assert.equal(packet, expected)
    })
  })

  describe('#parsePacket', () => {
    it('should return the exact data that it was invoked with when using the default constructor', () => {
      const packets = [undefined, null, '', 'abcd', new Date().toString()]
      packets.forEach(packet => {
        const parsedPacket = socketPacket.parsePacket(packet)
        assert.equal(packet, parsedPacket)
      })
    })

    it('should return the result of the specified packetParser (JSON)', () => {
      const opts = {
        packetParser: packet => packet && JSON.parse(packet)
      }
      socketPacket = SocketPacket.bind(socket, null, opts)

      let packet // = undefined
      let parsedPacket = socketPacket.parsePacket(packet)
      assert.equal(packet, parsedPacket)

      packet = null
      parsedPacket = socketPacket.parsePacket(packet)
      assert.equal(packet, parsedPacket)

      packet = ''
      parsedPacket = socketPacket.parsePacket(packet)
      assert.equal(packet, parsedPacket)

      packet = '{ "hello": "world" }'
      let expected = { hello: 'world' }
      parsedPacket = socketPacket.parsePacket(packet)
      assert.deepEqual(expected, parsedPacket)

      packet = '{ "hello": "world", "boy": { "male": true, "adult": false, "name": "Tony" } }'
      expected = {
        hello: 'world',
        boy: {
          male: true,
          adult: false,
          name: 'Tony'
        }
      }

      parsedPacket = socketPacket.parsePacket(packet)
      assert.deepEqual(expected, parsedPacket)
    })
  })

  describe('#log', () => {
    const logger = {
      critical: function () {
        return { ...arguments, level: 'critical' }
      },
      error: function () {
        return { ...arguments, level: 'error' }
      },
      warn: function () {
        return { ...arguments, level: 'warn' }
      },
      info: function () {
        return { ...arguments, level: 'info' }
      },
      debug: function () {
        return { ...arguments, level: 'debug' }
      },
      log: function () {
        return { ...arguments, level: 'log' }
      }
    }

    it('should return undefined and not actually attempt to invoke a logger when using the default constructor', () => {
      const result = socketPacket.log('error', 'This is a test')
      assert.strictEqual(result, undefined)
    })

    Object.keys(logger).forEach(key => {
      it(`should log to ${key} when a logger has been specified`, () => {
        socket = new Socket()
        socketPacket = SocketPacket.bind(socket, logger)

        let result = socketPacket.log(key, 'Some error message')
        assert.equal(result.level, key)
        assert.equal(result[0], 'Some error message')

        result = socketPacket.log(key, 'Some error message', 'Some added info')
        assert.equal(result.level, key)
        assert.equal(result[0], 'Some error message')
        assert.equal(result[1], 'Some added info')

        result = socketPacket.log(key, 'Some error message', { code: 123 })
        assert.equal(result.level, key)
        assert.equal(result[0], 'Some error message')
        assert.deepEqual(result[1], { code: 123 })
      })
    })
  })
})
