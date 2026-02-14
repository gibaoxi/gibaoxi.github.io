import { serve } from 'https://deno.land/std@0.167.0/http/server.ts';

// 这里的 UUID 必须和你 Deno 后台设置的一致
const userID = Deno.env.get('UUID') || '87e86aa6-6100-4761-bf4f-d19052e06f7b';

const handler = async (req: Request): Promise<Response> => {
  const host = req.headers.get('host') || '';
  const upgrade = req.headers.get('upgrade') || '';

  // 验证 SNI / Host
  // 请务必将下方引号内的内容修改为你真实的域名
  if (host !== 'yybin.deno.dev') {
    return new Response('Forbidden', { status: 403 });
  }

  // 模拟原版的 serveClient 逻辑，不再读取本地文件以免报错
  if (upgrade.toLowerCase() != 'websocket') {
    return new Response('<html><body><h1>Service Running</h1></body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let remoteConnection: Deno.TcpConn;
  let address = '';
  let port = 0;

  socket.onopen = () => console.log('socket opened');
  
  socket.onmessage = async (e) => {
    try {
      if (!(e.data instanceof ArrayBuffer)) return;
      const vlessBuffer: ArrayBuffer = e.data;

      if (remoteConnection) {
        // 已建立连接，直接转发数据
        await remoteConnection.write(new Uint8Array(vlessBuffer));
      } else {
        // 握手阶段：校验数据长度和 UUID
        if (vlessBuffer.byteLength < 24) return;
        
        const version = new Uint8Array(vlessBuffer.slice(0, 1));
        const v_uuid = Array.from(new Uint8Array(vlessBuffer.slice(1, 17)))
                        .map(b => b.toString(16).padStart(2, '0')).join('');
        const formatted_uuid = `${v_uuid.slice(0,8)}-${v_uuid.slice(8,12)}-${v_uuid.slice(12,16)}-${v_uuid.slice(16,20)}-${v_uuid.slice(20)}`;

        if (formatted_uuid !== userID) {
          console.log('invalid user');
          socket.close();
          return;
        }

        const optLength = new Uint8Array(vlessBuffer.slice(17, 18))[0];
        const command = new Uint8Array(vlessBuffer.slice(18 + optLength, 18 + optLength + 1))[0];
        
        if (command !== 1) { // 仅支持 TCP
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

        // 解析地址逻辑
        if (addressType === 1) { // IPv4
          addressLength = 4;
          addressValue = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join('.');
        } else if (addressType === 2) { // Domain
          addressLength = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + 1))[0];
          addressValueIndex += 1;
          addressValue = new TextDecoder().decode(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
        }

        address = addressValue;
        console.log(`[${address}:${port}] connecting`);
        
        remoteConnection = await Deno.connect({ port: port, hostname: addressValue });

        const rawDataIndex = addressValueIndex + addressLength;
        const rawClientData = vlessBuffer.slice(rawDataIndex);
        if (rawClientData.byteLength > 0) {
          await remoteConnection.write(new Uint8Array(rawClientData));
        }

        // 关键回传逻辑：使用 Blob 封装数据
        const responseHeader = new Uint8Array([version[0], 0]);
        
        remoteConnection.readable.pipeTo(new WritableStream({
          start() {
            socket.send(new Blob([responseHeader]));
          },
          write(chunk) {
            socket.send(new Blob([chunk])); // 原代码核心：使用 Blob 发送数据
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

// 适配 Deno Deploy 的监听方式
serve(handler, { port: 8080 });