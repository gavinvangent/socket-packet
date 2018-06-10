class SocketPacket {
  constructor (socket, logger, opts = {}) {
    socket._packetBuffers = {}
    socket._idSeed = 1

    socket.on('data', data => this.onData(data))
    socket.send = (data, cb) => socket.write(this.package(data), cb)

    this._socket = socket
    this._logger = logger

    this._packetStringifier = opts.packetStringifier || (packet => packet && packet.toString())
    this._packetParser = opts.packetParser || (packet => packet && packet.toString())

    this._startsWith = opts.startsWith || SocketPacket.PACKET_STARTS_WITH
    this._startLen = this._startsWith.length

    this._endsWith = opts.endsWith || SocketPacket.PACKET_ENDS_WITH
    this._endLen = this._endsWith.length

    this._encoding = opts.encoding || 'utf8'
  }

  onData (data) {
    if (!this._socket._bufferId) {
      this._socket._bufferId = this._socket._idSeed++
      this._socket._packetBuffers[this._socket._bufferId] = {
        buffer: ''
      }
    }

    const bufferId = this._socket._bufferId
    const socketBuf = this.getBufferById(bufferId)
    data = data.toString(this._encoding)

    if (socketBuf.buffer.length === 0 && data.substr(0, this._startLen) !== this._startsWith) {
      // ignore packet because not starting properly and there are no previous parts available

      this.log('error', 'Invalid inbound data')

      const i = data.indexOf(this._startsWith)
      if (i < 0) {
        // no other packet data
        return
      }

      this.log('warn', 'Valid packet found within invalid inbound data')
      data = data.substr(i)
    }

    socketBuf.buffer += data
    if (!socketBuf.buffer) {
      // empty buffer
      return
    }

    let idx = 0
    const packets = []

    while ((idx = socketBuf.buffer.indexOf(this._endsWith)) !== -1) {
      packets.push(socketBuf.buffer.substr(0, idx + this._endLen))
      socketBuf.buffer = socketBuf.buffer.substr(idx + this._endLen)
    }

    if (!packets.length) {
      // no full packets found
      return
    }

    packets.forEach(packet => {
      let strippedPacket = packet.replace(this._startsWith, '').replace(this._endsWith, '')
      if (!strippedPacket) {
        return
      }

      let parsedPacket

      try {
        parsedPacket = this.parsePacket(strippedPacket)
        this._socket.emit('packet', parsedPacket)
      } catch (err) {
        console.log(err)
        this.log('error', `Packet parse failed!: ${strippedPacket}`)
        this._socket.emit('error', new Error('Parsing of inbound packet errored', err))
      }
    })
  }

  package (data) {
    return `${this._startsWith}${this._packetStringifier(data) || ''}${this._endsWith}`
  }

  parsePacket (packet) {
    return this._packetParser(packet)
  }

  getBufferById (bufferId) {
    return this._socket._packetBuffers[bufferId]
  }

  log () {
    if (!this._logger) {
      return
    }

    const args = Array.from(arguments)
    const level = args.shift()

    return this._logger[level].apply(this._logger, args)
  }
}

SocketPacket.bind = (socket, logger, opts) => {
  return new SocketPacket(socket, logger, opts)
}

SocketPacket.PACKET_STARTS_WITH = '-!@@!-'
SocketPacket.PACKET_ENDS_WITH = '-@!!@-'

export default SocketPacket
