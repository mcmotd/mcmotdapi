const net = require('net');
const varint = require('varint');

class MCBuffer {
  constructor(buffer) {
    this._buffer = buffer;
    this._offset = 0;
  }

  readVarInt() {
    let val = 0;
    let count = 0;

    while (true) {
      if (this._offset >= this._buffer.length) {
        // 数据还没收全，交给上层继续等
        const err = new RangeError('buffer underflow');
        err.code = 'INCOMPLETE';
        throw err;
      }

      const b = this._buffer.readUInt8(this._offset++);

      val |= (b & 0x7F) << count++ * 7;

      if ((b & 0x80) != 128) {
        break;
      }

      if (count > 5) {
        throw new Error('VarInt is too big');
      }
    }

    return val;
  }

  readString() {
    const length = this.readVarInt();
    if (this._offset + length > this._buffer.length) {
      const err = new RangeError('buffer underflow');
      err.code = 'INCOMPLETE';
      throw err;
    }
    const val = this._buffer.toString('UTF-8', this._offset, this._offset + length);
    this._offset += length;

    return val;
  }

  offset() {
    return this._offset;
  }
}

// https://wiki.vg/Protocol#Packet_format
function create_packet(packetId, data) {
  let pid = Buffer.from(varint.encode(packetId));
  return Buffer.concat([Buffer.from(varint.encode(data.length + pid.length)), pid, data]);
}

/**
 * 尝试从已接收的字节流中解析状态响应
 * @returns {{state:'incomplete'}|{state:'error',message:string}|{state:'ok',data:object}}
 */
function tryParseStatus(buffer) {
  let length;
  let reader;
  try {
    reader = new MCBuffer(buffer);
    length = reader.readVarInt();
  } catch (e) {
    if (e.code === 'INCOMPLETE') return { state: 'incomplete' };
    return { state: 'error', message: `解析包长度失败: ${e.message}` };
  }

  if (buffer.length - reader.offset() < length) {
    return { state: 'incomplete' };
  }

  try {
    const packetId = reader.readVarInt();
    if (packetId !== 0x00) {
      return { state: 'error', message: `非预期的包 ID: 0x${packetId.toString(16)}` };
    }
    const json = reader.readString();
    try {
      return { state: 'ok', data: JSON.parse(json) };
    } catch (e) {
      return { state: 'error', message: `状态响应不是合法 JSON: ${e.message}` };
    }
  } catch (e) {
    if (e.code === 'INCOMPLETE') return { state: 'incomplete' };
    return { state: 'error', message: `解析状态响应失败: ${e.message}` };
  }
}

/**
 * 查询 Java 版服务器状态
 * @param {string} host 实际连接地址（可能是 SRV 指向的目标）
 * @param {number} port 实际连接端口
 * @param {number|object} options 数字=统一超时；对象可分别指定 connectTimeout / readTimeout / handshakeHost
 */
function fetch(host, port, options = {}) {
  const opts = typeof options === 'number' ? { timeout: options } : (options || {});
  const connectTimeout = opts.connectTimeout || opts.timeout || 5000;
  const readTimeout = opts.readTimeout || opts.timeout || 5000;
  // 握手里的 host 必须是玩家输入的原始域名（SRV 目标不能替代它），
  // 否则 BungeeCord / Velocity / TCPShield 之类的虚拟主机路由会认错服务器
  const handshakeHost = opts.handshakeHost || host;

  return new Promise((resolve, reject) => {
    let settled = false;
    const client = new net.Socket();
    client.setNoDelay(true);

    let connectTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      client.destroy();
      reject(new Error(`TCP 连接超时(${connectTimeout}ms)`));
    }, connectTimeout);

    const cleanup = () => {
      clearTimeout(connectTimer);
    };

    client.on('error', (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`连接 ${host}:${port} 失败: ${err.code || err.message}`));
    });

    client.on('connect', () => {
      if (settled) return;
      cleanup(); // 连接成功，切到读超时
      client.setTimeout(readTimeout);

      const hostBuf = Buffer.from(handshakeHost, 'utf-8');
      const portBuf = Buffer.from([port >> 8, port & 0xFF]);
      const handshake = create_packet(0x00, Buffer.concat([
        Buffer.from(varint.encode(-1)),             // 协议版本 -1，让服务端直接返回状态
        Buffer.from(varint.encode(hostBuf.length)), // 必须是字节长度，不能用字符长度
        hostBuf,
        portBuf,
        Buffer.from(varint.encode(1))               // next state = status
      ]));
      client.write(handshake);
      client.write(create_packet(0x00, Buffer.from([])));
    });

    client.on('close', () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('连接被对端关闭，未返回状态数据'));
    });

    client.on('timeout', () => {
      if (settled) return;
      settled = true;
      cleanup();
      client.destroy();
      reject(new Error(`等待状态响应超时(${readTimeout}ms)`));
    });

    let responseBuffer = Buffer.alloc(0);
    client.on('data', (data) => {
      if (settled) return;
      responseBuffer = Buffer.concat([responseBuffer, data]);

      const parsed = tryParseStatus(responseBuffer);
      if (parsed.state === 'incomplete') return;

      settled = true;
      cleanup();
      client.destroy();

      if (parsed.state === 'ok') return resolve(parsed.data);
      return reject(new Error(parsed.message));
    });

    client.connect({ host, port });
  });
}

module.exports = {
  fetch
};
