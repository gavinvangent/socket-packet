class SocketPacket {
  constructor (socket, logger, opts = {}) {
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

    this._buffer = ''
    this._encoding = opts.encoding || 'utf8'
  }

  onData (data) {
    this._buffer += data.toString(this._encoding)

    let idx
    const packets = []

    while ((idx = this._buffer.indexOf(this._endsWith)) !== -1) {
      let end = idx + this._endLen

      const startIdx = this._buffer.indexOf(this._startsWith)
      if (startIdx !== 0 && startIdx < idx) {
        end = startIdx
      }

      const packet = this._buffer.substr(0, end)
      this._buffer = this._buffer.substr(end)
      packets.push(packet)
    }

    packets.forEach(packet => {
      if (packet.indexOf(this._startsWith) !== 0 || packet.indexOf(this._endsWith) !== packet.length - this._endLen) {
        this._socket.emit('error', `Malformed packet received: ${packet}`)
        return
      }

      const strippedPacket = packet.substring(this._startLen, packet.length - this._endLen)
      if (!strippedPacket) {
        return
      }

      let parsedPacket

      try {
        parsedPacket = this.parsePacket(strippedPacket)
        this._socket.emit('packet', parsedPacket)
      } catch (err) {
        this.log('error', `Packet parse failed!: ${strippedPacket}`)
        this._socket.emit('error', `Parsing of inbound packet errored: ${err.message}`)
      }
    })
  }

  package (data) {
    return `${this._startsWith}${this._packetStringifier(data) || ''}${this._endsWith}`
  }

  parsePacket (packet) {
    return this._packetParser(packet)
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
