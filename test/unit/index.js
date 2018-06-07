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
      assert.strictEqual(socket.send, undefined)
      assert.strictEqual(socket.listeners('data').length, 0)

      socketPacket = SocketPacket.bind(socket)

      assert.deepEqual(socket._packetBuffers, {})
      assert.strictEqual(socket._idSeed, 1)

      assert.equal(typeof socket.send, 'function')
      assert.strictEqual(socket.listeners('data').length, 1)

      assert.strictEqual(socket, socketPacket._socket)
      assert.strictEqual(socketPacket._logger, undefined)
      assert.equal(typeof socketPacket._packetStringifier, 'function')
      assert.equal(typeof socketPacket._packetParser, 'function')
      assert.equal(socketPacket._startsWith, SocketPacket.PACKET_STARTS_WITH)
      assert.equal(socketPacket._endsWith, SocketPacket.PACKET_ENDS_WITH)
      assert.equal(socketPacket._encoding, 'utf8')
    })
  })

  describe('#createPacket', () => {
    const datas = ['', 'hello world', 'This is some FUNNY business YO@@!']

    datas.forEach(data => {
      it(`should return the created packet with defualts when using the default constructor (${data})`, () => {
        const expected = `${SocketPacket.PACKET_STARTS_WITH}${data}${SocketPacket.PACKET_ENDS_WITH}`
        const result = socketPacket.createPacket(data)

        assert.equal(result, expected)
      })
    })

    it('should return the result of the specified packetStringifier (JSON)', () => {
      const opts = {
        packetStringifier: data => data && JSON.stringify(data)
      }
      socketPacket = SocketPacket.bind(socket, null, opts)

      let data // = undefined
      let packet = socketPacket.createPacket(data)
      let expected = `${SocketPacket.PACKET_STARTS_WITH}${data}${SocketPacket.PACKET_ENDS_WITH}`
      assert.equal(packet, expected)

      data = null
      packet = socketPacket.createPacket(data)
      expected = `${SocketPacket.PACKET_STARTS_WITH}${data}${SocketPacket.PACKET_ENDS_WITH}`
      assert.equal(packet, expected)

      data = ''
      packet = socketPacket.createPacket(data)
      expected = `${SocketPacket.PACKET_STARTS_WITH}${data}${SocketPacket.PACKET_ENDS_WITH}`
      assert.equal(packet, expected)

      data = { hello: 'world' }
      packet = socketPacket.createPacket(data)
      expected = `${SocketPacket.PACKET_STARTS_WITH}{"hello":"world"}${SocketPacket.PACKET_ENDS_WITH}`
      assert.equal(packet, expected)

      data = { hello: 'world', boy: { male: true, adult: false, name: 'Tony' } }
      packet = socketPacket.createPacket(data)
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

  describe('#getBufferById', () => {
    beforeEach(() => {
      socketPacket._socket._packetBuffers[1] = 'abc'
      socketPacket._socket._packetBuffers[2] = 'abc-@!!@-123'
      socketPacket._socket._packetBuffers[5] = 'hello world'
    })

    it('should return undefined when bufferId doesn\'t exist', () => {
      const result = socketPacket.getBufferById(3)
      assert.strictEqual(result, undefined)
    })

    it('should resturn the value when matched', () => {
      let result = socketPacket.getBufferById(1)
      assert.equal(result, 'abc')

      result = socketPacket.getBufferById(2)
      assert.equal(result, 'abc-@!!@-123')

      result = socketPacket.getBufferById(5)
      assert.equal(result, 'hello world')
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
