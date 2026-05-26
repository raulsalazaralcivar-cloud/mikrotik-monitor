const express = require('express');
const net = require('net');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── MikroTik API Protocol ────────────────────────────────────────────────────

function encodeSentence(words) {
  const bufs = [];
  for (const word of words) {
    const wb = Buffer.from(word, 'utf8');
    const len = wb.length;
    let lb;
    if (len < 0x80) lb = Buffer.from([len]);
    else if (len < 0x4000) lb = Buffer.from([((len >> 8) & 0x3f) | 0x80, len & 0xff]);
    else lb = Buffer.from([((len >> 16) & 0x1f) | 0xc0, (len >> 8) & 0xff, len & 0xff]);
    bufs.push(lb, wb);
  }
  bufs.push(Buffer.from([0])); // end of sentence
  return Buffer.concat(bufs);
}

function decodeLength(buf, offset) {
  const b = buf[offset];
  if ((b & 0x80) === 0) return { len: b, advance: 1 };
  if ((b & 0xc0) === 0x80) return { len: ((b & 0x3f) << 8) | buf[offset + 1], advance: 2 };
  if ((b & 0xe0) === 0xc0) return { len: ((b & 0x1f) << 16) | (buf[offset + 1] << 8) | buf[offset + 2], advance: 3 };
  return { len: 0, advance: 1 };
}

function parseReply(buf) {
  const sentences = [];
  let i = 0;
  let current = [];
  while (i < buf.length) {
    if (buf[i] === 0) {
      if (current.length > 0) sentences.push(current);
      current = [];
      i++;
    } else {
      const { len, advance } = decodeLength(buf, i);
      i += advance;
      const word = buf.slice(i, i + len).toString('utf8');
      i += len;
      current.push(word);
    }
  }
  return sentences;
}

function mikrotikQuery(host, port, user, pass, commands) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const timeout = 8000;
    let buffer = Buffer.alloc(0);
    let authenticated = false;
    let replied = false;

    client.setTimeout(timeout);
    client.connect(port, host, () => {
      // Send login
      client.write(encodeSentence(['/login', `=name=${user}`, `=password=${pass}`]));
    });

    client.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      const sentences = parseReply(buffer);

      for (const s of sentences) {
        if (!authenticated) {
          if (s[0] === '!done') {
            authenticated = true;
            // Send actual command
            for (const cmd of commands) {
              client.write(encodeSentence(cmd));
            }
          } else if (s[0] === '!trap') {
            client.destroy();
            reject(new Error('Auth failed: ' + s.join(', ')));
          }
        } else {
          if (s[0] === '!done' && !replied) {
            replied = true;
            client.destroy();
            const rows = sentences
              .filter(x => x[0] === '!re')
              .map(x => {
                const obj = {};
                x.slice(1).forEach(pair => {
                  const eq = pair.indexOf('=', 1);
                  if (eq > 0) obj[pair.slice(1, eq)] = pair.slice(eq + 1);
                });
                return obj;
              });
            resolve(rows);
          }
        }
      }
    });

    client.on('timeout', () => { client.destroy(); reject(new Error('Connection timeout')); });
    client.on('error', (err) => reject(err));
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Test connection
app.post('/api/connect', async (req, res) => {
  const { host, port = 8728, user, pass } = req.body;
  try {
    const result = await mikrotikQuery(host, parseInt(port), user, pass, [
      ['/system/resource/print']
    ]);
    res.json({ ok: true, data: result[0] || {} });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Get interfaces list
app.post('/api/interfaces', async (req, res) => {
  const { host, port = 8728, user, pass } = req.body;
  try {
    const result = await mikrotikQuery(host, parseInt(port), user, pass, [
      ['/interface/print']
    ]);
    res.json({ ok: true, data: result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Get traffic stats for an interface
app.post('/api/traffic', async (req, res) => {
  const { host, port = 8728, user, pass, interface: iface = 'ether1' } = req.body;
  try {
    const result = await mikrotikQuery(host, parseInt(port), user, pass, [
      ['/interface/print', `?name=${iface}`]
    ]);
    res.json({ ok: true, data: result[0] || {}, timestamp: Date.now() });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MikroTik Monitor backend running on port ${PORT}`));
