import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const ID = (Deno.env.get("UUID") || "87e86aa6-6100-4761-bf4f-d19052e06f7b").toLowerCase();

const PG = `<!DOCTYPE html><html lang="en"><head><title>Application Server</title></head><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f9f9f9;"><div style="padding:20px;background:white;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);text-align:center;"><h1>App Running</h1><p>The service is operational.</p></div></body></html>`;

serve(async (req: Request) => {
  const up = req.headers.get("upgrade") || "";
  if (up.toLowerCase() !== "websocket") {
    return new Response(PG, { headers: { "content-type": "text/html; charset=utf-8" }, status: 200 });
  }

  const { socket: ws, response: res } = Deno.upgradeWebSocket(req);

  ws.onmessage = async (e) => {
    try {
        if (e.data instanceof ArrayBuffer) await process(ws, e.data);
    } catch (err) {
        ws.close();
    }
  };

  return res;
});

async function process(w: WebSocket, b: ArrayBuffer) {
    if (b.byteLength < 24) return;
    const v = new DataView(b);
    
    // 1. 获取版本号用于回传
    const ver = new Uint8Array(b.slice(0, 1));
    
    // 2. UUID 校验
    const u = new Uint8Array(b.slice(1, 17));
    const us = [...u].map(x => x.toString(16).padStart(2, '0')).join('');
    const fu = `${us.slice(0,4)}-${us.slice(4,6)}-${us.slice(6,8)}-${us.slice(8,10)}-${us.slice(10)}`;

    if (fu !== ID) {
        w.close();
        return;
    }

    let c = 17;
    const ol = v.getUint8(c);
    c += 1 + ol;
    c++; 
    const p = v.getUint16(c);
    c += 2;
    const at = v.getUint8(c);
    c++;

    let ad = "";
    if (at === 1) {
        ad = `${v.getUint8(c)}.${v.getUint8(c+1)}.${v.getUint8(c+2)}.${v.getUint8(c+3)}`;
        c += 4;
    } else if (at === 2) {
        const dl = v.getUint8(c);
        c++;
        ad = new TextDecoder().decode(b.slice(c, c + dl));
        c += dl;
    } else if (at === 3) {
        ad = Array.from(new Uint16Array(b.slice(c, c + 16))).map(i => i.toString(16)).join(':');
        c += 16;
    }

    try {
        const nc = await Deno.connect({ hostname: ad, port: p });
        // 3. 关键修复：使用原版要求的 Blob 格式发送响应头
        w.send(new Blob([new Uint8Array([ver[0], 0])]));
        pipe(w, nc, b.slice(c));
    } catch (e) {
        w.close();
    }
}

async function pipe(w: WebSocket, t: Deno.Conn, i: ArrayBuffer) {
    if (i.byteLength > 0) await t.write(new Uint8Array(i));

    const tr = async () => {
        const buf = new Uint8Array(4096);
        try {
            while (true) {
                const n = await t.read(buf);
                if (n === null) break;
                if (w.readyState === WebSocket.OPEN) {
                    // 4. 关键修复：所有传回客户端的数据都必须封装在 Blob 中
                    w.send(new Blob([buf.subarray(0, n)]));
                } else {
                    break;
                }
            }
        } catch (e) {} 
        finally {
            try { w.close(); } catch {}
            try { t.close(); } catch {}
        }
    };

    w.onmessage = async (e) => {
        try {
            if (e.data instanceof ArrayBuffer) await t.write(new Uint8Array(e.data));
        } catch (e) {
             try { t.close(); } catch {}
        }
    };
    
    w.onclose = () => t.close();
    tr();
}