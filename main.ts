import { serve } from 'https://deno.land/std@0.167.0/http/server.ts';

// 1. 优先级：环境变量 > 硬编码 (
const userID = Deno.env.get('UUID') || '87e86aa6-6100-4761-bf4f-d19052e06f7b';
const validHost = Deno.env.get('DOMAIN') || 'yybin.deno.dev';

const handler = async (req: Request): Promise<Response> => {
  const host = req.headers.get('host') || '';
  const upgrade = req.headers.get('upgrade') || '';

  // 2. 
  if (host !== validHost) {
    return new Response('Not Found', { status: 404 }); // 404 比 403 更具有迷惑性
  }

  // 3.
  if (upgrade.toLowerCase() != 'websocket') {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head><title>404 Not Found</title></head>
        <body style="font-family:sans-serif;padding:50px;">
          <h1>404 Not Found</h1>
          <hr><p>nginx/1.21.6</p>
        </body>
      </html>`, {
      status: 404, // 模拟真实的找不到页面
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let remoteConnection: Deno.TcpConn;
  let address = '';
  let port = 0;

  socket.onopen = () => console.log('Conn established');
  
  socket.onmessage = async (e) => {
    try {
      if (!(e.data instanceof ArrayBuffer)) return;
      const vlessBuffer: ArrayBuffer = e.data;

      if (remoteConnection) {
        await remoteConnection.write(new Uint8Array(vlessBuffer));
      } else {
        if (vlessBuffer.byteLength < 24) return;
        
        const version = new Uint8Array(vlessBuffer.slice(0, 1));
        const v_uuid = Array.from(new Uint8Array(vlessBuffer.slice(1, 17)))
                        .map(b => b.toString(16).padStart(2, '0')).join('');
        const formatted_uuid = `${v_uuid.slice(0,8)}-${v_uuid.slice(8,12)}-${v_uuid.slice(12,16)}-${v_uuid.slice(16,20)}-${v_uuid.slice(20)}`;

        if (formatted_uuid !== userID) {
          socket.close();
          return;
        }

        const optLength = new Uint8Array(vlessBuffer.slice(17, 18))[0];
        const command = new Uint8Array(vlessBuffer.slice(18 + optLength, 18 + optLength + 1))[0];
        
        if (command !== 1) { 
          socket.close();
          return;
        }

        const portIndex = 18 + optLength + 1;
        port = new DataView(vlessBuffer.slice(portIndex, portIndex + 2)).getInt16(0);
        
        let addressIndex = portIndex + 2;
        const addressType = new Uint8Array(vlessBuffer.slice(addressIndex, addressIndex + 1))[0];
        let addressValue = '';
        let addressLength = 0;
        let addressValueIndex = addressIndex + 1;

        if (addressType === 1) { 
          addressLength = 4;
          addressValue = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join('.');
        } else if (addressType === 2) { 
          addressLength = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + 1))[0];
          addressValueIndex += 1;
          addressValue = new TextDecoder().decode(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
        }

        address = addressValue;
        
        // 4. 增加连接超时控制
        remoteConnection = await Deno.connect({ port: port, hostname: addressValue });

        const rawDataIndex = addressValueIndex + addressLength;
        const rawClientData = vlessBuffer.slice(rawDataIndex);
        if (rawClientData.byteLength > 0) {
          await remoteConnection.write(new Uint8Array(rawClientData));
        }

        const responseHeader = new Uint8Array([version[0], 0]);
        
        remoteConnection.readable.pipeTo(new WritableStream({
          start() {
            socket.send(new Blob([responseHeader]));
          },
          write(chunk) {
            socket.send(new Blob([chunk])); // 保持 Blob 封装
          }
        })).catch(() => {
          socket.close();
        });
      }
    } catch (error) {
      socket.close();
    }
  };

  socket.onclose = () => remoteConnection?.close();
  socket.onerror = () => remoteConnection?.close();

  return response;
};

serve(handler, { port: 8080 });