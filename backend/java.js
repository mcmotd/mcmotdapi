const net = require('net')
const varint = require('varint')

class MCBuffer {
  constructor(buffer) {
    this._buffer = buffer
    this._offset = 0
  }

  readVarInt() {
    let val = 0
    let count = 0

    while (true) {
      const b = this._buffer.readUInt8(this._offset++)

      val |= (b & 0x7F) << count++ * 7;

      if ((b & 0x80) != 128) {
        break
      }
    }

    return val
  }

  readString() {
    const length = this.readVarInt()
    const val = this._buffer.toString('UTF-8', this._offset, this._offset + length)
    this._offset += length

    return val
  }

  offset() {
    return this._offset
  }
}

// https://wiki.vg/Protocol#Packet_format
function create_packet(packetId, data) {
  let pid = Buffer.from(varint.encode(packetId))
  return Buffer.concat([Buffer.from(varint.encode(data.length + pid.length)), pid, data])
}

async function fetch(host, port) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.setNoDelay(true)
    client.connect({
      host,
      port
    })
    client.setTimeout(10000)
    let buf = Buffer.alloc(0)
    client.on('error', (err) => {
      return reject(err)
    })
    client.on('connect', () => {
      let portBuf = Buffer.from([port >> 8, port & 0xFF]) // ushort
      let buf = create_packet(0x00, Buffer.concat([
        Buffer.from(varint.encode(-1)),
        Buffer.from(varint.encode(host.length)),
        Buffer.from(host, 'utf-8'),
        portBuf,
        Buffer.from(varint.encode(1))
      ]))
      client.write(buf)
      client.write(create_packet(0x00, Buffer.from([])))
    })
    client.on('data', (data) => {
      buf = Buffer.concat([buf, data])
      if (buf.length < 5) {
        // VarInts are never longer than 5 bytes
        // https://wiki.vg/Data_types#VarInt_and_VarLong
        return
      }
      const reader = new MCBuffer(buf)
      const length = reader.readVarInt();
      if (buf.length - reader.offset() < length) {
        return;
      }
      const packetId = reader.readVarInt()
      if (!packetId) {
        const data = reader.readString()
        resolve(JSON.parse(data))
        client.destroy()
      }
    })
  })
}

module.exports = {
  fetch
}